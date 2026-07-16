import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import { MatchingAdapter, SmtpEmailAdapter } from "./adapters.js";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);
const db = new PrismaClient();
const email = new SmtpEmailAdapter();
const ai = new MatchingAdapter();
const storage = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY || "",
      }
    : undefined,
});

const workers = [
  new Worker("email", async (job) => email.send(job.data), { connection }),
  new Worker(
    "ai-match",
    async (job) => {
      const application = await db.application.findUniqueOrThrow({
        where: { id: job.data.applicationId },
        include: {
          candidate: { include: { candidateProfile: true } },
          resume: true,
          job: { include: { skills: true } },
        },
      });
      const skills = application.job.skills as Array<{
        name: string;
        required: boolean;
      }>;
      const result = await ai.match(
        application.candidate.candidateProfile?.skills || [],
        skills.filter((skill) => skill.required).map((skill) => skill.name),
        application.resume.extractedText || undefined,
      );
      await db.aiMatchResult.upsert({
        where: { applicationId: application.id },
        create: { applicationId: application.id, ...result },
        update: result,
      });
      return result;
    },
    { connection },
  ),
  new Worker(
    "resume",
    async (job) => {
      const response = await storage.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET || "hirehub",
          Key: job.data.objectKey,
        }),
      );
      if (!response.Body) throw new Error("Resume object has no body");
      const bytes = await response.Body.transformToByteArray();
      let extractedText: string;
      try {
        const parser = new PDFParse({ data: bytes });
        const result = await parser.getText();
        await parser.destroy();
        extractedText = result.text
          .replace(/\u0000/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100_000);
        if (!extractedText)
          extractedText =
            "The PDF contains no extractable text. A recruiter can still review the original file.";
      } catch {
        extractedText =
          "Text extraction was unavailable. A recruiter can still review the original PDF securely.";
      }
      await db.resume.update({
        where: { id: job.data.resumeId },
        data: { extractedText },
      });
      return { characters: extractedText.length };
    },
    { connection },
  ),
];

for (const worker of workers)
  worker.on("failed", (job, error) =>
    console.error(
      `HireHub worker ${worker.name} failed job ${job?.id}:`,
      error.message,
    ),
  );
console.log("HireHub worker listening: email, ai-match, resume");

async function shutdown() {
  await Promise.all(workers.map((worker) => worker.close()));
  await connection.quit();
  await db.$disconnect();
}
process.on("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
process.on("SIGINT", () => void shutdown().finally(() => process.exit(0)));
