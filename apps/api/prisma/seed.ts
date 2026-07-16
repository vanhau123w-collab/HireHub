import { PrismaClient, SystemRole } from "@prisma/client";
import argon2 from "argon2";
import { deterministicMatch } from "@hirehub/shared";
const db = new PrismaClient();
const password = "Demo1234!";
async function user(name: string, email: string, role: SystemRole) {
  return db.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await argon2.hash(password),
      emailVerifiedAt: new Date(),
      candidateProfile:
        role === "CANDIDATE"
          ? {
              create: {
                headline: "Senior Product Designer",
                location: "TP. Hồ Chí Minh",
                yearsExperience: 5,
                skills: [
                  "Figma",
                  "UX Research",
                  "Design Systems",
                  "Prototyping",
                ],
                bio: "Product designer focused on thoughtful, measurable experiences.",
              },
            }
          : undefined,
    },
  });
}
async function main() {
  await db.webhookEvent.deleteMany();
  await db.auditLog.deleteMany();
  await db.company.deleteMany();
  await db.user.deleteMany();
  const candidate = await user(
    "Nguyễn Minh Anh",
    "candidate@hirehub.vn",
    "CANDIDATE",
  );
  const recruiter = await user(
    "Linh Anh",
    "recruiter@hirehub.vn",
    "COMPANY_ADMIN",
  );
  const admin = await user(
    "Platform Admin",
    "admin@hirehub.vn",
    "PLATFORM_ADMIN",
  );
  await (db as any).candidateExperience.create({
    data: {
      userId: candidate.id,
      company: "Atlas Commerce",
      title: "Senior Product Designer",
      location: "TP. Hồ Chí Minh",
      startsAt: new Date("2022-01-01"),
      current: true,
      description:
        "Led discovery, design systems and product delivery for a multi-market commerce platform.",
    },
  });
  await (db as any).candidateEducation.create({
    data: {
      userId: candidate.id,
      school: "University of Architecture Ho Chi Minh City",
      degree: "Bachelor of Design",
      field: "Digital Product Design",
      startsAt: new Date("2014-09-01"),
      endsAt: new Date("2018-06-01"),
    },
  });
  const company = await db.company.create({
    data: {
      name: "Nexa Studio",
      slug: "nexa-studio",
      description: "Digital product studio building products people love.",
      website: "https://example.com",
      status: "VERIFIED",
      members: {
        create: {
          userId: recruiter.id,
          role: "COMPANY_ADMIN",
          permissions: [
            "JOB_MANAGE",
            "CANDIDATE_VIEW",
            "CANDIDATE_MANAGE",
            "INTERVIEW_MANAGE",
            "TEAM_MANAGE",
            "BILLING_MANAGE",
          ],
        },
      },
      subscription: { create: { plan: "PRO", status: "ACTIVE" } },
      pipelineStages: {
        create: [
          { key: "APPLIED", label: "Ứng tuyển", position: 0 },
          { key: "SCREENING", label: "Sàng lọc", position: 1 },
          { key: "INTERVIEW", label: "Phỏng vấn", position: 2 },
          { key: "OFFER", label: "Offer", position: 3 },
          { key: "HIRED", label: "Đã tuyển", position: 4 },
          { key: "REJECTED", label: "Từ chối", position: 5 },
        ],
      },
    },
  });
  const job = await db.job.create({
    data: {
      companyId: company.id,
      title: "Senior Product Designer",
      slug: "senior-product-designer",
      department: "Product",
      location: "TP. Hồ Chí Minh",
      workplace: "HYBRID",
      employmentType: "FULL_TIME",
      description:
        "Join our product team to shape clear, accessible experiences for growing digital products. You will partner with research, engineering and product from discovery to delivery.",
      requirements:
        "Five years of product design experience, strong Figma craft, design systems thinking and a portfolio showing measurable outcomes.",
      salaryMin: 35000000,
      salaryMax: 55000000,
      status: "PUBLISHED",
      publishedAt: new Date(),
      skills: {
        create: [
          { name: "Figma" },
          { name: "UX Research" },
          { name: "Design Systems" },
          { name: "Prototyping" },
        ],
      },
      questions: {
        create: [
          {
            prompt: "Why are you interested in Nexa Studio?",
            required: true,
            position: 0,
          },
        ],
      },
    },
  });
  const resume = await db.resume.create({
    data: {
      userId: candidate.id,
      name: "Minh-Anh-Product-Designer.pdf",
      objectKey: "demo/minh-anh.pdf",
      mimeType: "application/pdf",
      size: 245000,
      isDefault: true,
      extractedText:
        "Senior Product Designer with Figma, UX Research, Design Systems and Prototyping experience.",
    },
  });
  const firstStage = await db.pipelineStage.findUniqueOrThrow({
    where: { companyId_key: { companyId: company.id, key: "APPLIED" } },
  });
  const match = deterministicMatch(
    ["Figma", "UX Research", "Design Systems", "Prototyping"],
    ["Figma", "UX Research", "Design Systems", "Prototyping"],
  );
  const application = await db.application.create({
    data: {
      jobId: job.id,
      candidateId: candidate.id,
      resumeId: resume.id,
      pipelineStageId: firstStage.id,
      coverLetter:
        "I would love to help Nexa Studio build thoughtful product experiences.",
      history: { create: { toStage: "APPLIED", changedById: candidate.id } },
      aiMatch: { create: match },
    },
  });
  await db.conversation.create({
    data: {
      companyId: company.id,
      applicationId: application.id,
      messages: {
        create: [
          {
            senderId: recruiter.id,
            body: "Chào Minh Anh, cảm ơn bạn đã ứng tuyển. Team rất ấn tượng với portfolio của bạn.",
          },
          {
            senderId: candidate.id,
            body: "Cảm ơn chị, em rất mong được trao đổi thêm với team.",
          },
        ],
      },
    },
  });
  await db.notification.createMany({
    data: [
      {
        userId: candidate.id,
        type: "APPLICATION",
        title: "Ứng tuyển thành công",
        body: "Hồ sơ Senior Product Designer đã được gửi.",
      },
      {
        userId: recruiter.id,
        type: "NEW_APPLICATION",
        title: "Có ứng viên mới",
        body: "Nguyễn Minh Anh vừa ứng tuyển Senior Product Designer.",
      },
    ],
  });
  console.log(
    `Seed complete. candidate@hirehub.vn, recruiter@hirehub.vn, admin@hirehub.vn / ${password}`,
  );
  void admin;
}
main().finally(() => db.$disconnect());
