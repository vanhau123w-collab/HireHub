import { describe, expect, it } from "vitest";
import { RateLimitMiddleware } from "./rate-limit.middleware";

describe("RateLimitMiddleware", () => {
  it("limits repeated authentication attempts and returns the standard error shape", async () => {
    const middleware = new RateLimitMiddleware();
    const req = {
      path: "/api/auth/login",
      method: "POST",
      ip: "127.0.0.77",
      socket: {},
      requestId: "request-test",
    } as any;
    let statusCode = 200;
    let payload: any;
    const headers = new Map<string, unknown>();
    const res = {
      setHeader: (key: string, value: unknown) => headers.set(key, value),
      status: (value: number) => {
        statusCode = value;
        return res;
      },
      json: (value: unknown) => {
        payload = value;
        return res;
      },
    } as any;
    let allowed = 0;
    for (let index = 0; index < 11; index += 1)
      await middleware.use(req, res, () => {
        allowed += 1;
      });
    expect(allowed).toBe(10);
    expect(statusCode).toBe(429);
    expect(payload).toMatchObject({
      code: "RATE_LIMITED",
      requestId: "request-test",
    });
    expect(headers.get("RateLimit-Limit")).toBe(10);
  });
});
