import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { jobSchema } from "@hirehub/shared";
import type { Request } from "express";
import { AuthUser, Public, Roles } from "./auth";
import { PrismaService } from "./prisma.service";
@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(@Inject(PrismaService) private db: PrismaService) {}
  @Public() @Get() async list(
    @Query("q") q?: string,
    @Query("cursor") cursor?: string,
    @Query("location") location?: string,
    @Query("workplace") workplace?: "ONSITE" | "HYBRID" | "REMOTE",
    @Query("employmentType")
    employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP",
    @Query("sort") sort: "newest" | "title" | "salary" = "newest",
  ) {
    const jobs = await this.db.job.findMany({
      where: {
        status: "PUBLISHED",
        ...(location
          ? { location: { contains: location, mode: "insensitive" as const } }
          : {}),
        ...(workplace ? { workplace } : {}),
        ...(employmentType ? { employmentType } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { department: { contains: q, mode: "insensitive" } },
                {
                  skills: {
                    some: { name: { contains: q, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        company: { select: { name: true, slug: true, logoKey: true } },
        skills: true,
        _count: { select: { applications: true } },
      },
      orderBy:
        sort === "title"
          ? { title: "asc" }
          : sort === "salary"
            ? { salaryMax: { sort: "desc", nulls: "last" } }
            : { publishedAt: "desc" },
      take: 13,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNextPage = jobs.length > 12;
    const data = jobs.slice(0, 12);
    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? data.at(-1)?.id : null,
      },
    };
  }
  @Public() @Get(":id") async detail(@Param("id") id: string) {
    const job = await this.db.job.findFirst({
      where: { OR: [{ id }, { slug: id }], status: "PUBLISHED" },
      include: { company: true, skills: true, questions: true },
    });
    if (!job) throw new NotFoundException();
    return job;
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post() async create(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = req.user as AuthUser;
    const data = jobSchema.parse(body);
    const subscription = await this.db.subscription.findUnique({
      where: { companyId: user.companyId! },
    });
    if (
      subscription?.plan !== "PRO" &&
      (await this.db.job.count({
        where: {
          companyId: user.companyId,
          status: { in: ["DRAFT", "PUBLISHED", "PAUSED"] },
        },
      })) >= 2
    )
      throw new ConflictException("Free plan supports up to 2 active jobs");
    const slug = `${data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    return this.db.job.create({
      data: {
        companyId: user.companyId!,
        title: data.title,
        slug,
        department: data.department,
        location: data.location,
        workplace: data.workplace,
        employmentType: data.employmentType,
        description: data.description,
        requirements: data.requirements,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        currency: data.currency,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        skills: { create: data.skills.map((name) => ({ name })) },
      },
      include: { skills: true },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get("manage/all") async manage(
    @Req() req: Request,
  ) {
    return this.db.job.findMany({
      where: { companyId: (req.user as AuthUser).companyId },
      include: { skills: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Patch(":id/status") async status(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" },
  ) {
    const companyId = (req.user as AuthUser).companyId;
    if (
      !(await this.db.job.findFirst({
        where: { id, companyId },
        select: { id: true },
      }))
    )
      throw new NotFoundException();
    return this.db.job.update({
      where: { id },
      data: {
        status: body.status,
        publishedAt: body.status === "PUBLISHED" ? new Date() : undefined,
      },
    });
  }
}
