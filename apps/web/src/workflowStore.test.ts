import { beforeEach, describe, expect, it } from "vitest";
import { useWorkflow } from "./workflowStore";

const initial = useWorkflow.getState();
describe("complete recruitment demo flow", () => {
  beforeEach(() =>
    useWorkflow.setState({
      jobs: initial.jobs,
      applications: initial.applications,
      interviews: initial.interviews,
      messages: initial.messages,
    }),
  );
  it("creates, publishes and accepts an application", () => {
    const id = useWorkflow.getState().createJob({
      title: "QA Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Toàn thời gian",
      status: "DRAFT",
      skills: ["Playwright"],
    });
    useWorkflow.getState().setJobStatus(id, "PUBLISHED");
    expect(useWorkflow.getState().apply(id)).toBe(true);
    expect(useWorkflow.getState().apply(id)).toBe(false);
    const application = useWorkflow
      .getState()
      .applications.find((a) => a.jobId === id)!;
    expect(
      useWorkflow
        .getState()
        .move(application.id, "SCREENING", application.version),
    ).toBe(true);
    expect(
      useWorkflow.getState().move(application.id, "OFFER", application.version),
    ).toBe(false);
  });
  it("schedules interview, scores it and sends a message", () => {
    const app = useWorkflow.getState().applications[0]!;
    useWorkflow.getState().schedule({
      applicationId: app.id,
      candidate: app.candidate,
      startsAt: new Date().toISOString(),
      type: "Technical interview",
    });
    const interview = useWorkflow.getState().interviews.at(-1)!;
    useWorkflow.getState().completeInterview(interview.id, 5);
    useWorkflow.getState().sendMessage(app.id, "Cảm ơn bạn đã tham gia.");
    expect(useWorkflow.getState().interviews.at(-1)?.score).toBe(5);
    expect(useWorkflow.getState().messages.at(-1)?.body).toContain("Cảm ơn");
  });
});
