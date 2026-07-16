import nodemailer from "nodemailer";
import { deterministicMatch, type AiMatch } from "@hirehub/shared";
export interface EmailAdapter {
  send(input: { to: string; subject: string; html: string }): Promise<void>;
}
export class SmtpEmailAdapter implements EmailAdapter {
  private transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "localhost",
    port: Number(process.env.MAIL_PORT || 1025),
    secure: false,
  });
  async send(input: { to: string; subject: string; html: string }) {
    await this.transport.sendMail({
      from: "HireHub <noreply@hirehub.local>",
      ...input,
    });
  }
}
export interface AiAdapter {
  match(
    candidateSkills: string[],
    requiredSkills: string[],
    context?: string,
  ): Promise<AiMatch>;
}
export class MatchingAdapter implements AiAdapter {
  async match(
    candidateSkills: string[],
    requiredSkills: string[],
    context?: string,
  ): Promise<AiMatch> {
    const fallback = deterministicMatch(candidateSkills, requiredSkills);
    if (!process.env.AI_API_KEY || !process.env.AI_API_URL) return fallback;
    try {
      const response = await fetch(process.env.AI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateSkills,
          requiredSkills,
          resumeText: context?.slice(0, 20_000),
          instruction:
            "Return JSON with score, matchedSkills, missingSkills, evidence and explanation. This is advisory only and must never make a rejection decision.",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok)
        throw new Error(`AI provider returned ${response.status}`);
      const value = (await response.json()) as Partial<AiMatch>;
      if (
        !Number.isFinite(value.score) ||
        !Array.isArray(value.matchedSkills) ||
        !Array.isArray(value.missingSkills)
      )
        throw new Error("AI provider response is invalid");
      return {
        score: Math.max(0, Math.min(100, Math.round(value.score!))),
        matchedSkills: value.matchedSkills.map(String),
        missingSkills: value.missingSkills.map(String),
        evidence: Array.isArray(value.evidence)
          ? value.evidence.map(String).slice(0, 10)
          : fallback.evidence,
        explanation: String(value.explanation || fallback.explanation),
        provider: "ai",
      };
    } catch {
      return fallback;
    }
  }
}
export interface StorageAdapter {
  publicUrl(key: string): string;
}
export class S3CompatibleStorage implements StorageAdapter {
  publicUrl(key: string) {
    return `${process.env.S3_ENDPOINT || "http://localhost:9000"}/${process.env.S3_BUCKET || "hirehub"}/${key}`;
  }
}
