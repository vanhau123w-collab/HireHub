import type { ApiError, ListResponse, SystemRole } from "@hirehub/shared";
import { useSession } from "./store";

const base = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
let refreshRequest: Promise<string | null> | null = null;

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public details: Partial<ApiError>,
  ) {
    super(details.message || "Request failed");
    this.name = "ApiRequestError";
  }
}

async function refreshAccessToken() {
  if (!refreshRequest)
    refreshRequest = fetch(`${base}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { accessToken: string };
        useSession.getState().updateToken(body.accessToken);
        return body.accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  return refreshRequest;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = useSession.getState().token;
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next) return api<T>(path, init, false);
    useSession.getState().logout();
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiError>;
    throw new ApiRequestError(response.status, {
      ...body,
      requestId:
        body.requestId || response.headers.get("x-request-id") || undefined,
    });
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: SystemRole;
    companyId?: string;
  };
};
export type ApiJob = {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  workplace: string;
  employmentType: string;
  description: string;
  requirements: string;
  status: string;
  company: { name: string; slug: string };
  skills: Array<{ name: string; required: boolean }>;
  _count?: { applications: number };
};
export type CandidateApplication = {
  id: string;
  stage: string;
  version: number;
  createdAt: string;
  job: ApiJob;
  history: Array<{
    id: string;
    fromStage?: string;
    toStage: string;
    createdAt: string;
  }>;
  interviews: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    meetingUrl?: string;
    status: string;
  }>;
  offer?: {
    id: string;
    salary: number;
    currency: string;
    startsAt: string;
    expiresAt: string;
    status: string;
  };
};

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role: "CANDIDATE" }),
    }),
  forgotPassword: (email: string) =>
    api<{ ok: boolean; token?: string }>("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    api<{ ok: boolean }>("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  requestVerification: (email: string) =>
    api<{ ok: boolean; token?: string }>("/auth/verify-email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyEmail: (token: string) =>
    api<{ ok: boolean }>("/auth/verify-email/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  me: () => api<AuthResponse["user"]>("/auth/me"),
  logoutAll: () => api<{ ok: boolean }>("/auth/logout-all", { method: "POST" }),
  refresh: async () => {
    const token = await refreshAccessToken();
    if (!token)
      throw new ApiRequestError(401, {
        message: "OAuth session could not be restored",
      });
    return token;
  },
  googleUrl: `${base}/auth/google`,
};
export const candidateApi = {
  jobs: (
    filters:
      | string
      | {
          q?: string;
          location?: string;
          workplace?: string;
          employmentType?: string;
          sort?: string;
        } = "",
  ) => {
    const value = typeof filters === "string" ? { q: filters } : filters;
    const params = new URLSearchParams(
      Object.entries(value).filter(([, entry]) => Boolean(entry)) as Array<
        [string, string]
      >,
    );
    return api<ListResponse<ApiJob>>(`/jobs${params.size ? `?${params}` : ""}`);
  },
  job: (id: string) =>
    api<
      ApiJob & {
        questions: Array<{
          id: string;
          prompt: string;
          required: boolean;
          position: number;
        }>;
      }
    >(`/jobs/${id}`),
  company: (slug: string) => api<Record<string, unknown>>(`/companies/${slug}`),
  applications: () => api<CandidateApplication[]>("/applications/mine"),
  profile: () => api<Record<string, unknown> | null>("/candidate-profile"),
  updateProfile: (data: Record<string, unknown>) =>
    api("/candidate-profile", { method: "PATCH", body: JSON.stringify(data) }),
  experiences: () =>
    api<Array<Record<string, unknown>>>("/candidate-experiences"),
  createExperience: (data: Record<string, unknown>) =>
    api("/candidate-experiences", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteExperience: (id: string) =>
    api<{ ok: boolean }>(`/candidate-experiences/${id}`, { method: "DELETE" }),
  educations: () =>
    api<Array<Record<string, unknown>>>("/candidate-educations"),
  createEducation: (data: Record<string, unknown>) =>
    api("/candidate-educations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteEducation: (id: string) =>
    api<{ ok: boolean }>(`/candidate-educations/${id}`, { method: "DELETE" }),
  resumes: () => api<Array<Record<string, unknown>>>("/resumes"),
  presignResume: (file: File) =>
    api<{
      objectKey: string;
      uploadUrl: string;
      method: string;
      headers: Record<string, string>;
    }>("/resumes/presign", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        mimeType: file.type,
        size: file.size,
      }),
    }),
  completeResume: (file: File, objectKey: string) =>
    api("/resumes/complete", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        objectKey,
        mimeType: file.type,
        size: file.size,
      }),
    }),
  savedJobs: () => api<Array<Record<string, unknown>>>("/saved-jobs"),
  saveJob: (jobId: string) => api(`/saved-jobs/${jobId}`, { method: "POST" }),
  unsaveJob: (jobId: string) =>
    api<{ ok: boolean }>(`/saved-jobs/${jobId}`, { method: "DELETE" }),
  apply: (input: {
    jobId: string;
    resumeId: string;
    coverLetter?: string;
    answers?: Array<{ questionId: string; answer: string }>;
  }) =>
    api("/applications", {
      method: "POST",
      body: JSON.stringify({ ...input, answers: input.answers || [] }),
    }),
  notifications: () =>
    api<
      Array<{
        id: string;
        title: string;
        body: string;
        link?: string;
        readAt?: string;
        createdAt: string;
      }>
    >("/notifications"),
  markNotificationRead: (id: string) =>
    api(`/notifications/${id}/read`, { method: "PATCH" }),
  respondInterview: (
    id: string,
    status: "CONFIRMED" | "RESCHEDULE_REQUESTED",
  ) =>
    api(`/interviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  respondOffer: (id: string, status: "ACCEPTED" | "DECLINED") =>
    api(`/offers/${id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  exportData: () => api<Record<string, unknown>>("/users/me/export"),
  deleteAccount: () => api<{ ok: boolean }>("/users/me", { method: "DELETE" }),
};

export type PipelineApplication = {
  id: string;
  stage: string;
  version: number;
  candidate: { id: string; name: string; email: string };
  job: { id: string; title: string };
  aiMatch?: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    evidence: string[];
    explanation: string;
    provider: string;
  };
  pipelineStage?: { label: string };
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
};
export const recruiterApi = {
  jobs: () => api<ApiJob[]>("/jobs/manage/all"),
  createJob: (data: Record<string, unknown>) =>
    api<ApiJob>("/jobs", { method: "POST", body: JSON.stringify(data) }),
  setJobStatus: (id: string, status: string) =>
    api<ApiJob>(`/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  pipeline: (jobId?: string) =>
    api<PipelineApplication[]>(
      `/applications/pipeline${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ""}`,
    ),
  applicationDetail: (id: string) =>
    api<Record<string, any>>(`/applications/${id}/detail`),
  resumeUrl: (id: string) =>
    api<{ url: string; expiresIn: number }>(`/applications/${id}/resume-url`),
  moveApplication: (id: string, stage: string, expectedVersion: number) =>
    api(`/applications/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ stage, expectedVersion }),
    }),
  bulkApplications: (data: {
    ids: string[];
    action: "MOVE" | "REJECT" | "TAG" | "ASSIGN";
    stage?: string;
    tagId?: string;
    memberId?: string;
  }) =>
    api<{ updated: number }>("/applications/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addNote: (id: string, body: string) =>
    api(`/applications/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  interviews: () => api<Array<Record<string, unknown>>>("/interviews"),
  scheduleInterview: (data: Record<string, unknown>) =>
    api("/interviews", { method: "POST", body: JSON.stringify(data) }),
  scorecard: (data: Record<string, unknown>) =>
    api("/scorecards", { method: "POST", body: JSON.stringify(data) }),
  conversations: () => api<Array<Record<string, unknown>>>("/conversations"),
  messages: (id: string) =>
    api<Array<Record<string, unknown>>>(`/conversations/${id}/messages`),
  sendMessage: (id: string, body: string) =>
    api(`/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  analytics: () =>
    api<{
      activeJobs: number;
      applications: number;
      upcomingInterviews: number;
      hires: number;
      conversion: number;
    }>("/analytics"),
  members: () => api<Array<Record<string, unknown>>>("/members"),
  tags: () => api<Array<Record<string, unknown>>>("/tags"),
  inviteMember: (email: string, role: "RECRUITER" | "COMPANY_ADMIN") =>
    api<{ id: string; expiresAt: string; token?: string }>("/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  updateMember: (id: string, data: Record<string, unknown>) =>
    api(`/members/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  companySettings: () => api<Record<string, unknown>>("/company-settings"),
  updateCompanySettings: (data: Record<string, unknown>) =>
    api("/company-settings", { method: "PATCH", body: JSON.stringify(data) }),
  billingCheckout: () =>
    api<{ mode?: string; url: string }>("/billing/checkout", {
      method: "POST",
    }),
  billingPortal: () =>
    api<{ mode?: string; url: string }>("/billing/portal", { method: "POST" }),
  createOffer: (data: {
    applicationId: string;
    salary: number;
    currency: string;
    startsAt: string;
    expiresAt: string;
  }) => api("/offers", { method: "POST", body: JSON.stringify(data) }),
};
export const adminApi = {
  summary: () =>
    api<{
      users: number;
      companies: number;
      jobs: number;
      applications: number;
      proSubscriptions: number;
      failedJobs: number;
    }>("/admin/summary"),
  companies: () => api<Array<Record<string, unknown>>>("/admin/companies"),
  companyStatus: (id: string, status: "PENDING" | "VERIFIED" | "SUSPENDED") =>
    api(`/admin/companies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  users: () => api<Array<Record<string, unknown>>>("/admin/users"),
  userStatus: (id: string, suspended: boolean) =>
    api(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ suspended }),
    }),
  jobs: () => api<Array<Record<string, unknown>>>("/admin/jobs"),
  jobStatus: (id: string, status: "PUBLISHED" | "PAUSED" | "CLOSED") =>
    api(`/admin/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  audit: () => api<Array<Record<string, unknown>>>("/admin/audit-logs"),
};
