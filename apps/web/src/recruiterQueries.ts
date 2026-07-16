import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recruiterApi } from "./api";
import { useSession } from "./store";
import {
  useWorkflow,
  type DemoApplication,
  type DemoJob,
} from "./workflowStore";

export function useRecruiterJobs() {
  const online = Boolean(useSession((s) => s.token)),
    fallback = useWorkflow((s) => s.jobs),
    queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["recruiter", "jobs"],
    queryFn: recruiterApi.jobs,
    enabled: online,
  });
  const jobs: DemoJob[] = online
    ? (query.data || []).map((job) => ({
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.employmentType,
        status: job.status as DemoJob["status"],
        applicants: job._count?.applications || 0,
        skills: job.skills.map((skill) => skill.name),
      }))
    : fallback;
  const status = useMutation<
    unknown,
    Error,
    { id: string; status: DemoJob["status"] }
  >({
    mutationFn: ({ id, status }) =>
      online
        ? recruiterApi.setJobStatus(id, status)
        : Promise.resolve(useWorkflow.getState().setJobStatus(id, status)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recruiter", "jobs"] }),
  });
  const create = useMutation<
    unknown,
    Error,
    {
      title: string;
      department: string;
      location: string;
      type: string;
      skills: string[];
    }
  >({
    mutationFn: (input) =>
      online
        ? recruiterApi.createJob({
            title: input.title,
            department: input.department,
            location: input.location,
            workplace: input.location.toLowerCase().includes("remote")
              ? "REMOTE"
              : input.location.toLowerCase().includes("hybrid")
                ? "HYBRID"
                : "ONSITE",
            employmentType:
              input.type === "Thực tập"
                ? "INTERNSHIP"
                : input.type === "Bán thời gian"
                  ? "PART_TIME"
                  : "FULL_TIME",
            description: `We are looking for a ${input.title} to own meaningful outcomes, collaborate across functions, and continuously improve the candidate and customer experience.`,
            requirements: `Proven experience relevant to ${input.title}, strong communication, ownership, and the ability to work effectively with a cross-functional team.`,
            currency: "VND",
            skills: input.skills,
          })
        : Promise.resolve(
            useWorkflow.getState().createJob({ ...input, status: "DRAFT" }),
          ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recruiter", "jobs"] }),
  });
  return { ...query, online, jobs, status, create };
}

export function useRecruiterPipeline() {
  const online = Boolean(useSession((s) => s.token)),
    fallback = useWorkflow((s) => s.applications),
    queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["recruiter", "pipeline"],
    queryFn: () => recruiterApi.pipeline(),
    enabled: online,
  });
  const applications: DemoApplication[] = online
    ? (query.data || []).map((app) => ({
        id: app.id,
        candidate: app.candidate.name,
        email: app.candidate.email,
        jobId: app.job.id,
        jobTitle: app.job.title,
        stage: app.stage as DemoApplication["stage"],
        score: app.aiMatch?.score || 0,
        notes: [],
        version: app.version,
        aiMatch: app.aiMatch
          ? {
              matchedSkills: app.aiMatch.matchedSkills,
              missingSkills: app.aiMatch.missingSkills,
              evidence: app.aiMatch.evidence,
              explanation: app.aiMatch.explanation,
              provider: app.aiMatch.provider,
            }
          : undefined,
      }))
    : fallback;
  const move = useMutation({
    mutationFn: ({
      id,
      stage,
      version,
    }: {
      id: string;
      stage: DemoApplication["stage"];
      version: number;
    }) =>
      online
        ? recruiterApi.moveApplication(id, stage, version)
        : Promise.resolve(useWorkflow.getState().move(id, stage, version)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["recruiter", "pipeline"] });
      const previous = queryClient.getQueryData(["recruiter", "pipeline"]);
      queryClient.setQueryData(
        ["recruiter", "pipeline"],
        (rows: typeof query.data) =>
          rows?.map((row) =>
            row.id === input.id
              ? { ...row, stage: input.stage, version: row.version + 1 }
              : row,
          ),
      );
      return { previous };
    },
    onError: (_error, _input, context) =>
      queryClient.setQueryData(["recruiter", "pipeline"], context?.previous),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["recruiter", "pipeline"] }),
  });
  return { ...query, online, applications, move };
}

export function useRecruiterAnalytics() {
  const online = Boolean(useSession((s) => s.token));
  return useQuery({
    queryKey: ["recruiter", "analytics"],
    queryFn: recruiterApi.analytics,
    enabled: online,
  });
}

