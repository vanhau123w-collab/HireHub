import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { interviewSchema, scorecardSchema } from "@hirehub/shared";
import type { Request } from "express";
import Stripe from "stripe";
import { AuthUser, Public, Roles } from "./auth";
import { PrismaService } from "./prisma.service";
import { EventsGateway } from "./events.gateway";
@ApiTags("workflows")
@Controller()
export class WorkflowsController {
  constructor(
    @Inject(PrismaService) private db: PrismaService,
    @Inject(EventsGateway) private events: EventsGateway,
  ) {}
  @Roles("RECRUITER", "COMPANY_ADMIN") @Get("interviews") interviews(
    @Req() req: Request,
  ) {
    return this.db.interview.findMany({
      where: {
        application: { job: { companyId: (req.user as AuthUser).companyId } },
      },
      include: {
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            job: { select: { id: true, title: true } },
          },
        },
        participants: {
          include: {
            member: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        scorecards: true,
      },
      orderBy: { startsAt: "asc" },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post("interviews") async interview(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = req.user as AuthUser;
    const data = interviewSchema.parse(body);
    const application = await this.db.application.findFirstOrThrow({
      where: { id: data.applicationId, job: { companyId: user.companyId } },
    });
    const result = await this.db.interview.create({
      data: {
        applicationId: data.applicationId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        timezone: data.timezone,
        meetingUrl: data.meetingUrl,
        participants: {
          create: data.participantIds.map((memberId) => ({ memberId })),
        },
      },
    });
    await this.db.notification.create({
      data: {
        userId: application.candidateId,
        type: "INTERVIEW",
        title: "Interview scheduled",
        body: `Interview scheduled for ${data.startsAt}`,
        link: "/candidate/applications",
      },
    });
    return result;
  }
  @Roles("CANDIDATE") @Patch("interviews/:id/status") async interviewResponse(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status: "CONFIRMED" | "RESCHEDULE_REQUESTED" },
  ) {
    await this.db.interview.findFirstOrThrow({
      where: { id, application: { candidateId: (req.user as AuthUser).sub } },
    });
    return this.db.interview.update({
      where: { id },
      data: { status: body.status },
    });
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post("scorecards") scorecard(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = req.user as AuthUser;
    const data = scorecardSchema.parse(body);
    return this.db.scorecard.upsert({
      where: {
        interviewId_authorId: {
          interviewId: data.interviewId,
          authorId: user.memberId!,
        },
      },
      create: { ...data, authorId: user.memberId! },
      update: {
        recommendation: data.recommendation,
        score: data.score,
        notes: data.notes,
      },
    });
  }
  @Get("conversations") conversations(@Req() req: Request) {
    const user = req.user as AuthUser;
    return this.db.conversation.findMany({
      where:
        user.role === "CANDIDATE"
          ? { application: { candidateId: user.sub } }
          : { companyId: user.companyId },
      include: {
        application: {
          include: {
            job: true,
            candidate: { select: { id: true, name: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
  @Get("conversations/:id/messages") messages(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const user = req.user as AuthUser;
    return this.db.message.findMany({
      where: {
        conversationId: id,
        conversation:
          user.role === "CANDIDATE"
            ? { application: { candidateId: user.sub } }
            : { companyId: user.companyId },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }
  @Post("conversations/:id/messages") async message(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { body: string },
  ) {
    const user = req.user as AuthUser;
    const conversation = await this.db.conversation.findFirst({
      where: {
        id,
        ...(user.role === "CANDIDATE"
          ? { application: { candidateId: user.sub } }
          : { companyId: user.companyId }),
      },
      include: { application: { select: { candidateId: true } } },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    const text = body.body?.trim();
    if (!text) throw new BadRequestException("Message cannot be empty");
    const message = await this.db.message.create({
      data: {
        conversationId: id,
        senderId: user.sub,
        body: text.slice(0, 5000),
      },
    });
    const event = { type: "MESSAGE_CREATED", conversationId: id, message };
    this.events.emitToCompany(conversation.companyId, event);
    this.events.emitToUser(conversation.application.candidateId, event);
    return message;
  }
  @Roles("RECRUITER", "COMPANY_ADMIN") @Post("offers") async offer(
    @Req() req: Request,
    @Body()
    body: {
      applicationId: string;
      salary: number;
      currency: string;
      startsAt: string;
      expiresAt: string;
    },
  ) {
    const user = req.user as AuthUser;
    if (body.salary < 0 || new Date(body.expiresAt) <= new Date())
      throw new BadRequestException("Offer values are invalid");
    return this.db.$transaction(async (tx: any) => {
      const app = await tx.application.findFirstOrThrow({
        where: { id: body.applicationId, job: { companyId: user.companyId } },
      });
      const offer = await tx.offer.upsert({
        where: { applicationId: app.id },
        create: {
          applicationId: app.id,
          salary: body.salary,
          currency: body.currency,
          startsAt: new Date(body.startsAt),
          expiresAt: new Date(body.expiresAt),
          status: "SENT",
        },
        update: {
          salary: body.salary,
          currency: body.currency,
          startsAt: new Date(body.startsAt),
          expiresAt: new Date(body.expiresAt),
          status: "SENT",
          respondedAt: null,
        },
      });
      const offerStage = await tx.pipelineStage.findUniqueOrThrow({
        where: { companyId_key: { companyId: user.companyId!, key: "OFFER" } },
      });
      await tx.application.update({
        where: { id: app.id },
        data: {
          stage: "OFFER",
          pipelineStageId: offerStage.id,
          version: { increment: 1 },
        },
      });
      await tx.stageHistory.create({
        data: {
          applicationId: app.id,
          fromStage: app.stage,
          toStage: "OFFER",
          changedById: user.sub,
        },
      });
      await tx.notification.create({
        data: {
          userId: app.candidateId,
          type: "OFFER",
          title: "You received an offer",
          body: "Review your offer in HireHub.",
          link: "/candidate/applications",
        },
      });
      await tx.auditLog.create({
        data: {
          companyId: user.companyId,
          actorId: user.sub,
          action: "OFFER_SENT",
          entityType: "Application",
          entityId: app.id,
          metadata: { salary: body.salary, currency: body.currency },
        },
      });
      return offer;
    });
  }
  @Roles("CANDIDATE") @Patch("offers/:id/respond") async offerResponse(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status: "ACCEPTED" | "DECLINED" },
  ) {
    const user = req.user as AuthUser;
    return this.db.$transaction(async (tx: any) => {
      const offer = await tx.offer.findFirstOrThrow({
        where: { id, application: { candidateId: user.sub } },
        include: { application: { include: { job: true } } },
      });
      if (offer.status !== "SENT" || offer.expiresAt < new Date())
        throw new BadRequestException("Offer cannot be changed");
      const result = await tx.offer.update({
        where: { id },
        data: { status: body.status, respondedAt: new Date() },
      });
      const stage = body.status === "ACCEPTED" ? "HIRED" : "REJECTED";
      const pipelineStage = await tx.pipelineStage.findUniqueOrThrow({
        where: {
          companyId_key: {
            companyId: offer.application.job.companyId,
            key: stage,
          },
        },
      });
      await tx.application.update({
        where: { id: offer.applicationId },
        data: {
          stage,
          pipelineStageId: pipelineStage.id,
          version: { increment: 1 },
        },
      });
      await tx.stageHistory.create({
        data: {
          applicationId: offer.applicationId,
          fromStage: "OFFER",
          toStage: stage,
          changedById: user.sub,
        },
      });
      await tx.auditLog.create({
        data: {
          companyId: offer.application.job.companyId,
          actorId: user.sub,
          action: `OFFER_${body.status}`,
          entityType: "Application",
          entityId: offer.applicationId,
          metadata: { offerId: id },
        },
      });
      return result;
    });
  }
  @Roles("COMPANY_ADMIN") @Post("billing/checkout") async checkout(
    @Req() req: Request,
  ) {
    if (!process.env.STRIPE_SECRET_KEY)
      return {
        mode: "local",
        url: `${process.env.WEB_ORIGIN || "http://localhost:5173"}/recruiter/settings?billing=demo`,
      };
    const user = req.user as AuthUser;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.WEB_ORIGIN}/recruiter/settings?billing=success`,
      cancel_url: `${process.env.WEB_ORIGIN}/recruiter/settings?billing=cancel`,
      metadata: { companyId: user.companyId! },
      subscription_data: { metadata: { companyId: user.companyId! } },
    });
    return { url: session.url };
  }
  @Roles("COMPANY_ADMIN") @Post("billing/portal") async billingPortal(
    @Req() req: Request,
  ) {
    const companyId = (req.user as AuthUser).companyId!,
      subscription = await this.db.subscription.findUnique({
        where: { companyId },
      });
    if (!process.env.STRIPE_SECRET_KEY || !subscription?.stripeCustomerId)
      return {
        mode: "local",
        url: `${process.env.WEB_ORIGIN || "http://localhost:5173"}/recruiter/settings?billing=demo`,
      };
    const session = await new Stripe(
      process.env.STRIPE_SECRET_KEY,
    ).billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.WEB_ORIGIN || "http://localhost:5173"}/recruiter/settings`,
    });
    return { url: session.url };
  }
  @Public() @Post("webhooks/stripe") async stripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
  ) {
    let event: any = body;
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers["stripe-signature"];
      if (typeof signature !== "string" || !req.rawBody)
        throw new BadRequestException("Missing Stripe signature");
      event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    }
    const externalId = event.id;
    if (!externalId) return { received: false };
    if (
      await this.db.webhookEvent.findUnique({
        where: { provider_externalId: { provider: "stripe", externalId } },
      })
    )
      return { received: true, duplicate: true };
    await this.db.$transaction(async (tx: any) => {
      await tx.webhookEvent.create({
        data: {
          provider: "stripe",
          externalId,
          payload: event,
          status: "PROCESSING",
        },
      });
      const object = event.data?.object || {},
        companyId = object.metadata?.companyId;
      if (
        companyId &&
        [
          "checkout.session.completed",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ].includes(event.type)
      ) {
        const cancelled =
          event.type === "customer.subscription.deleted" ||
          object.status === "canceled";
        const subscriptionStatus = cancelled
          ? "CANCELLED"
          : object.status === "past_due"
            ? "PAST_DUE"
            : object.status === "trialing"
              ? "TRIALING"
              : "ACTIVE";
        const currentPeriodEnd = object.current_period_end
          ? new Date(Number(object.current_period_end) * 1000)
          : undefined;
        await tx.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            plan: cancelled ? "FREE" : "PRO",
            status: subscriptionStatus,
            stripeCustomerId: String(object.customer || "") || null,
            stripeSubscriptionId:
              String(object.subscription || object.id || "") || null,
            currentPeriodEnd,
          },
          update: {
            plan: cancelled ? "FREE" : "PRO",
            status: subscriptionStatus,
            stripeCustomerId: String(object.customer || "") || undefined,
            stripeSubscriptionId:
              String(object.subscription || object.id || "") || undefined,
            currentPeriodEnd,
          },
        });
      }
      await tx.webhookEvent.update({
        where: { provider_externalId: { provider: "stripe", externalId } },
        data: { status: "PROCESSED" },
      });
    });
    return { received: true };
  }
}
