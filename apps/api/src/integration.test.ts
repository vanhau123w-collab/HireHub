import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "./http-exception.filter";
import { PrismaService } from "./prisma.service";

const run = Boolean(process.env.DATABASE_URL && process.env.CI);
describe.skipIf(!run)("HireHub API integration", () => {
  let app: INestApplication,
    db: PrismaService,
    candidateToken: string,
    recruiterToken: string,
    recruiterCompanyId: string;
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();
    db = app.get(PrismaService);
    candidateToken = (
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "candidate@hirehub.vn", password: "Demo1234!" })
        .expect(201)
    ).body.accessToken;
    const recruiterLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "recruiter@hirehub.vn", password: "Demo1234!" })
      .expect(201);
    recruiterToken = recruiterLogin.body.accessToken;
    recruiterCompanyId = recruiterLogin.body.user.companyId;
  });
  afterAll(async () => app?.close());
  it("enforces role guards", async () => {
    await request(app.getHttpServer())
      .get("/api/applications/mine")
      .set("Authorization", `Bearer ${candidateToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/applications/pipeline")
      .set("Authorization", `Bearer ${candidateToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/applications/pipeline")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .expect(200);
  });
  it("rotates refresh tokens and rejects reuse", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "candidate@hirehub.vn", password: "Demo1234!" })
      .expect(201);
    const original = String(login.headers["set-cookie"]?.[0] || "").split(
      ";",
    )[0];
    expect(original).toContain("hirehub_refresh=");
    const refreshed = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", original)
      .expect(201);
    expect(refreshed.body.accessToken).toBeTypeOf("string");
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", original)
      .expect(401);
  });
  it("rejects stale pipeline writes", async () => {
    const response = await request(app.getHttpServer())
        .get("/api/applications/pipeline")
        .set("Authorization", `Bearer ${recruiterToken}`)
        .expect(200),
      item = response.body[0];
    await request(app.getHttpServer())
      .post(`/api/applications/${item.id}/move`)
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({ stage: "SCREENING", expectedVersion: item.version + 99 })
      .expect(409);
    expect(
      (await (db as any).application.findUnique({ where: { id: item.id } }))
        .version,
    ).toBe(item.version);
  });
  it("prevents cross-tenant job mutation", async () => {
    const foreign = await (db as any).company.create({
      data: {
        name: "Foreign tenant",
        slug: `foreign-${Date.now()}`,
        status: "VERIFIED",
      },
    });
    const job = await (db as any).job.create({
      data: {
        companyId: foreign.id,
        title: "Private role",
        slug: `private-${Date.now()}`,
        department: "Security",
        location: "Remote",
        workplace: "REMOTE",
        employmentType: "FULL_TIME",
        description:
          "A private role that must remain isolated from recruiters belonging to other companies.",
        requirements:
          "Relevant security experience and strong communication skills are required.",
        status: "DRAFT",
      },
    });
    await request(app.getHttpServer())
      .patch(`/api/jobs/${job.id}/status`)
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({ status: "PUBLISHED" })
      .expect(404);
    await (db as any).company.delete({ where: { id: foreign.id } });
  });
  it("bulk assigns applications only to a member in the active tenant", async () => {
    const pipeline = await request(app.getHttpServer())
      .get("/api/applications/pipeline")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .expect(200);
    const members = await request(app.getHttpServer())
      .get("/api/members")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .expect(200);
    const applicationId = pipeline.body[0].id,
      memberId = members.body[0].id;
    await request(app.getHttpServer())
      .post("/api/applications/bulk")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({ ids: [applicationId], action: "ASSIGN", memberId })
      .expect(201);
    expect(
      (
        await (db as any).application.findUnique({
          where: { id: applicationId },
        })
      ).assignedMemberId,
    ).toBe(memberId);
  });
  it("processes Stripe subscription events idempotently", async () => {
    const event = {
      id: `evt_ci_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_ci",
          subscription: "sub_ci",
          metadata: { companyId: recruiterCompanyId },
        },
      },
    };
    await request(app.getHttpServer())
      .post("/api/webhooks/stripe")
      .send(event)
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post("/api/webhooks/stripe")
      .send(event)
      .expect(201);
    expect(duplicate.body.duplicate).toBe(true);
    expect(
      (
        await (db as any).subscription.findUnique({
          where: { companyId: recruiterCompanyId },
        })
      ).plan,
    ).toBe("PRO");
  });
});
