import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword } from '@gaming-platform/auth';
import * as crypto from 'crypto';

/** Role hierarchy: index = seniority; higher index = lower rank */
const ROLE_ORDER = ['SUPER_ADMIN', 'SUPER_AGENT', 'SUB_ADMIN', 'AGENT', 'PLAYER'] as const;
type MemberRole = typeof ROLE_ORDER[number];

function canManage(actorRole: MemberRole, targetRole: MemberRole): boolean {
  return ROLE_ORDER.indexOf(actorRole) < ROLE_ORDER.indexOf(targetRole);
}

function allowedChildRoles(role: MemberRole): MemberRole[] {
  const idx = ROLE_ORDER.indexOf(role);
  return ROLE_ORDER.slice(idx + 1) as unknown as MemberRole[];
}

@Injectable()
export class TenantMemberService {
  constructor(private readonly db: DatabaseService) {}

  private async audit(
    tenantId: string,
    memberId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValues?: object | null,
    newValues?: object | null,
  ) {
    await this.db.tenantAuditLog.create({
      data: {
        tenantId,
        memberId: memberId ?? undefined,
        action,
        entityType,
        entityId: entityId ?? undefined,
        oldValues: oldValues ?? undefined,
        newValues: newValues ?? undefined,
      },
    }).catch(() => {});
  }

