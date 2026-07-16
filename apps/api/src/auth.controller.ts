import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthUser, Public } from "./auth";
import { AuthService } from "./auth.service";
import { PrismaService } from "./prisma.service";
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private auth: AuthService,
    @Inject(PrismaService) private db: PrismaService,
  ) {}
  private cookie(res: Response, token: string) {
    res.cookie("hirehub_refresh", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: 7 * 864e5,
    });
  }
  @Public() @Post("login") async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body);
    this.cookie(res, result.refreshToken);
    const { refreshToken, ...safe } = result;
    return safe;
  }
  @Public() @Post("register") async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(body);
    this.cookie(res, result.refreshToken);
    const { refreshToken, ...safe } = result;
    return safe;
  }
  @Public() @Post("refresh") async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(req.cookies?.hirehub_refresh);
    this.cookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }
  @Public() @Post("verify-email/request") verifyRequest(
    @Body() body: { email: string },
  ) {
    return this.auth.issueToken(body.email, "VERIFY_EMAIL");
  }
  @Public() @Post("verify-email/confirm") verifyConfirm(
    @Body() body: { token: string },
  ) {
    return this.auth.consumeToken(body.token, "VERIFY_EMAIL");
  }
  @Public() @Post("password/forgot") forgot(@Body() body: { email: string }) {
    return this.auth.issueToken(body.email, "RESET_PASSWORD");
  }
  @Public() @Post("password/reset") reset(
    @Body() body: { token: string; password: string },
  ) {
    return this.auth.consumeToken(body.token, "RESET_PASSWORD", body.password);
  }
  @Public() @Get("google") async google(@Res() res: Response) {
    return res.redirect(await this.auth.googleUrl());
  }
  @Public() @Get("google/callback") async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const result = await this.auth.googleCallback(code, state);
    this.cookie(res, result.refreshToken);
    return res.redirect(
      `${process.env.WEB_ORIGIN || "http://localhost:5173"}/login?oauth=success`,
    );
  }
  @Post("logout-all") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutAll((req.user as AuthUser).sub);
    res.clearCookie("hirehub_refresh", { path: "/api/auth" });
    return { ok: true };
  }
  @Post("logout") async logoutCurrent(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(
      (req.user as AuthUser).sub,
      req.cookies?.hirehub_refresh,
    );
    res.clearCookie("hirehub_refresh", { path: "/api/auth" });
    return { ok: true };
  }
  @Get("me") async me(@Req() req: Request) {
    const user = req.user as AuthUser;
    return this.db.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        candidateProfile: true,
        companyMemberships: { include: { company: true } },
      },
    });
  }
}
