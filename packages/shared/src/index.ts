import { z } from "zod";

export const systemRoles = [
  "CANDIDATE",
  "RECRUITER",
  "COMPANY_ADMIN",
  "PLATFORM_ADMIN",
] as const;
export type SystemRole = (typeof systemRoles)[number];
export const applicationStages = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type ApplicationStage = (typeof applicationStages)[number];
export const permissions = [
  "JOB_MANAGE",
  "CANDIDATE_VIEW",
  "CANDIDATE_MANAGE",
  "INTERVIEW_MANAGE",
  "TEAM_MANAGE",
  "BILLING_MANAGE",
  "ADMIN_ACCESS",
] as const;
export type Permission = (typeof permissions)[number];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export const registerSchema = loginSchema.extend({
  name: z.string().min(2).max(80),
  role: z.literal("CANDIDATE").default("CANDIDATE"),
});
export const jobSchema = z
  .object({
    title: z.string().min(3).max(120),
    department: z.string().min(2).max(80),
    location: z.string().min(2).max(120),
    workplace: z.enum(["ONSITE", "HYBRID", "REMOTE"]),
    employmentType: z.enum([
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "INTERNSHIP",
    ]),
    description: z.string().min(50),
    requirements: z.string().min(20),
    salaryMin: z.number().int().nonnegative().optional(),
    salaryMax: z.number().int().positive().optional(),
    currency: z.string().length(3).default("VND"),
    skills: z.array(z.string().min(1)).max(20),
    deadline: z.string().datetime().optional(),
  })
  .refine((v) => !v.salaryMin || !v.salaryMax || v.salaryMin <= v.salaryMax, {
    path: ["salaryMax"],
    message: "Maximum salary must be greater than minimum",
  });
export const applicationSchema = z.object({
  jobId: z.string().cuid(),
  resumeId: z.string().cuid(),
  coverLetter: z.string().max(3000).optional(),
  answers: z
    .array(
      z.object({ questionId: z.string().cuid(), answer: z.string().max(1000) }),
    )
    .default([]),
});
export const moveApplicationSchema = z.object({
  stage: z.enum(applicationStages),
  expectedVersion: z.number().int().nonnegative(),
});
export const interviewSchema = z
  .object({
    applicationId: z.string().cuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().default("Asia/Ho_Chi_Minh"),
    meetingUrl: z.string().url().optional(),
    participantIds: z.array(z.string().cuid()).min(1),
  })
  .refine((v) => new Date(v.startsAt) < new Date(v.endsAt), {
    path: ["endsAt"],
    message: "End must be after start",
  });
export const scorecardSchema = z.object({
  interviewId: z.string().cuid(),
  recommendation: z.enum(["STRONG_NO", "NO", "YES", "STRONG_YES"]),
  score: z.number().int().min(1).max(5),
  notes: z.string().max(3000),
});

export type PageInfo = { nextCursor: string | null; hasNextPage: boolean };
export type ListResponse<T> = { data: T[]; pageInfo: PageInfo };
export type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
};
export type AiMatch = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  evidence: string[];
  explanation: string;
  provider: "ai" | "deterministic";
};

export function deterministicMatch(
  candidateSkills: string[],
  requiredSkills: string[],
): AiMatch {
  const normalized = new Set(
    candidateSkills.map((s) => s.trim().toLowerCase()),
  );
  const matched = requiredSkills.filter((s) =>
    normalized.has(s.trim().toLowerCase()),
  );
  const missing = requiredSkills.filter(
    (s) => !normalized.has(s.trim().toLowerCase()),
  );
  const score = requiredSkills.length
    ? Math.round((matched.length / requiredSkills.length) * 100)
    : 50;
  return {
    score,
    matchedSkills: matched,
    missingSkills: missing,
    evidence: matched.map((s) => `Candidate profile includes ${s}`),
    explanation: `Matched ${matched.length} of ${requiredSkills.length} required skills.`,
    provider: "deterministic",
  };
}
