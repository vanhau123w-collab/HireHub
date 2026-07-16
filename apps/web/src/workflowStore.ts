import { create } from "zustand";
export type DemoJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED";
  applicants: number;
  skills: string[];
};
export type DemoApplication = {
  id: string;
  candidate: string;
  email: string;
  jobId: string;
  jobTitle: string;
  stage: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
  score: number;
  notes: string[];
  version: number;
  aiMatch?: {
    matchedSkills: string[];
    missingSkills: string[];
    evidence: string[];
    explanation: string;
    provider: string;
  };
};
type Interview = {
  id: string;
  applicationId: string;
  candidate: string;
  startsAt: string;
  type: string;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED";
  score?: number;
};
type Message = {
  id: string;
  conversationId: string;
  sender: "candidate" | "recruiter";
  body: string;
  createdAt: string;
};
type Workflow = {
  jobs: DemoJob[];
  applications: DemoApplication[];
  interviews: Interview[];
  messages: Message[];
  createJob: (job: Omit<DemoJob, "id" | "applicants">) => string;
  setJobStatus: (id: string, status: DemoJob["status"]) => void;
  apply: (jobId: string) => boolean;
  move: (
    id: string,
    stage: DemoApplication["stage"],
    expectedVersion: number,
  ) => boolean;
  addNote: (id: string, note: string) => void;
  schedule: (input: Omit<Interview, "id" | "status">) => void;
  completeInterview: (id: string, score: number) => void;
  sendMessage: (
    conversationId: string,
    body: string,
    sender?: Message["sender"],
  ) => void;
};
export const useWorkflow = create<Workflow>((set, get) => ({
  jobs: [
    {
      id: "job-1",
      title: "Senior Product Designer",
      department: "Product",
      location: "TP. Hồ Chí Minh",
      type: "Toàn thời gian",
      status: "PUBLISHED",
      applicants: 48,
      skills: ["Figma", "UX Research", "Design Systems"],
    },
    {
      id: "job-2",
      title: "Frontend Engineer (React)",
      department: "Engineering",
      location: "Hybrid",
      type: "Toàn thời gian",
      status: "PUBLISHED",
      applicants: 36,
      skills: ["React", "TypeScript", "Testing"],
    },
    {
      id: "job-3",
      title: "Growth Marketing Lead",
      department: "Marketing",
      location: "Remote",
      type: "Toàn thời gian",
      status: "PAUSED",
      applicants: 24,
      skills: ["Growth", "Analytics"],
    },
  ],
  applications: [
    {
      id: "application-1",
      candidate: "Nguyễn Minh Anh",
      email: "candidate@hirehub.vn",
      jobId: "job-1",
      jobTitle: "Senior Product Designer",
      stage: "INTERVIEW",
      score: 94,
      notes: ["Portfolio có case study rất rõ ràng."],
      version: 2,
    },
    {
      id: "application-2",
      candidate: "Trần Gia Huy",
      email: "huy@example.com",
      jobId: "job-1",
      jobTitle: "Senior Product Designer",
      stage: "SCREENING",
      score: 89,
      notes: [],
      version: 1,
    },
    {
      id: "application-3",
      candidate: "Lê Thảo Vy",
      email: "vy@example.com",
      jobId: "job-2",
      jobTitle: "Frontend Engineer (React)",
      stage: "APPLIED",
      score: 86,
      notes: [],
      version: 0,
    },
  ],
  interviews: [
    {
      id: "interview-1",
      applicationId: "application-1",
      candidate: "Nguyễn Minh Anh",
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      type: "Portfolio review",
      status: "SCHEDULED",
    },
  ],
  messages: [
    {
      id: "m1",
      conversationId: "application-1",
      sender: "recruiter",
      body: "Chào Minh Anh, team muốn mời bạn tham gia portfolio review.",
      createdAt: new Date(Date.now() - 3600e3).toISOString(),
    },
    {
      id: "m2",
      conversationId: "application-1",
      sender: "candidate",
      body: "Cảm ơn chị, em xác nhận tham gia ạ.",
      createdAt: new Date().toISOString(),
    },
  ],
  createJob: (job) => {
    const id = `job-${Date.now()}`;
    set((s) => ({ jobs: [{ ...job, id, applicants: 0 }, ...s.jobs] }));
    return id;
  },
  setJobStatus: (id, status) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    })),
  apply: (jobId) => {
    const s = get();
    if (
      s.applications.some(
        (a) => a.jobId === jobId && a.email === "candidate@hirehub.vn",
      )
    )
      return false;
    const job = s.jobs.find((j) => j.id === jobId);
    if (!job) return false;
    set((x) => ({
      applications: [
        ...x.applications,
        {
          id: `application-${Date.now()}`,
          candidate: "Nguyễn Minh Anh",
          email: "candidate@hirehub.vn",
          jobId,
          jobTitle: job.title,
          stage: "APPLIED",
          score: 82,
          notes: [],
          version: 0,
        },
      ],
      jobs: x.jobs.map((j) =>
        j.id === jobId ? { ...j, applicants: j.applicants + 1 } : j,
      ),
    }));
    return true;
  },
  move: (id, stage, expectedVersion) => {
    const app = get().applications.find((a) => a.id === id);
    if (!app || app.version !== expectedVersion) return false;
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id ? { ...a, stage, version: a.version + 1 } : a,
      ),
    }));
    return true;
  },
  addNote: (id, note) =>
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id ? { ...a, notes: [...a.notes, note] } : a,
      ),
    })),
  schedule: (input) =>
    set((s) => ({
      interviews: [
        ...s.interviews,
        { ...input, id: `interview-${Date.now()}`, status: "SCHEDULED" },
      ],
      applications: s.applications.map((a) =>
        a.id === input.applicationId
          ? { ...a, stage: "INTERVIEW", version: a.version + 1 }
          : a,
      ),
    })),
  completeInterview: (id, score) =>
    set((s) => ({
      interviews: s.interviews.map((i) =>
        i.id === id ? { ...i, status: "COMPLETED", score } : i,
      ),
    })),
  sendMessage: (conversationId, body, sender = "recruiter") =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `m-${Date.now()}`,
          conversationId,
          sender,
          body,
          createdAt: new Date().toISOString(),
        },
      ],
    })),
}));