export function useRecruiterInterviews() {
  const online = Boolean(useSession((s) => s.token)),
    client = useQueryClient(),
    local = useWorkflow((s) => s.interviews);
  const query = useQuery({
    queryKey: ["recruiter", "interviews"],
    queryFn: recruiterApi.interviews,
    enabled: online,
  });
  const members = useQuery({
    queryKey: ["recruiter", "members"],
    queryFn: recruiterApi.members,
    enabled: online,
  });
  const interviews = online
    ? (query.data || []).map((row) => ({
        id: String(row.id),
        applicationId: String(row.applicationId),
        candidate: String(
          (row.application as { candidate?: { name?: string } })?.candidate
            ?.name || "Candidate",
        ),
        startsAt: String(row.startsAt),
        status: String(row.status),
        score: Number(
          (row.scorecards as Array<{ score: number }>)?.[0]?.score || 0,
        ),
        type: String(
          (row.application as { job?: { title?: string } })?.job?.title ||
            "Interview",
        ),
      }))
    : local;
  const schedule = useMutation({
    mutationFn: (input: {
      applicationId: string;
      startsAt: string;
      meetingUrl?: string;
    }) => {
      if (!online) {
        const app = useWorkflow
          .getState()
          .applications.find((item) => item.id === input.applicationId)!;
        useWorkflow.getState().schedule({
          applicationId: input.applicationId,
          candidate: app.candidate,
          startsAt: input.startsAt,
          type: "Interview",
        });
        return Promise.resolve();
      }
      const memberId = String(members.data?.[0]?.id || "");
      if (!memberId) throw new Error("No active interviewer is available");
      return recruiterApi.scheduleInterview({
        applicationId: input.applicationId,
        startsAt: input.startsAt,
        endsAt: new Date(
          new Date(input.startsAt).getTime() + 3600_000,
        ).toISOString(),
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "Asia/Ho_Chi_Minh",
        meetingUrl: input.meetingUrl,
        participantIds: [memberId],
      });
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["recruiter", "interviews"] }),
  });
  const score = useMutation({
    mutationFn: ({
      interviewId,
      score,
      notes,
    }: {
      interviewId: string;
      score: number;
      notes: string;
    }) =>
      online
        ? recruiterApi.scorecard({
            interviewId,
            score,
            notes,
            recommendation:
              score >= 4 ? "STRONG_YES" : score >= 3 ? "YES" : "NO",
          })
        : Promise.resolve(
            useWorkflow.getState().completeInterview(interviewId, score),
          ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["recruiter", "interviews"] }),
  });
  return { ...query, online, interviews, members, schedule, score };
}

export function useRecruiterMessages(selected: string) {
  const online = Boolean(useSession((s) => s.token)),
    client = useQueryClient(),
    localApps = useWorkflow((s) => s.applications),
    localMessages = useWorkflow((s) => s.messages);
  const conversations = useQuery({
    queryKey: ["recruiter", "conversations"],
    queryFn: recruiterApi.conversations,
    enabled: online,
  });
  const messages = useQuery({
    queryKey: ["recruiter", "messages", selected],
    queryFn: () => recruiterApi.messages(selected),
    enabled: online && Boolean(selected),
    refetchInterval: online ? 10_000 : false,
  });
  const rows = online
    ? (messages.data || []).map((row) => ({
        id: String(row.id),
        body: String(row.body),
        sender:
          String(row.senderId) === useSession.getState().user?.id
            ? "recruiter"
            : "candidate",
        createdAt: String(row.createdAt),
      }))
    : localMessages.filter((message) => message.conversationId === selected);
  const threads = online
    ? (conversations.data || []).map((row) => ({
        id: String(row.id),
        candidate: String(
          (row.application as { candidate?: { name?: string } })?.candidate
            ?.name || "Candidate",
        ),
        jobTitle: String(
          (row.application as { job?: { title?: string } })?.job?.title || "",
        ),
      }))
    : localApps.map((app) => ({
        id: app.id,
        candidate: app.candidate,
        jobTitle: app.jobTitle,
      }));
  const send = useMutation({
    mutationFn: (body: string) =>
      online
        ? recruiterApi.sendMessage(selected, body)
        : Promise.resolve(useWorkflow.getState().sendMessage(selected, body)),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["recruiter", "messages", selected],
      }),
  });
  return { online, conversations, messages, rows, threads, send };
}
