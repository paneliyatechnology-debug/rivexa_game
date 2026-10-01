import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { comparePassword } from '@gaming-platform/auth';

export interface TenantMemberPayload {
  id: string;
  tenantId: string;
  role: string;
  name: string;
  email: string;
}

/**
 * Parses a tenant member JWT token (format: tenant_jwt_<memberId>_<tenantId>_<timestamp>)
 * and resolves the TenantMember from the database.
 */
@Injectable()
export class TenantAuthService {
  constructor(private readonly db: DatabaseService) {}

  async login(dto: { tenantSlug: string; email: string; password: string }) {
    if (!dto.tenantSlug || !dto.email || !dto.password) {
      throw new BadRequestException('tenantSlug, email and password are required');
    }

    const tenant = await this.db.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (!tenant) throw new UnauthorizedException('Tenant not found');
    if (tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is suspended or inactive');

    let member = await this.db.tenantMember.findFirst({
      where: { tenantId: tenant.id, email: dto.email.toLowerCase().trim() },
    });

    if (!member) {
      const user = await this.db.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
      if (user) {
        const tp = await this.db.tenantPlayer.findUnique({
          where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        });
        if (tp) {
          const validUserPass = await comparePassword(dto.password, user.passwordHash);
          if (validUserPass) {
            throw new BadRequestException(
              `This is an End Player account. Please log in on the main site (/login) to play games!`,
            );
          }
        }
      }
      throw new UnauthorizedException('Invalid email or password for this tenant');
    }

    if (member.status !== 'ACTIVE') throw new ForbiddenException('Account is suspended or inactive');

    let valid = await comparePassword(dto.password, member.passwordHash);
    if (!valid) {
      const user = await this.db.user.findUnique({ where: { email: member.email } });
      if (user) {
        const validUserPass = await comparePassword(dto.password, user.passwordHash);
        if (validUserPass) {
          valid = true;
          await this.db.tenantMember.update({
            where: { id: member.id },
            data: { passwordHash: user.passwordHash },
          }).catch(() => {});
        }
      }
    }

    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const token = `tenant_jwt_${member.id}_${tenant.id}_${Date.now()}`;

    return {
      accessToken: token,
      member: {
        id: member.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        tenantLogo: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: member.status,
        creditBalance: Number(member.creditBalance),
        commissionBalance: Number(member.commissionBalance),
        referralCode: member.referralCode,
      },
    };
  }

  /**
   * Validate a tenant JWT token and return the member payload.
   * Token format: tenant_jwt_<memberId>_<tenantId>_<timestamp>
   */
  async validateToken(token: string): Promise<TenantMemberPayload> {
    if (!token || !token.startsWith('tenant_jwt_')) {
      throw new UnauthorizedException('Invalid tenant token');
    }

    const withoutPrefix = token.replace('tenant_jwt_', '');
    // UUID is 36 chars, so: <36-char-memberId>_<36-char-tenantId>_<timestamp>
    const memberIdMatch = withoutPrefix.match(
      /^([0-9a-f-]{36})_([0-9a-f-]{36})_(\d+)$/,
    );
    if (!memberIdMatch) throw new UnauthorizedException('Malformed tenant token');

    const [, memberId, tenantId] = memberIdMatch;

    const member = await this.db.tenantMember.findFirst({
      where: { id: memberId, tenantId },
      include: { tenant: { select: { status: true } } },
    });
    if (!member) throw new UnauthorizedException('Token refers to unknown member');
    if (member.status !== 'ACTIVE') throw new ForbiddenException('Member account is suspended');
    if (member.tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is inactive');

    return {
      id: member.id,
      tenantId: member.tenantId,
      role: member.role,
      name: member.name,
      email: member.email,
    };
  }

  async getMe(memberId: string, tenantId: string) {
    const member = await this.db.tenantMember.findFirst({
      where: { id: memberId, tenantId },
      include: { tenant: { select: { id: true, slug: true, name: true, logoUrl: true, primaryColor: true, commissionRates: true, allowedGames: true } } },
    });
    if (!member) throw new UnauthorizedException('Member not found');
    return {
      id: member.id,
      tenantId: member.tenantId,
      tenant: member.tenant,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: member.status,
      creditBalance: Number(member.creditBalance),
      commissionBalance: Number(member.commissionBalance),
      referralCode: member.referralCode,
      parentId: member.parentId,
    };
  }
}
