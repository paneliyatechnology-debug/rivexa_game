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

@Injectable()
export class TenantService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Audit helper ──────────────────────────────────────────────────────────
  private async audit(
    tenantId: string | null,
    memberId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValues: object | null,
    newValues: object | null,
    ip?: string,
    ua?: string,
  ) {
    try {
      await this.db.tenantAuditLog.create({
        data: {
          tenantId: tenantId ?? undefined,
          memberId: memberId ?? undefined,
          action,
          entityType,
          entityId: entityId ?? undefined,
          oldValues: oldValues ?? undefined,
          newValues: newValues ?? undefined,
          ipAddress: ip,
          userAgent: ua,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  // ─── Platform-owner: list all tenants ──────────────────────────────────────
  async listTenants() {
    const tenants = await this.db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true, players: true },
        },
      },
    });
    return tenants;
  }

  // ─── Platform-owner: get single tenant ─────────────────────────────────────
  async getTenant(tenantId: string) {
    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: { select: { members: true, players: true } },
        members: {
          where: { role: 'SUPER_ADMIN' },
          select: { id: true, name: true, email: true, status: true, createdAt: true },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  // ─── Platform-owner: create tenant ─────────────────────────────────────────
  async createTenant(dto: {
    slug: string;
    name: string;
    domain?: string;
    logoUrl?: string;
    primaryColor?: string;
    commissionRates?: object;
    maxAgentCount?: number;
    maxPlayerCount?: number;
    allowedGames?: string[];
    // Super admin seed
    superAdminName: string;
    superAdminEmail: string;
    superAdminPassword: string;
    superAdminPhone?: string;
    initialCredit?: number;
  }) {
    // Validate slug uniqueness
    const existing = await this.db.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Tenant slug "${dto.slug}" already exists`);

    if (dto.domain) {
      const existingDomain = await this.db.tenant.findUnique({ where: { domain: dto.domain } });
      if (existingDomain) throw new ConflictException(`Domain "${dto.domain}" is already in use`);
    }

    const passwordHash = await hashPassword(dto.superAdminPassword);
    const referralCode = `SA-${dto.slug.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const initialCredit = Number(dto.initialCredit ?? 0);

    const tenant = await this.db.$transaction(async (tx: any) => {
      const newTenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          domain: dto.domain,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor ?? '#6366f1',
          commissionRates: dto.commissionRates ?? { super_admin: 5, sub_admin: 3, super_agent: 2, agent: 1 },
          maxAgentCount: dto.maxAgentCount ?? 50,
          maxPlayerCount: dto.maxPlayerCount ?? 5000,
          allowedGames: dto.allowedGames ?? [],
        },
      });

      // Seed the tenant SUPER_ADMIN
      const superAdmin = await tx.tenantMember.create({
        data: {
          tenantId: newTenant.id,
          name: dto.superAdminName,
          email: dto.superAdminEmail.toLowerCase().trim(),
          phone: dto.superAdminPhone,
          passwordHash,
          role: 'SUPER_ADMIN',
          creditBalance: initialCredit,
          referralCode,
        },
      });

      if (initialCredit > 0) {
        await tx.tenantCreditLog.create({
          data: {
            tenantId: newTenant.id,
            giverId: null,
            receiverId: superAdmin.id,
            amount: initialCredit,
            type: 'CREDIT',
            description: 'Initial platform owner credit allocation on tenant creation',
            balanceBefore: 0,
            balanceAfter: initialCredit,
          },
        });
      }

      return newTenant;
    });

    await this.audit(tenant.id, null, 'CREATE_TENANT', 'TENANT', tenant.id, null, { name: tenant.name, slug: tenant.slug, initialCredit });
    return { message: 'Tenant created successfully', tenant };
  }

  // ─── Platform-owner: update tenant ─────────────────────────────────────────
  async updateTenant(tenantId: string, dto: Partial<{
    name: string;
    domain: string;
    logoUrl: string;
    primaryColor: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
    commissionRates: object;
    maxAgentCount: number;
    maxPlayerCount: number;
    allowedGames: string[];
  }>) {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updated = await this.db.tenant.update({
      where: { id: tenantId },
      data: dto as any,
    });

    await this.audit(tenantId, null, 'UPDATE_TENANT', 'TENANT', tenantId, tenant, dto);
    return { message: 'Tenant updated', tenant: updated };
  }

  // ─── Platform-owner: delete tenant ─────────────────────────────────────────
  async deleteTenant(tenantId: string) {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.db.tenant.delete({ where: { id: tenantId } });
    await this.audit(null, null, 'DELETE_TENANT', 'TENANT', tenantId, { name: tenant.name }, null);
    return { message: 'Tenant deleted' };
  }

  // ─── Tenant stats ──────────────────────────────────────────────────────────
  async getTenantStats(tenantId: string) {
    const [memberCount, playerCount, agentCount, subAdminCount] = await Promise.all([
      this.db.tenantMember.count({ where: { tenantId } }),
      this.db.tenantPlayer.count({ where: { tenantId } }),
      this.db.tenantMember.count({ where: { tenantId, role: 'AGENT' } }),
      this.db.tenantMember.count({ where: { tenantId, role: 'SUB_ADMIN' } }),
    ]);

    const totalCreditIssued = await this.db.tenantCreditLog.aggregate({
      where: { tenantId, type: 'CREDIT' },
      _sum: { amount: true },
    });

    return {
      memberCount,
      playerCount,
      agentCount,
      subAdminCount,
      superAgentCount: await this.db.tenantMember.count({ where: { tenantId, role: 'SUPER_AGENT' } }),
      totalCreditIssued: Number(totalCreditIssued._sum.amount ?? 0),
    };
  }

  // ─── Get audit logs for a tenant ───────────────────────────────────────────
  async getAuditLogs(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.db.tenantAuditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          member: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.db.tenantAuditLog.count({ where: { tenantId } }),
    ]);
    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Platform-owner: allocate credits to tenant SUPER_ADMIN ────────────────────────
  async allocateCredit(tenantId: string, amount: number, remarks?: string) {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const superAdmin = await this.db.tenantMember.findFirst({
      where: { tenantId, role: 'SUPER_ADMIN' },
    });
    if (!superAdmin) throw new NotFoundException('Tenant SUPER_ADMIN not found');

    const updated = await this.db.$transaction(async (tx: any) => {
      const balanceBefore = Number(superAdmin.creditBalance);
      const balanceAfter = balanceBefore + amount;

      const updatedMember = await tx.tenantMember.update({
        where: { id: superAdmin.id },
        data: { creditBalance: { increment: amount } },
      });

      await tx.tenantCreditLog.create({
        data: {
          tenantId,
          giverId: null,
          receiverId: superAdmin.id,
          amount,
          type: 'CREDIT',
          description: remarks ?? 'Platform owner credit allocation',
          balanceBefore,
          balanceAfter,
        },
      });

      return updatedMember;
    });

    await this.audit(tenantId, null, 'PLATFORM_CREDIT_ALLOCATION', 'MEMBER', superAdmin.id, { previousBalance: Number(superAdmin.creditBalance) }, { newBalance: Number(updated.creditBalance), amount });

    return {
      message: `Successfully allocated ${amount} credits to tenant SUPER_ADMIN`,
      newCreditBalance: Number(updated.creditBalance),
    };
  }
}
