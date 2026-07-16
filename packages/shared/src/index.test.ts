import { describe, expect, it } from "vitest";
import { deterministicMatch, jobSchema } from "./index";
describe("shared domain", () => {
  it("explains deterministic matching", () => {
    const result = deterministicMatch(
      ["React", "Figma"],
      ["React", "TypeScript"],
    );
    expect(result.score).toBe(50);
    expect(result.matchedSkills).toEqual(["React"]);
  });
  it("rejects inverted salary", () => {
    expect(
      jobSchema.safeParse({
        title: "Frontend Engineer",
        department: "Engineering",
        location: "Remote",
        workplace: "REMOTE",
        employmentType: "FULL_TIME",
        description: "x".repeat(60),
        requirements: "x".repeat(30),
        salaryMin: 20,
        salaryMax: 10,
        currency: "VND",
        skills: [],
      }).success,
    ).toBe(false);
  });
});
