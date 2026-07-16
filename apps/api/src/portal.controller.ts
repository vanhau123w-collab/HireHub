import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { AuthUser, Public, Roles } from "./auth";
import { PrismaService } from "./prisma.service";
import { QueueService } from "./queue.service";
import { StorageService } from "./storage.service";
@ApiTags("portals")
@Controller()
export class PortalController {
  constructor(
    private db: PrismaService,
    private queue: QueueService,
    private storage: StorageService,
  ) {}
  @Public() @Get("companies/:slug") async publicCompany(
    @Param("slug") slug: string,
  ) {
    const company = await this.db.company.findFirst({
      where: { OR: [{ slug }, { id: slug }], status: "VERIFIED" },
      include: {
        jobs: {
          where: { status: "PUBLISHED" },
          include: { skills: true },
          orderBy: { publishedAt: "desc" },
        },
        _count: { select: { jobs: true, members: true } },
      },
    });
    if (!company) throw new BadRequestException("Company is not available");
    return company;
  }
  @Get("users/me/export") async exportData(@Req() req: Request) {
    const id = (req.user as AuthUser).sub;
    return (this.db as any).user.findUniqueOrThrow({
      where: { id },
      include: {
        candidateProfile: true,
        candidateExperiences: true,
        candidateEducations: true,
        resumes: true,
        savedJobs: { include: { job: true } },
        applications: {
          include: {
            job: { include: { company: true } },
            history: true,
            interviews: true,
            offer: true,
          },
        },
        notifications: true,
        accounts: { select: { provider: true, providerAccountId: true } },
      },
    });
  }
  @Delete("users/me") async deleteAccount(@Req() req: Request) {
    const id = (req.user as AuthUser).sub;
    await this.db.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          email: `deleted-${id}@hirehub.invalid`,
          name: "Deleted user",
          passwordHash: null,
        },
      });
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: id,
          action: "ACCOUNT_DELETED",
          entityType: "User",
          entityId: id,
          metadata: { softDelete: true },
        },
      });
    });
    return { ok: true };
  }
  @Roles("CANDIDATE") @Get("candidate-profile") profile(@Req() req: Request) {
    return this.db.candidateProfile.findUnique({
      where: { userId: (req.user as AuthUser).sub },
    });
  }
  @Roles("CANDIDATE") @Patch("candidate-profile") profileUpdate(
    @Req() req: Request,
    @Body()
    body: {
      headline?: string;
      bio?: string;
      phone?: string;
      location?: string;
      yearsExperience?: number;
      skills?: string[];
      portfolioUrl?: string;
    },
  ) {
    return this.db.candidateProfile.upsert({
      where: { userId: (req.user as AuthUser).sub },
      create: { userId: (req.user as AuthUser).sub, skills: [], ...body },
      update: body,
    });
  }
  @Roles("CANDIDATE") @Get("candidate-experiences") experiences(
    @Req() req: Request,
  ) {
    return (this.db as any).candidateExperience.findMany({
      where: { userId: (req.user as AuthUser).sub },
      orderBy: { startsAt: "desc" },
    });
  }
  @Roles("CANDIDATE") @Post("candidate-experiences") createExperience(
    @Req() req: Request,
    @Body()
    body: {
      company: string;
      title: string;
      location?: string;
      startsAt: string;
      endsAt?: string;
      current?: boolean;
      description?: string;
    },
  ) {
    if (
      !body.company?.trim() ||
      !body.title?.trim() ||
      !body.startsAt ||
      (!body.current &&
        body.endsAt &&
        new Date(body.endsAt) < new Date(body.startsAt))
    )
      throw new BadRequestException("Experience values are invalid");
    return (this.db as any).candidateExperience.create({
      data: {
        userId: (req.user as AuthUser).sub,
        company: body.company.trim().slice(0, 120),
        title: body.title.trim().slice(0, 120),
        location: body.location?.trim().slice(0, 120),
        startsAt: new Date(body.startsAt),
        endsAt: body.current || !body.endsAt ? null : new Date(body.endsAt),
        current: Boolean(body.current),
        description: body.description?.trim().slice(0, 3000),
      },
    });
  }
  @Roles("CANDIDATE")
  @Delete("candidate-experiences/:id")
  async deleteExperience(@Req() req: Request, @Param("id") id: string) {
    await (this.db as any).candidateExperience.deleteMany({
      where: { id, userId: (req.user as AuthUser).sub },
    });
    return { ok: true };
  }
  @Roles("CANDIDATE") @Get("candidate-educations") educations(
    @Req() req: Request,
  ) {
    return (this.db as any).candidateEducation.findMany({
      where: { userId: (req.user as AuthUser).sub },
      orderBy: { startsAt: "desc" },
    });
  }
  @Roles("CANDIDATE") @Post("candidate-educations") createEducation(
    @Req() req: Request,
    @Body()
    body: {
      school: string;
      degree: string;
      field?: string;
      startsAt: string;
      endsAt?: string;
      description?: string;
    },
  ) {
    if (
      !body.school?.trim() ||
      !body.degree?.trim() ||
      !body.startsAt ||
      (body.endsAt && new Date(body.endsAt) < new Date(body.startsAt))
    )
      throw new BadRequestException("Education values are invalid");
    return (this.db as any).candidateEducation.create({
      data: {
        userId: (req.user as AuthUser).sub,
        school: body.school.trim().slice(0, 160),
        degree: body.degree.trim().slice(0, 120),
        field: body.field?.trim().slice(0, 120),
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        description: body.description?.trim().slice(0, 3000),
      },
    });
  }
  @Roles("CANDIDATE") @Delete("candidate-educations/:id") async deleteEducation(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    await (this.db as any).candidateEducation.deleteMany({
      where: { id, userId: (req.user as AuthUser).sub },
    });
    return { ok: true };
  }
  @Roles("CANDIDATE") @Get("resumes") resumes(@Req() req: Request) {
    return this.db.resume.findMany({
      where: { userId: (req.user as AuthUser).sub },
      orderBy: { createdAt: "desc" },
    });
  }
  @Roles("CANDIDATE") @Post("resumes/presign") async presign(
    @Req() req: Request,
    @Body() body: { name: string; mimeType: string; size: number },
  ) {
    if (
      body.mimeType !== "application/pdf" ||
      body.size <= 0 ||
      body.size > 5_000_000
    )
      throw new BadRequestException("Only PDF files up to 5MB are allowed");
    const objectKey = `resumes/${(req.user as AuthUser).sub}/${Date.now()}-${body.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    return {
      objectKey,
      uploadUrl: await this.storage.putUrl(objectKey, body.mimeType),
      method: "PUT",
      headers: { "Content-Type": body.mimeType },
    };
  }
  @Roles("CANDIDATE") @Post("resumes/complete") async complete(
    @Req() req: Request,
    @Body()
    body: { name: string; objectKey: string; mimeType: string; size: number },
  ) {
    const userId = (req.user as AuthUser).sub;
    if (
      !body.objectKey.startsWith(`resumes/${userId}/`) ||
      !(await this.storage.exists(body.objectKey))
    )
      throw new BadRequestException("Uploaded resume was not found");
    const resume = await this.db.resume.create({ data: { userId, ...body } });
    await this.queue.add(
      "resume",
      { resumeId: resume.id, objectKey: resume.objectKey },
      `resume-${resume.id}`,
    );
    return resume;
  }
  @Roles("CANDIDATE") @Get("resumes/:id/download") async resumeDownload(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const resume = await this.db.resume.findFirstOrThrow({
      where: { id, userId: (req.user as AuthUser).sub },
    });
    return { url: await this.storage.getUrl(resume.objectKey), expiresIn: 300 };
  }
  @Roles("CANDIDATE") @Post("saved-jobs/:jobId") async save(
    @Req() req: Request,
    @Param("jobId") jobId: string,
  ) {
    return this.db.savedJob.upsert({
      where: { userId_jobId: { userId: (req.user as AuthUser).sub, jobId } },
      create: { userId: (req.user as AuthUser).sub, jobId },
      update: {},
    });
  }
  @Roles("CANDIDATE") @Delete("saved-jobs/:jobId") async unsave(
    @Req() req: Request,
    @Param("jobId") jobId: string,
  ) {
    await this.db.savedJob.deleteMany({
      where: { userId: (req.user as AuthUser).sub, jobId },
    });
    return { ok: true };
  }
  @Roles("CANDIDATE") @Get("saved-jobs") saved(@Req() req: Request) {
    return this.db.savedJob.findMany({
      where: { userId: (req.user as AuthUser).sub },
      include: { job: { include: { company: true, skills: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("notifications") notifications(@Req() req: Request) {
    return this.db.notification.findMany({
      where: { userId: (req.user as AuthUser).sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
  @Patch("notifications/:id/read") async notificationRead(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const userId = (req.user as AuthUser).sub;
    await this.db.notification.findFirstOrThrow({ where: { id, userId } });
    return this.db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
  @Patch("notifications/read-all") async notificationReadAll(
    @Req() req: Request,
  ) {
    await this.db.notification.updateMany({
      where: { userId: (req.user as AuthUser).sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get("analytics") async analytics(
    @Req() req: Request,
  ) {
    const companyId = (req.user as AuthUser).companyId!;
    const [jobs, applications, interviews, hires] = await Promise.all([
      this.db.job.count({ where: { companyId, status: "PUBLISHED" } }),
      this.db.application.count({ where: { job: { companyId } } }),
      this.db.interview.count({
        where: {
          application: { job: { companyId } },
          startsAt: { gte: new Date() },
        },
      }),
      this.db.application.count({
        where: { job: { companyId }, stage: "HIRED" },
      }),
    ]);
    return {
      activeJobs: jobs,
      applications,
      upcomingInterviews: interviews,
      hires,
      conversion: applications ? Math.round((hires / applications) * 100) : 0,
    };
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get("members") members(
    @Req() req: Request,
  ) {
    return this.db.companyMember.findMany({
      where: { companyId: (req.user as AuthUser).companyId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });
  }
  @Roles("COMPANY_ADMIN") @Post("invitations") async invite(
    @Req() req: Request,
    @Body() body: { email: string; role: "RECRUITER" | "COMPANY_ADMIN" },
  ) {
    const companyId = (req.user as AuthUser).companyId!,
      token = randomBytes(32).toString("base64url");
    const invitation = await this.db.invitation.create({
      data: {
        companyId,
        email: body.email.toLowerCase(),
        role: body.role,
        tokenHash: await argon2.hash(token),
        expiresAt: new Date(Date.now() + 7 * 864e5),
      },
    });
    await this.queue.add(
      "email",
      {
        to: body.email,
        subject: "You are invited to HireHub",
        html: `<p>You have been invited to join a HireHub workspace.</p><p>Invitation code: ${token}</p>`,
      },
      `invite-${invitation.id}`,
    );
    return {
      id: invitation.id,
      expiresAt: invitation.expiresAt,
      ...(process.env.NODE_ENV === "production" ? {} : { token }),
    };
  }
  @Post("invitations/accept") async acceptInvite(
    @Req() req: Request,
    @Body() body: { token: string },
  ) {
    const user = req.user as AuthUser,
      candidates = await this.db.invitation.findMany({
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    const invitation = (
      await Promise.all(
        candidates.map(async (item: any) =>
          (await argon2.verify(item.tokenHash, body.token)) ? item : null,
        ),
      )
    ).find(Boolean);
    if (!invitation)
      throw new BadRequestException("Invitation is invalid or expired");
    await this.db.$transaction(async (tx: any) => {
      await tx.companyMember.upsert({
        where: {
          companyId_userId: {
            companyId: invitation.companyId,
            userId: user.sub,
          },
        },
        create: {
          companyId: invitation.companyId,
          userId: user.sub,
          role: invitation.role,
          permissions:
            invitation.role === "COMPANY_ADMIN"
              ? [
                  "JOB_MANAGE",
                  "CANDIDATE_VIEW",
                  "CANDIDATE_MANAGE",
                  "INTERVIEW_MANAGE",
                  "TEAM_MANAGE",
                  "BILLING_MANAGE",
                ]
              : [
                  "JOB_MANAGE",
                  "CANDIDATE_VIEW",
                  "CANDIDATE_MANAGE",
                  "INTERVIEW_MANAGE",
                ],
        },
        update: { role: invitation.role, status: "ACTIVE" },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    });
    return { ok: true };
  }
  @Roles("COMPANY_ADMIN") @Patch("members/:id") async updateMember(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: {
      role?: "RECRUITER" | "COMPANY_ADMIN";
      status?: "ACTIVE" | "DISABLED";
      permissions?: string[];
    },
  ) {
    const companyId = (req.user as AuthUser).companyId!;
    await this.db.companyMember.findFirstOrThrow({ where: { id, companyId } });
    return this.db.companyMember.update({
      where: { id },
      data: {
        role: body.role,
        status: body.status,
        permissions: body.permissions,
      },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN")
  @Get("company-settings")
  async getCompanySettings(@Req() req: Request) {
    return this.db.company.findUniqueOrThrow({
      where: { id: (req.user as AuthUser).companyId! },
      include: { subscription: true },
    });
  }
  @Roles("COMPANY_ADMIN") @Patch("company-settings") async companySettings(
    @Req() req: Request,
    @Body()
    body: {
      name?: string;
      description?: string;
      website?: string;
      logoKey?: string;
      settings?: Record<string, unknown>;
    },
  ) {
    return this.db.company.update({
      where: { id: (req.user as AuthUser).companyId! },
      data: {
        ...body,
        settings: body.settings
          ? JSON.parse(JSON.stringify(body.settings))
          : undefined,
      },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get("tags") tags(@Req() req: Request) {
    return this.db.tag.findMany({
      where: { companyId: (req.user as AuthUser).companyId },
      orderBy: { name: "asc" },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post("tags") tag(
    @Req() req: Request,
    @Body() body: { name: string; color?: string },
  ) {
    return this.db.tag.create({
      data: {
        companyId: (req.user as AuthUser).companyId!,
        name: body.name.trim().slice(0, 40),
        color: body.color || "violet",
      },
    });
  }
  @Roles("PLATFORM_ADMIN") @Get("admin/summary") async admin() {
    const [users, companies, jobs, applications, subscriptions, failedJobs] =
      await Promise.all([
        this.db.user.count(),
        this.db.company.count(),
        this.db.job.count({ where: { status: "PUBLISHED" } }),
        this.db.application.count(),
        this.db.subscription.count({
          where: { plan: "PRO", status: "ACTIVE" },
        }),
        this.queue.failedCount(),
      ]);
    return {
      users,
      companies,
      jobs,
      applications,
      proSubscriptions: subscriptions,
      failedJobs,
    };
  }
  @Roles("PLATFORM_ADMIN") @Get("admin/companies") companies() {
    return this.db.company.findMany({
      include: {
        _count: { select: { members: true, jobs: true } },
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  @Roles("PLATFORM_ADMIN") @Get("admin/users") users() {
    return this.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        suspendedAt: true,
        companyMemberships: {
          select: {
            company: { select: { id: true, name: true } },
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  @Roles("PLATFORM_ADMIN") @Patch("admin/users/:id/status") async userStatus(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { suspended: boolean },
  ) {
    if (id === (req.user as AuthUser).sub)
      throw new BadRequestException("Admin cannot suspend their own account");
    const user = await this.db.user.update({
      where: { id },
      data: { suspendedAt: body.suspended ? new Date() : null },
    });
    if (body.suspended)
      await this.db.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await this.db.auditLog.create({
      data: {
        actorId: (req.user as AuthUser).sub,
        action: body.suspended ? "USER_SUSPENDED" : "USER_RESTORED",
        entityType: "User",
        entityId: id,
        metadata: { email: user.email },
      },
    });
    return user;
  }
  @Roles("PLATFORM_ADMIN") @Get("admin/jobs") jobs() {
    return this.db.job.findMany({
      include: {
        company: { select: { id: true, name: true, status: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  @Roles("PLATFORM_ADMIN") @Patch("admin/jobs/:id/status") async moderateJob(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status: "PUBLISHED" | "PAUSED" | "CLOSED" },
  ) {
    const job = await this.db.job.update({
      where: { id },
      data: { status: body.status },
    });
    await this.db.auditLog.create({
      data: {
        companyId: job.companyId,
        actorId: (req.user as AuthUser).sub,
        action: "JOB_MODERATED",
        entityType: "Job",
        entityId: id,
        metadata: { status: body.status },
      },
    });
    return job;
  }
  @Roles("PLATFORM_ADMIN") @Get("admin/audit-logs") audit() {
    return this.db.auditLog.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  @Roles("PLATFORM_ADMIN")
  @Patch("admin/companies/:id/status")
  async companyStatus(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status: "PENDING" | "VERIFIED" | "SUSPENDED" },
  ) {
    const company = await this.db.company.update({
      where: { id },
      data: { status: body.status },
    });
    await this.db.auditLog.create({
      data: {
        actorId: (req.user as AuthUser).sub,
        action: "COMPANY_STATUS_CHANGED",
        entityType: "Company",
        entityId: id,
        metadata: { status: body.status },
      },
    });
    return company;
  }
}
