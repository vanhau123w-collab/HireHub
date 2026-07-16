import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { loginSchema, registerSchema } from "@hirehub/shared";
import { PrismaService } from "./prisma.service";
@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private db: PrismaService,
    @Inject(JwtService) private jwt: JwtService,
  ) {}
  private async tokens(
    user: { id: string; role: any },
    companyId?: string,
    memberId?: string,
  ) {
    const payload = { sub: user.id, role: user.role, companyId, memberId };
    const accessToken = await this.jwt.signAsync(payload, {
      secret:
        process.env.JWT_ACCESS_SECRET ||
        "dev-access-secret-change-me-32-characters",
      expiresIn: "15m",
    });
    // A unique JWT ID is required for refresh-token rotation. Without it,
    // two tokens issued for the same user within one second can be identical,
    // allowing an already-consumed token to match the newly-created session.
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomBytes(16).toString("hex") },
      {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          "dev-refresh-secret-change-me-32-chars",
        expiresIn: "7d",
      },
    );
    await this.db.session.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 864e5),
      },
    });
    return { accessToken, refreshToken };
  }
  async login(input: unknown) {
    const data = loginSchema.parse(input);
    const user = await this.db.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { companyMemberships: true },
    });
    if (
      !user?.passwordHash ||
      user.deletedAt ||
      user.suspendedAt ||
      !(await argon2.verify(user.passwordHash, data.password))
    )
      throw new UnauthorizedException("Email or password is incorrect");
    const member = user.companyMemberships[0];
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: member?.companyId,
      },
      ...(await this.tokens(user, member?.companyId, member?.id)),
    };
  }
  async register(input: unknown) {
    const data = registerSchema.parse(input);
    if (
      await this.db.user.findUnique({
        where: { email: data.email.toLowerCase() },
      })
    )
      throw new BadRequestException("Email already exists");
    const user = await this.db.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        passwordHash: await argon2.hash(data.password),
        candidateProfile:
          data.role === "CANDIDATE" ? { create: { skills: [] } } : undefined,
      },
    });
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...(await this.tokens(user)),
    };
  }
  async refresh(token: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          "dev-refresh-secret-change-me-32-chars",
      });
    } catch {
      throw new UnauthorizedException();
    }
    const sessions = await this.db.session.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const session = (
      await Promise.all(
        sessions.map(async (s: any) =>
          (await argon2.verify(s.tokenHash, token)) ? s : null,
        ),
      )
    ).find(Boolean);
    if (!session) throw new UnauthorizedException();
    await this.db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });
    return this.tokens(user, payload.companyId, payload.memberId);
  }
  async logoutAll(userId: string) {
    await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  async logout(userId: string, token?: string) {
    if (!token) return;
    if (!userId) return;
    const sessions = await this.db.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const session = (
      await Promise.all(
        sessions.map(async (item: any) =>
          (await argon2.verify(item.tokenHash, token)) ? item : null,
        ),
      )
    ).find(Boolean);
    if (session)
      await this.db.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
  }
  async issueToken(email: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
    const user = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return { ok: true };
    const token = randomBytes(32).toString("base64url");
    await this.db.authToken.create({
      data: {
        userId: user.id,
        purpose,
        tokenHash: await argon2.hash(token),
        expiresAt: new Date(
          Date.now() + (purpose === "RESET_PASSWORD" ? 3600e3 : 86400e3),
        ),
      },
    });
    return {
      ok: true,
      ...(process.env.NODE_ENV === "production" ? {} : { token }),
    };
  }
  async consumeToken(
    token: string,
    purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
    password?: string,
  ) {
    const candidates = await this.db.authToken.findMany({
      where: { purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const record = (
      await Promise.all(
        candidates.map(async (record: any) =>
          (await argon2.verify(record.tokenHash, token)) ? record : null,
        ),
      )
    ).find(Boolean);
    if (!record) throw new BadRequestException("Token is invalid or expired");
    await this.db.$transaction(async (tx: any) => {
      await tx.authToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      if (purpose === "VERIFY_EMAIL")
        await tx.user.update({
          where: { id: record.userId },
          data: { emailVerifiedAt: new Date() },
        });
      else {
        if (!password || password.length < 8)
          throw new BadRequestException(
            "Password must contain at least 8 characters",
          );
        await tx.user.update({
          where: { id: record.userId },
          data: { passwordHash: await argon2.hash(password) },
        });
        await tx.session.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });
    return { ok: true };
  }
  async googleUrl() {
    if (!process.env.GOOGLE_CLIENT_ID)
      throw new BadRequestException("Google OAuth is not configured");
    const state = await this.jwt.signAsync(
      { nonce: randomBytes(16).toString("hex") },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          "dev-access-secret-change-me-32-characters",
        expiresIn: "10m",
      },
    );
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${process.env.API_ORIGIN || "http://localhost:4000"}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  async googleCallback(code: string, state: string) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      throw new BadRequestException("Google OAuth is not configured");
    try {
      await this.jwt.verifyAsync(state, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          "dev-access-secret-change-me-32-characters",
      });
    } catch {
      throw new BadRequestException("OAuth state is invalid or expired");
    }
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.API_ORIGIN || "http://localhost:4000"}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok)
      throw new BadRequestException("Google authorization failed");
    const googleToken = (await tokenResponse.json()) as {
      access_token: string;
    };
    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${googleToken.access_token}` } },
    );
    if (!profileResponse.ok)
      throw new BadRequestException("Google profile could not be loaded");
    const profile = (await profileResponse.json()) as {
      sub: string;
      email: string;
      name: string;
      email_verified: boolean;
    };
    let account = await this.db.authAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "GOOGLE",
          providerAccountId: profile.sub,
        },
      },
      include: { user: { include: { companyMemberships: true } } },
    });
    if (!account) {
      let user = await this.db.user.findUnique({
        where: { email: profile.email.toLowerCase() },
        include: { companyMemberships: true },
      });
      if (!user)
        user = await this.db.user.create({
          data: {
            email: profile.email.toLowerCase(),
            name: profile.name,
            role: "CANDIDATE",
            emailVerifiedAt: profile.email_verified ? new Date() : null,
            candidateProfile: { create: { skills: [] } },
          },
          include: { companyMemberships: true },
        });
      account = await this.db.authAccount.create({
        data: {
          userId: user.id,
          provider: "GOOGLE",
          providerAccountId: profile.sub,
        },
        include: { user: { include: { companyMemberships: true } } },
      });
    }
    const member = account.user.companyMemberships[0];
    return this.tokens(account.user, member?.companyId, member?.id);
  }
}
