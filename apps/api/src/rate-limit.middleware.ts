import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import IORedis from "ioredis";

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly local = new Map<string, Bucket>();
  private readonly redis = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      })
    : null;

  async use(req: Request, res: Response, next: NextFunction) {
    const rule = this.rule(req.path, req.method);
    if (!rule) return next();
    const identity = req.ip || req.socket.remoteAddress || "unknown";
    const windowId = Math.floor(Date.now() / rule.windowMs);
    const key = `rate:${rule.name}:${identity}:${windowId}`;
    let count: number;
    try {
      if (!this.redis) throw new Error("memory fallback");
      if (this.redis.status === "wait") await this.redis.connect();
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.pexpire(key, rule.windowMs);
    } catch {
      const now = Date.now();
      const bucket = this.local.get(key);
      const nextBucket =
        !bucket || bucket.resetAt <= now
          ? { count: 1, resetAt: now + rule.windowMs }
          : { ...bucket, count: bucket.count + 1 };
      this.local.set(key, nextBucket);
      count = nextBucket.count;
      if (this.local.size > 5_000)
        for (const [entry, value] of this.local)
          if (value.resetAt <= now) this.local.delete(entry);
    }
    res.setHeader("RateLimit-Limit", rule.limit);
    res.setHeader("RateLimit-Remaining", Math.max(0, rule.limit - count));
    if (count > rule.limit)
      return res.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        requestId: (req as Request & { requestId?: string }).requestId,
      });
    next();
  }

  private rule(path: string, method: string) {
    if (path.includes("/auth/") && method !== "GET")
      return { name: "auth", limit: 10, windowMs: 60_000 };
    if (path.includes("/resumes/") && method === "POST")
      return { name: "upload", limit: 20, windowMs: 60_000 };
    if (path.endsWith("/applications") && method === "POST")
      return { name: "apply", limit: 30, windowMs: 60_000 };
    return null;
  }
}