  // ─── List members visible to actor ─────────────────────────────────────────
  async listMembers(
    tenantId: string,
    actorId: string,
    actorRole: MemberRole,
    filters?: { role?: string; status?: string },
  ) {
    // SUPER_ADMIN sees everyone; others only see their subtree
    const where: any = { tenantId };
    if (actorRole !== 'SUPER_ADMIN') {
      // Get all descendant IDs under this actor
      const descendants = await this.getDescendantIds(actorId);
      where.id = { in: descendants };
    }
    if (filters?.role) where.role = filters.role;
    if (filters?.status) where.status = filters.status;

    const members = await this.db.tenantMember.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        creditBalance: true,
        commissionBalance: true,
        referralCode: true,
        parentId: true,
        createdAt: true,
        _count: { select: { children: true, players: true } },
      },
    });
    return members.map((m: any) => ({ ...m, creditBalance: Number(m.creditBalance), commissionBalance: Number(m.commissionBalance) }));
  }

  // ─── Create a member or player user account ──────────────────────────────
  async createMember(
    tenantId: string,
    actorId: string,
    actorRole: MemberRole,
    dto: {
      name: string;
      email: string;
      password: string;
      role: MemberRole;
      phone?: string;
    },
  ) {
    if (!canManage(actorRole, dto.role)) {
      throw new ForbiddenException(`A ${actorRole} cannot create a ${dto.role}`);
    }

    const allowed = allowedChildRoles(actorRole);
    if (!allowed.includes(dto.role)) {
      throw new BadRequestException(`${actorRole} can only create: ${allowed.join(', ')}`);
    }

    // ── Handle Real Player Account Creation under Master Agent ──
    if (dto.role === ('PLAYER' as any)) {
      const emailClean = dto.email.toLowerCase().trim();
      const passwordHash = await hashPassword(dto.password);

      let phoneToUse = dto.phone?.trim() || undefined;
      if (phoneToUse) {
        const phoneOwner = await this.db.user.findFirst({ where: { phone: phoneToUse } });
        if (phoneOwner) phoneToUse = undefined;
      }

      const existingUser = await this.db.user.findUnique({
        where: { email: emailClean },
      });

      let userId = existingUser?.id;

      if (existingUser) {
        // Update password on existing user to match the password entered by agent
        await this.db.user.update({
          where: { id: existingUser.id },
          data: { passwordHash, phone: phoneToUse || existingUser.phone },
        });

        const existingTP = await this.db.tenantPlayer.findUnique({
          where: { tenantId_userId: { tenantId, userId: existingUser.id } },
        });
        if (existingTP) {
          throw new ConflictException(`Player email ${dto.email} is already registered in this tenant.`);
        }
      } else {
        const referralCode = `PL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const newUser = await this.db.user.create({
          data: {
            name: dto.name,
            email: emailClean,
            phone: phoneToUse,
            passwordHash,
            referralCode,
            role: 'PLAYER',
            status: 'ACTIVE',
            wallet: {
              create: {
                mainBalance: 0.0,
                bonusBalance: 0.0,
              },
            },
          },
        });
        userId = newUser.id;
      }

      const tp = await this.db.tenantPlayer.create({
        data: { tenantId, userId: userId!, agentId: actorId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              wallet: { select: { mainBalance: true } },
            },
          },
        },
      });

      await this.audit(tenantId, actorId, 'CREATE_PLAYER', 'PLAYER', tp.id, null, { name: dto.name, role: 'PLAYER' });
      return { message: 'Player account created successfully under your Master ID!', member: tp };
    }

    // ── Handle Staff Hierarchy Member Creation ──
    const existing = await this.db.tenantMember.findFirst({
      where: { tenantId, email: dto.email.toLowerCase().trim() },
    });
    if (existing) throw new ConflictException(`Email ${dto.email} is already in use in this tenant`);

    const passwordHash = await hashPassword(dto.password);
    const referralCode = `${dto.role.substring(0, 2)}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

    let phoneToUse = dto.phone?.trim() || undefined;

    const member = await this.db.tenantMember.create({
      data: {
        tenantId,
        parentId: actorId,
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        phone: phoneToUse,
        passwordHash,
        role: dto.role as any,
        referralCode,
      },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        creditBalance: true, commissionBalance: true, referralCode: true, createdAt: true,
      },
    });

    // Also auto-provision platform User account so tenant staff (Master Agent, Sub Master, Super Master) can log in on main site to play games
    const existingPlatformUser = await this.db.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!existingPlatformUser) {
      if (phoneToUse) {
        const phoneOwner = await this.db.user.findFirst({ where: { phone: phoneToUse } });
        if (phoneOwner) phoneToUse = undefined;
      }
      const userRef = `TM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await this.db.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase().trim(),
          phone: phoneToUse,
          passwordHash,
          referralCode: userRef,
          role: 'PLAYER',
          status: 'ACTIVE',
          wallet: {
            create: {
              mainBalance: 1000.0,
              bonusBalance: 50.0,
            },
          },
        },
      }).catch(() => {});
    } else {
      // Sync password hash if user exists
      await this.db.user.update({
        where: { id: existingPlatformUser.id },
        data: { passwordHash },
      }).catch(() => {});
    }

    await this.audit(tenantId, actorId, 'CREATE_MEMBER', 'MEMBER', member.id, null, { name: dto.name, role: dto.role });
    return { message: `${dto.role} created successfully`, member };
  }

  // ─── Update a member ───────────────────────────────────────────────────────
  async updateMember(
    tenantId: string,
    actorId: string,
    actorRole: MemberRole,
    targetId: string,
    dto: Partial<{ name: string; phone: string; status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' }>,
  ) {
    const target = await this.db.tenantMember.findFirst({ where: { id: targetId, tenantId } });
    if (!target) throw new NotFoundException('Member not found');
    if (!canManage(actorRole, target.role as MemberRole)) {
      throw new ForbiddenException('You cannot manage this member');
    }

    const updated = await this.db.tenantMember.update({
      where: { id: targetId },
      data: dto as any,
      select: { id: true, name: true, email: true, role: true, status: true, updatedAt: true },
    });

    await this.audit(tenantId, actorId, 'UPDATE_MEMBER', 'MEMBER', targetId, target, dto);
    return { message: 'Member updated', member: updated };
  }

  // ─── Reset / Update password for member or player ─────────────────────────
  async resetPassword(
    tenantId: string,
    actorId: string,
    actorRole: MemberRole,
    targetId: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters');
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Check if target is a TenantMember
    const member = await this.db.tenantMember.findFirst({ where: { id: targetId, tenantId } });
    if (member) {
      if (!canManage(actorRole, member.role as MemberRole)) {
        throw new ForbiddenException('You cannot manage this member');
      }
      await this.db.tenantMember.update({
        where: { id: targetId },
        data: { passwordHash: newPasswordHash },
      });
      const user = await this.db.user.findUnique({ where: { email: member.email } });
      if (user) {
        await this.db.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });
      }
      await this.audit(tenantId, actorId, 'RESET_PASSWORD', 'MEMBER', targetId);
      return { message: 'Password updated successfully for member!' };
    }

    // Check if target is a TenantPlayer
    const tp = await this.db.tenantPlayer.findFirst({ where: { id: targetId, tenantId } });
    if (tp) {
      await this.db.user.update({
        where: { id: tp.userId },
        data: { passwordHash: newPasswordHash },
      });
      await this.audit(tenantId, actorId, 'RESET_PASSWORD', 'PLAYER', targetId);
      return { message: 'Password updated successfully for player!' };
    }

    throw new NotFoundException('Member or Player account not found');
  }
  async toggleStatus(tenantId: string, actorId: string, actorRole: MemberRole, targetId: string) {
    const target = await this.db.tenantMember.findFirst({ where: { id: targetId, tenantId } });
    if (!target) throw new NotFoundException('Member not found');
    if (!canManage(actorRole, target.role as MemberRole)) {
      throw new ForbiddenException('You cannot manage this member');
    }

    const newStatus = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await this.db.tenantMember.update({ where: { id: targetId }, data: { status: newStatus } });
    await this.audit(tenantId, actorId, 'TOGGLE_STATUS', 'MEMBER', targetId, { status: target.status }, { status: newStatus });
    return { message: `Member ${newStatus.toLowerCase()}`, status: newStatus };
  }

  // ─── Delete a member ───────────────────────────────────────────────────────
  async deleteMember(tenantId: string, actorId: string, actorRole: MemberRole, targetId: string) {
    const target = await this.db.tenantMember.findFirst({ where: { id: targetId, tenantId } });
    if (!target) throw new NotFoundException('Member not found');
    if (!canManage(actorRole, target.role as MemberRole)) {
      throw new ForbiddenException('You cannot delete this member');
    }

    await this.db.tenantMember.delete({ where: { id: targetId } });
    await this.audit(tenantId, actorId, 'DELETE_MEMBER', 'MEMBER', targetId, { name: target.name, role: target.role }, null);
    return { message: 'Member deleted' };
  }

  // ─── Transfer or Deduct credits/balance for member or player ─────────────
  async transferCredit(
    tenantId: string,
    giverId: string,
    giverRole: MemberRole,
    receiverId: string,
    amount: number,
    description?: string,
    action: 'ADD' | 'DEDUCT' = 'ADD',
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const giver = await this.db.tenantMember.findFirst({ where: { id: giverId, tenantId } });
    if (!giver) throw new NotFoundException('Giver not found');

    // Check if receiver is a TenantMember (Staff member)
    const receiverMember = await this.db.tenantMember.findFirst({ where: { id: receiverId, tenantId } });

    if (receiverMember) {
      if (!canManage(giverRole, receiverMember.role as MemberRole)) {
        throw new ForbiddenException('You can only manage members below you in hierarchy');
      }

      const giverBal = Number(giver.creditBalance);
      const receiverBal = Number(receiverMember.creditBalance);

      if (action === 'ADD') {
        if (giverBal < amount) {
          throw new BadRequestException(`Insufficient credit balance. Available: ${giverBal}`);
        }

        await this.db.$transaction([
          this.db.tenantMember.update({
            where: { id: giverId },
            data: { creditBalance: { decrement: amount } },
          }),
          this.db.tenantMember.update({
            where: { id: receiverId },
            data: { creditBalance: { increment: amount } },
          }),
          this.db.tenantCreditLog.create({
            data: {
              tenantId,
              giverId,
              receiverId,
              amount,
              type: 'CREDIT',
              description: description || 'Credit Allocation',
              balanceBefore: receiverBal,
              balanceAfter: receiverBal + amount,
            },
          }),
        ]);

        await this.audit(tenantId, giverId, 'TRANSFER_CREDIT_ADD', 'CREDIT', receiverId, { amount: giverBal }, { amount: giverBal - amount });
        return {
          message: `Successfully transferred ${amount} credits to ${receiverMember.name}`,
          transferred: amount,
          action: 'ADD',
          giverNewBalance: giverBal - amount,
          receiverNewBalance: receiverBal + amount,
        };
      } else {
        // DEDUCT from staff member
        if (receiverBal < amount) {
          throw new BadRequestException(`Member has insufficient credit balance to deduct. Available: ${receiverBal}`);
        }

        await this.db.$transaction([
          this.db.tenantMember.update({
            where: { id: receiverId },
            data: { creditBalance: { decrement: amount } },
          }),
          this.db.tenantMember.update({
            where: { id: giverId },
            data: { creditBalance: { increment: amount } },
          }),
          this.db.tenantCreditLog.create({
            data: {
              tenantId,
              giverId,
              receiverId,
              amount,
              type: 'DEBIT',
              description: description || 'Credit Deduction',
              balanceBefore: receiverBal,
              balanceAfter: receiverBal - amount,
            },
          }),
        ]);

        await this.audit(tenantId, giverId, 'TRANSFER_CREDIT_DEDUCT', 'CREDIT', receiverId, { amount: giverBal }, { amount: giverBal + amount });
        return {
          message: `Successfully deducted ${amount} credits from ${receiverMember.name}`,
          transferred: amount,
          action: 'DEDUCT',
          giverNewBalance: giverBal + amount,
          receiverNewBalance: receiverBal - amount,
        };
      }
    }

    // Check if receiver is a TenantPlayer (End User)
    const tenantPlayer =
      (await this.db.tenantPlayer.findFirst({
        where: { id: receiverId, tenantId },
        include: { user: { include: { wallet: true } } },
      })) ||
      (await this.db.tenantPlayer.findFirst({
        where: { userId: receiverId, tenantId },
        include: { user: { include: { wallet: true } } },
      }));

    if (tenantPlayer && tenantPlayer.user) {
      const user = tenantPlayer.user;
      let wallet = user.wallet;

      if (!wallet) {
        wallet = await this.db.wallet.create({
          data: { userId: user.id, mainBalance: 0.0, bonusBalance: 0.0 },
        });
      }

      const giverBal = Number(giver.creditBalance);
      const playerBal = Number(wallet.mainBalance);

      if (action === 'ADD') {
        if (giverBal < amount) {
          throw new BadRequestException(`Insufficient credit balance to transfer to player. Available: ₹${giverBal}`);
        }

        await this.db.$transaction([
          this.db.tenantMember.update({
            where: { id: giverId },
            data: { creditBalance: { decrement: amount } },
          }),
          this.db.wallet.update({
            where: { id: wallet.id },
            data: { mainBalance: { increment: amount } },
          }),
          this.db.tenantCreditLog.create({
            data: {
              tenantId,
              giverId,
              receiverId: giverId,
              amount,
              type: 'CREDIT',
              description: description || `Player Wallet Topup (${user.name})`,
              balanceBefore: playerBal,
              balanceAfter: playerBal + amount,
            },
          }),
        ]);

        await this.audit(tenantId, giverId, 'PLAYER_BALANCE_ADD', 'PLAYER', tenantPlayer.id, { playerBal }, { playerBal: playerBal + amount });
        return {
          message: `Successfully added ₹${amount} to player ${user.name}'s wallet!`,
          transferred: amount,
          action: 'ADD',
          giverNewBalance: giverBal - amount,
          playerNewBalance: playerBal + amount,
        };
      } else {
        // DEDUCT from end user player wallet
        if (playerBal < amount) {
          throw new BadRequestException(`Player has insufficient wallet balance to deduct. Available: ₹${playerBal}`);
        }

        await this.db.$transaction([
          this.db.wallet.update({
            where: { id: wallet.id },
            data: { mainBalance: { decrement: amount } },
          }),
          this.db.tenantMember.update({
            where: { id: giverId },
            data: { creditBalance: { increment: amount } },
          }),
          this.db.tenantCreditLog.create({
            data: {
              tenantId,
              giverId,
              receiverId: giverId,
              amount,
              type: 'DEBIT',
              description: description || `Player Wallet Deduction (${user.name})`,
              balanceBefore: playerBal,
              balanceAfter: playerBal - amount,
            },
          }),
        ]);

        await this.audit(tenantId, giverId, 'PLAYER_BALANCE_DEDUCT', 'PLAYER', tenantPlayer.id, { playerBal }, { playerBal: playerBal - amount });
        return {
          message: `Successfully deducted ₹${amount} from player ${user.name}'s wallet!`,
          transferred: amount,
          action: 'DEDUCT',
          giverNewBalance: giverBal + amount,
          playerNewBalance: playerBal - amount,
        };
      }
    }

    throw new NotFoundException('Recipient member or player not found');
  }

  // ─── List players managed by this member / their subtree ───────────────────
  async listPlayers(tenantId: string, actorId: string, actorRole: MemberRole, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'SUB_ADMIN') {
      // Agents see only their direct players; super agents see all their agents' players
      const agentIds = actorRole === 'SUPER_AGENT'
        ? [actorId, ...(await this.getDescendantIds(actorId))]
        : [actorId];
      where.agentId = { in: agentIds };
    }

    const [players, total] = await Promise.all([
      this.db.tenantPlayer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, status: true, wallet: { select: { mainBalance: true } } } },
          agent: { select: { id: true, name: true, role: true } },
        },
      }),
      this.db.tenantPlayer.count({ where }),
    ]);

    return { players, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Assign a player to this tenant ────────────────────────────────────────
  async addPlayer(tenantId: string, actorId: string, userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.db.tenantPlayer.findUnique({ where: { tenantId_userId: { tenantId, userId } } });
    if (existing) throw new ConflictException('Player already assigned to this tenant');

    const tp = await this.db.tenantPlayer.create({
      data: { tenantId, userId, agentId: actorId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await this.audit(tenantId, actorId, 'ADD_PLAYER', 'PLAYER', tp.id, null, { userId, agentId: actorId });
    return { message: 'Player added to tenant', tenantPlayer: tp };
  }

  // ─── Credit log for a member ───────────────────────────────────────────────
  async getMemberCreditLogs(tenantId: string, memberId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const whereClause = { tenantId, OR: [{ receiverId: memberId }, { giverId: memberId }] };
    const [logs, total] = await Promise.all([
      this.db.tenantCreditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { giver: { select: { id: true, name: true, role: true } } },
      }),
      this.db.tenantCreditLog.count({ where: whereClause }),
    ]);
    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Internal: get all descendant member IDs ────────────────────────────────
  private async getDescendantIds(memberId: string): Promise<string[]> {
    const all: string[] = [];
    const queue = [memberId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.db.tenantMember.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });
      for (const child of children) {
        all.push(child.id);
        queue.push(child.id);
      }
    }
    return all;
  }
}
