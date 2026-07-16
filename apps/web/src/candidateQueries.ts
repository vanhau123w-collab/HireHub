import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { candidateApi, type ApiJob, type CandidateApplication } from "./api";
import { useSession } from "./store";
import {
  useWorkflow,
  type DemoApplication,
  type DemoJob,
} from "./workflowStore";

const mapJob = (job: ApiJob): DemoJob => ({
  id: job.id,
  title: job.title,
  department: job.department,
  location: job.location,
  type: job.employmentType,
  status: job.status as DemoJob["status"],
  applicants: job._count?.applications || 0,
  skills: job.skills.map((skill) => skill.name),
});
const mapApplication = (app: CandidateApplication): DemoApplication => ({
  id: app.id,
  candidate: "Nguyễn Minh Anh",
  email: "candidate@hirehub.vn",
  jobId: app.job.id,
  jobTitle: app.job.title,
  stage: app.stage as DemoApplication["stage"],
  score: 0,
  notes: [],
  version: app.version,
});

export function useCandidateJobs(
  query:
    | string
    | {
        q?: string;
        location?: string;
        workplace?: string;
        employmentType?: string;
        sort?: string;
      } = "",
) {
  const online = Boolean(useSession((s) => s.token));
  const fallback = useWorkflow((s) => s.jobs);
  const result = useQuery({
    queryKey: ["candidate", "jobs", query],
    queryFn: () => candidateApi.jobs(query),
    enabled: online,
    staleTime: 30_000,
  });
  const filters = typeof query === "string" ? { q: query } : query;
  const local = fallback.filter(
    (job) =>
      (!filters.q ||
        `${job.title} ${job.department} ${job.skills.join(" ")}`
          .toLowerCase()
          .includes(filters.q.toLowerCase())) &&
      (!filters.employmentType ||
        job.type === filters.employmentType ||
        job.type.toUpperCase().replaceAll(" ", "_") === filters.employmentType),
  );
  return {
    ...result,
    online,
    jobs: online
      ? (result.data?.data || []).map(mapJob)
      : filters.sort === "title"
        ? [...local].sort((a, b) => a.title.localeCompare(b.title))
        : local,
  };
}

export function useCandidateApplications() {
  const online = Boolean(useSession((s) => s.token)),
    queryClient = useQueryClient();
  const fallback = useWorkflow((s) => s.applications).filter(
    (app) => app.email === "candidate@hirehub.vn",
  );
  const result = useQuery({
    queryKey: ["candidate", "applications"],
    queryFn: candidateApi.applications,
    enabled: online,
  });
  const respondInterview = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "CONFIRMED" | "RESCHEDULE_REQUESTED";
    }) => candidateApi.respondInterview(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["candidate", "applications"],
      }),
  });
  const respondOffer = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "ACCEPTED" | "DECLINED";
    }) => candidateApi.respondOffer(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["candidate", "applications"],
      }),
  });
  return {
    ...result,
    online,
    raw: result.data || [],
    applications: online ? (result.data || []).map(mapApplication) : fallback,
    respondInterview,
    respondOffer,
  };
}

export function useCandidateSavedJobs() {
  const online = Boolean(useSession((s) => s.token));
  const result = useQuery({
    queryKey: ["candidate", "saved-jobs"],
    queryFn: candidateApi.savedJobs,
    enabled: online,
  });
  const jobs = online
    ? (result.data || []).map((row) => mapJob((row as { job: ApiJob }).job))
    : [];
  return { ...result, online, jobs };
}

export function useCandidateActions() {
  const online = Boolean(useSession((s) => s.token)),
    queryClient = useQueryClient();
  const localApply = useWorkflow((s) => s.apply);
  const resumes = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: candidateApi.resumes,
    enabled: online,
  });
  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!online) {
        if (!localApply(jobId)) throw new Error("DUPLICATE");
        return;
      }
      const resume =
        resumes.data?.find((item) => item.isDefault) || resumes.data?.[0];
      if (!resume?.id) throw new Error("RESUME_REQUIRED");
      await candidateApi.apply({ jobId, resumeId: String(resume.id) });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["candidate", "applications"],
      }),
  });
  const applyDetailed = useMutation({
    mutationFn: async (input: {
      jobId: string;
      resumeId?: string;
      coverLetter?: string;
      answers: Array<{ questionId: string; answer: string }>;
    }) => {
      if (!online) {
        if (!localApply(input.jobId)) throw new Error("DUPLICATE");
        return;
      }
      const resumeId =
        input.resumeId ||
        String(
          (resumes.data?.find((item) => item.isDefault) || resumes.data?.[0])
            ?.id || "",
        );
      if (!resumeId) throw new Error("RESUME_REQUIRED");
      await candidateApi.apply({ ...input, resumeId });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["candidate", "applications"],
      }),
  });
  const saveMutation = useMutation({
    mutationFn: ({ jobId, saved }: { jobId: string; saved: boolean }) =>
      saved ? candidateApi.unsaveJob(jobId) : candidateApi.saveJob(jobId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "saved-jobs"] }),
  });
  return { online, resumes, applyMutation, applyDetailed, saveMutation };
}

export function useCandidateProfileData() {
  const online = Boolean(useSession((s) => s.token)),
    queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: candidateApi.profile,
    enabled: online,
  });
  const resumes = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: candidateApi.resumes,
    enabled: online,
  });
  const experiences = useQuery({
    queryKey: ["candidate", "experiences"],
    queryFn: candidateApi.experiences,
    enabled: online,
  });
  const educations = useQuery({
    queryKey: ["candidate", "educations"],
    queryFn: candidateApi.educations,
    enabled: online,
  });
  const update = useMutation({
    mutationFn: candidateApi.updateProfile,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "profile"] }),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.type !== "application/pdf" || file.size > 5_000_000)
        throw new Error("INVALID_FILE");
      const signed = await candidateApi.presignResume(file);
      const response = await fetch(signed.uploadUrl, {
        method: signed.method || "PUT",
        headers: signed.headers,
        body: file,
      });
      if (!response.ok) throw new Error("UPLOAD_FAILED");
      return candidateApi.completeResume(file, signed.objectKey);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] }),
  });
  const createExperience = useMutation({
    mutationFn: candidateApi.createExperience,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "experiences"] }),
  });
  const deleteExperience = useMutation({
    mutationFn: candidateApi.deleteExperience,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "experiences"] }),
  });
  const createEducation = useMutation({
    mutationFn: candidateApi.createEducation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "educations"] }),
  });
  const deleteEducation = useMutation({
    mutationFn: candidateApi.deleteEducation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", "educations"] }),
  });
  return {
    online,
    profile,
    resumes,
    experiences,
    educations,
    update,
    upload,
    createExperience,
    deleteExperience,
    createEducation,
    deleteEducation,
  };
}
