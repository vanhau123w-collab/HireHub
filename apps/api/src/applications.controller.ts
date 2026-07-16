import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { applicationSchema, moveApplicationSchema } from "@hirehub/shared";
import type { Request } from "express";
import { AuthUser, Roles } from "./auth";
import { PrismaService } from "./prisma.service";
import { QueueService } from "./queue.service";
import { StorageService } from "./storage.service";
@ApiTags("applications")
@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(PrismaService) private db: PrismaService,
    @Inject(QueueService) private queue: QueueService,
    @Inject(StorageService) private storage: StorageService,
  ) {}
  @Roles("CANDIDATE") @Post() async apply(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = req.user as AuthUser;
    const data = applicationSchema.parse(body);
    const job = await this.db.job.findUnique({
      where: { id: data.jobId },
      include: {
        company: {
          include: {
            pipelineStages: { orderBy: { position: "asc" }, take: 1 },
          },
        },
      },
    });
    if (!job || job.status !== "PUBLISHED")
      throw new NotFoundException("Job not available");
    if (
      await this.db.application.findUnique({
        where: {
          jobId_candidateId: { jobId: data.jobId, candidateId: user.sub },
        },
      })
    )
      throw new ConflictException("Already applied");
    const stage = job.company.pipelineStages[0];
    if (!stage)
      throw new ConflictException("Company pipeline is not configured");
    const result = await this.db.application.create({
      data: {
        jobId: data.jobId,
        candidateId: user.sub,
        resumeId: data.resumeId,
        pipelineStageId: stage.id,
        coverLetter: data.coverLetter,
        answers: {
          create: data.answers.map((x) => ({
            questionId: x.questionId,
            answer: x.answer,
          })),
        },
        history: { create: { toStage: "APPLIED", changedById: user.sub } },
      },
      include: { job: { include: { company: true } }, resume: true },
    });
    await this.queue.add(
      "ai-match",
      { applicationId: result.id },
      `match-${result.id}`,
    );
    await this.queue.add(
      "email",
      {
        to: (result.job.company as any).email || "recruiter@hirehub.vn",
        subject: `New application: ${result.job.title}`,
        html: `<p>A new candidate applied for ${result.job.title}.</p>`,
      },
      `application-${result.id}`,
    );
    return result;
  }
  @Roles("CANDIDATE") @Get("mine") async mine(@Req() req: Request) {
    return this.db.application.findMany({
      where: { candidateId: (req.user as AuthUser).sub },
      include: {
        job: { include: { company: true } },
        history: { orderBy: { createdAt: "asc" } },
        interviews: true,
        offer: true,
        aiMatch: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get("pipeline") async pipeline(
    @Req() req: Request,
    @Query("jobId") jobId?: string,
  ) {
    return this.db.application.findMany({
      where: {
        job: {
          companyId: (req.user as AuthUser).companyId,
          ...(jobId ? { id: jobId } : {}),
        },
      },
      include: {
        candidate: {
          select: { id: true, name: true, email: true, candidateProfile: true },
        },
        job: { select: { id: true, title: true } },
        pipelineStage: true,
        resume: true,
        aiMatch: true,
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get(":id/detail") async detail(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const result = await (this.db as any).application.findFirst({
      where: { id, job: { companyId: (req.user as AuthUser).companyId } },
      include: {
        candidate: {
          include: {
            candidateProfile: true,
            candidateExperiences: { orderBy: { startsAt: "desc" } },
            candidateEducations: { orderBy: { startsAt: "desc" } },
          },
        },
        job: true,
        resume: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
            extractedText: true,
          },
        },
        pipelineStage: true,
        history: { orderBy: { createdAt: "asc" } },
        notes: {
          include: {
            author: { include: { user: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
        tags: { include: { tag: true } },
        interviews: { include: { scorecards: true } },
        offer: true,
        aiMatch: true,
      },
    });
    if (!result) throw new NotFoundException("Application not found");
    return result;
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get(":id/resume-url") async resumeUrl(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const application = await this.db.application.findFirst({
      where: { id, job: { companyId: (req.user as AuthUser).companyId } },
      include: { resume: true },
    });
    if (!application) throw new NotFoundException("Application not found");
    return {
      url: await this.storage.getUrl(application.resume.objectKey),
      expiresIn: 300,
    };
  }

  @Roles("RECRUITER", "COMPANY_ADMIN") @Post("bulk") async bulk(
    @Req() req: Request,
    @Body()
    body: {
      ids: string[];
      action: "MOVE" | "REJECT" | "TAG" | "ASSIGN";
      stage?: string;
      tagId?: string;
      memberId?: string;
    },
  ) {
    const user = req.user as AuthUser;
    const ids = [...new Set(body.ids || [])];
    if (!ids.length || ids.length > 100)
      throw new BadRequestException("Select between 1 and 100 applications");
    return this.db.$transaction(async (tx: any) => {
      const applications = await tx.application.findMany({
        where: { id: { in: ids }, job: { companyId: user.companyId } },
      });
      if (applications.length !== ids.length)
        throw new NotFoundException("One or more applications were not found");
      if (body.action === "TAG") {
        if (!body.tagId) throw new BadRequestException("Tag is required");
        await tx.tag.findFirstOrThrow({
          where: { id: body.tagId, companyId: user.companyId },
        });
        await tx.applicationTag.createMany({
          data: ids.map((applicationId) => ({
            applicationId,
            tagId: body.tagId!,
          })),
          skipDuplicates: true,
        });
      } else if (body.action === "ASSIGN") {
        if (!body.memberId)
          throw new BadRequestException("Recruiter is required");
        await tx.companyMember.findFirstOrThrow({
          where: {
            id: body.memberId,
            companyId: user.companyId,
            status: "ACTIVE",
          },
        });
        await tx.application.updateMany({
          where: { id: { in: ids } },
          data: { assignedMemberId: body.memberId },
        });
      } else {
        const target = body.action === "REJECT" ? "REJECTED" : body.stage;
        if (
          !target ||
          ![
            "APPLIED",
            "SCREENING",
            "INTERVIEW",
            "OFFER",
            "HIRED",
            "REJECTED",
          ].includes(target)
        )
          throw new BadRequestException("A valid target stage is required");
        const pipelineStage = await tx.pipelineStage.findUniqueOrThrow({
          where: { companyId_key: { companyId: user.companyId!, key: target } },
        });
        for (const application of applications) {
          if (application.stage === target) continue;
          await tx.application.update({
            where: { id: application.id },
            data: {
              stage: target,
              pipelineStageId: pipelineStage.id,
              version: { increment: 1 },
            },
          });
          await tx.stageHistory.create({
            data: {
              applicationId: application.id,
              fromStage: application.stage,
              toStage: target,
              changedById: user.sub,
            },
          });
          await tx.notification.create({
            data: {
              userId: application.candidateId,
              type: "APPLICATION_STAGE",
              title: "Application updated",
              body: `Your application moved to ${pipelineStage.label}`,
              link: "/candidate/applications",
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          companyId: user.companyId,
          actorId: user.sub,
          action: `APPLICATION_BULK_${body.action}`,
          entityType: "Application",
          entityId: ids.join(","),
          metadata: {
            count: ids.length,
            stage: body.stage,
            tagId: body.tagId,
            memberId: body.memberId,
          },
        },
      });
      return { updated: ids.length };
    });
  }

  @Roles("RECRUITER", "COMPANY_ADMIN") @Post(":id/move") async move(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = req.user as AuthUser;
    const data = moveApplicationSchema.parse(body);
    return this.db.$transaction(async (tx: any) => {
      const app = await tx.application.findFirst({
        where: { id, job: { companyId: user.companyId } },
        include: { pipelineStage: true },
      });
      if (!app) throw new NotFoundException();
      if (app.version !== data.expectedVersion)
        throw new ConflictException("Application changed; refresh and retry");
      const stage = await tx.pipelineStage.findUnique({
        where: {
          companyId_key: { companyId: user.companyId!, key: data.stage },
        },
      });
      if (!stage) throw new NotFoundException("Pipeline stage missing");
      const updated = await tx.application.update({
        where: { id, version: data.expectedVersion },
        data: {
          stage: data.stage,
          pipelineStageId: stage.id,
          version: { increment: 1 },
        },
      });
      await tx.stageHistory.create({
        data: {
          applicationId: id,
          fromStage: app.stage,
          toStage: data.stage,
          changedById: user.sub,
        },
      });
      await tx.notification.create({
        data: {
          userId: app.candidateId,
          type: "APPLICATION_STAGE",
          title: "Application updated",
          body: `Your application moved to ${stage.label}`,
          link: `/candidate/applications/${id}`,
        },
      });
      await tx.auditLog.create({
        data: {
          companyId: user.companyId,
          actorId: user.sub,
          action: "APPLICATION_MOVED",
          entityType: "Application",
          entityId: id,
          metadata: { from: app.stage, to: data.stage },
        },
      });
      return updated;
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post(":id/notes") async note(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { body: string },
  ) {
    const user = req.user as AuthUser;
    await this.db.application.findFirstOrThrow({
      where: { id, job: { companyId: user.companyId } },
    });
    if (!user.memberId)
      throw new ConflictException("Company member is required");
    return this.db.candidateNote.create({
      data: {
        applicationId: id,
        authorId: user.memberId,
        body: body.body.trim().slice(0, 3000),
      },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get(":id/notes") async notes(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const companyId = (req.user as AuthUser).companyId;
    await this.db.application.findFirstOrThrow({
      where: { id, job: { companyId } },
    });
    return this.db.candidateNote.findMany({
      where: { applicationId: id },
      include: { author: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post(":id/tags/:tagId") async addTag(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("tagId") tagId: string,
  ) {
    const companyId = (req.user as AuthUser).companyId!;
    await this.db.application.findFirstOrThrow({
      where: { id, job: { companyId } },
    });
    await this.db.tag.findFirstOrThrow({ where: { id: tagId, companyId } });
    return this.db.applicationTag.upsert({
      where: { applicationId_tagId: { applicationId: id, tagId } },
      create: { applicationId: id, tagId },
      update: {},
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN")
  @Delete(":id/tags/:tagId")
  async removeTag(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("tagId") tagId: string,
  ) {
    const companyId = (req.user as AuthUser).companyId!;
    await this.db.application.findFirstOrThrow({
      where: { id, job: { companyId } },
    });
    await this.db.applicationTag.deleteMany({
      where: { applicationId: id, tagId },
    });
    return { ok: true };
  }
}
