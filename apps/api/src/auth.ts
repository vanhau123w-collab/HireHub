import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { SystemRole } from "@hirehub/shared";
export type AuthUser = {
  sub: string;
  role: SystemRole;
  companyId?: string;
  memberId?: string;
};
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}
export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: SystemRole[]) => SetMetadata("roles", roles);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private jwt: JwtService,
    @Inject(Reflector) private reflector: Reflector,
  ) {}
  canActivate(ctx: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>("public", [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    )
      return true;
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) throw new UnauthorizedException("Authentication required");
    try {
      req.user = this.jwt.verify(token, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          "dev-access-secret-change-me-32-characters",
      });
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<SystemRole[]>("roles", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !roles.includes(user.role))
      throw new ForbiddenException("Insufficient permission");
    return true;
  }
}
