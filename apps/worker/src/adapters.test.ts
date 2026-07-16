import { describe, expect, it } from "vitest";
import { MatchingAdapter } from "./adapters";
describe("matching adapter", () => {
  it("falls back without credentials", async () => {
    delete process.env.AI_API_KEY;
    const result = await new MatchingAdapter().match(
      ["React"],
      ["React", "Node.js"],
    );
    expect(result.provider).toBe("deterministic");
    expect(result.score).toBe(50);
  });
});
