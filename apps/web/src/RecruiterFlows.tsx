import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  Mail,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recruiterApi } from "./api";
import {
  useRecruiterAnalytics,
  useRecruiterInterviews,
  useRecruiterJobs,
  useRecruiterMessages,
  useRecruiterPipeline,
} from "./recruiterQueries";
import type { DemoApplication } from "./workflowStore";

const recruiterCopy = {
  vi: {
    createJob: "Tạo tin tuyển dụng",
    jobTitle: "Tên vị trí",
    department: "Phòng ban",
    location: "Địa điểm",
    employmentType: "Loại hình",
    skills: "Kỹ năng",
    comma: "Phân cách bằng dấu phẩy",
    cancel: "Hủy",
    saveDraft: "Lưu bản nháp",
    jobs: "Tin tuyển dụng",
    lifecycle: "Quản lý đầy đủ vòng đời xuất bản",
    loading: "Đang tải...",
    loadJobsError: "Không thể tải tin tuyển dụng.",
    applicants: "ứng viên",
    pause: "Tạm dừng",
    publish: "Đăng tin",
    details: "Chi tiết",
    candidateProfile: "Hồ sơ ứng viên",
    match: "phù hợp",
    internalNote: "Ghi chú nội bộ",
    saveNote: "Lưu ghi chú",
    interviews: "Phỏng vấn",
    interviewSubtitle: "Lên lịch, phản hồi ứng viên, scorecard và offer.",
    schedule: "Lên lịch",
    scorecard: "Phiếu đánh giá",
    sendOffer: "Gửi offer",
    completeScorecard: "Hoàn tất scorecard",
    scheduleInterview: "Lên lịch phỏng vấn",
    candidate: "Ứng viên",
    startTime: "Thời gian bắt đầu",
    meetingLink: "Link cuộc họp",
    confirmInterview: "Xác nhận phỏng vấn",
    structuredScorecard: "Scorecard có cấu trúc",
    score: "Điểm",
    evidence: "Bằng chứng và ghi chú",
    submitScorecard: "Gửi scorecard",
    monthlySalary: "Lương hàng tháng",
    offerHint:
      "Offer hết hạn sau 7 ngày và ngày bắt đầu dự kiến là 30 ngày kể từ hôm nay.",
    messages: "Tin nhắn",
    typeMessage: "Nhập tin nhắn...",
    send: "Gửi",
    analytics: "Phân tích tuyển dụng",
    activeJobs: "Tin đang tuyển",
    applications: "Đơn ứng tuyển",
    upcomingInterviews: "Phỏng vấn sắp tới",
    hireConversion: "Tỷ lệ tuyển",
    funnel: "Phễu tuyển dụng",
  },
  en: {
    createJob: "Create job",
    jobTitle: "Job title",
    department: "Department",
    location: "Location",
    employmentType: "Employment type",
    skills: "Skills",
    comma: "Comma separated",
    cancel: "Cancel",
    saveDraft: "Save draft",
    jobs: "Jobs",
    lifecycle: "Manage the complete publishing lifecycle",
    loading: "Loading...",
    loadJobsError: "Unable to load jobs.",
    applicants: "applicants",
    pause: "Pause",
    publish: "Publish",
    details: "Details",
    candidateProfile: "Candidate profile",
    match: "match",
    internalNote: "Internal note",
    saveNote: "Save note",
    interviews: "Interviews",
    interviewSubtitle: "Schedule, candidate response, scorecards and offers.",
    schedule: "Schedule",
    scorecard: "Scorecard",
    sendOffer: "Send offer",
    completeScorecard: "Complete scorecard",
    scheduleInterview: "Schedule interview",
    candidate: "Candidate",
    startTime: "Start time",
    meetingLink: "Meeting link",
    confirmInterview: "Confirm interview",
    structuredScorecard: "Structured scorecard",
    score: "Score",
    evidence: "Evidence and notes",
    submitScorecard: "Submit scorecard",
    monthlySalary: "Monthly salary",
    offerHint:
      "The offer expires in 7 days and the proposed start date is 30 days from today.",
    messages: "Messages",
    typeMessage: "Type a message...",
    send: "Send",
    analytics: "Recruitment analytics",
    activeJobs: "Active jobs",
    applications: "Applications",
    upcomingInterviews: "Upcoming interviews",
    hireConversion: "Hire conversion",
    funnel: "Recruitment funnel",
  },
} as const;
function useRecruiterCopy() {
  const { i18n } = useTranslation();
  return recruiterCopy[i18n.resolvedLanguage?.startsWith("en") ? "en" : "vi"];
}

export function CreateJobButton() {
  const copy = useRecruiterCopy();
  const [opened, setOpened] = useState(false),
    { create } = useRecruiterJobs();
  const [form, setForm] = useState({
    title: "",
    department: "Product",
    location: "Ho Chi Minh City",
    type: "Full time",
    skills: "",
  });
  const submit = () => {
    if (form.title.trim().length < 3)
      return notifications.show({
        color: "red",
        message: "Job title must contain at least 3 characters",
      });
    create.mutate(
      {
        ...form,
        skills: form.skills
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          setOpened(false);
          notifications.show({ color: "teal", message: "Draft job created" });
        },
        onError: (error) =>
          notifications.show({ color: "red", message: error.message }),
      },
    );
  };
  return (
    <>
      <Button leftSection={<Plus size={16} />} onClick={() => setOpened(true)}>
        {copy.createJob}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={copy.createJob}
        size="lg"
      >
        <Stack>
          <TextInput
            label={copy.jobTitle}
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.currentTarget.value })
            }
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label={copy.department}
              data={["Product", "Engineering", "Marketing", "Operations"]}
              value={form.department}
              onChange={(value) =>
                setForm({ ...form, department: value || "Product" })
              }
            />
            <TextInput
              label={copy.location}
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.currentTarget.value })
              }
            />
          </SimpleGrid>
          <Select
            label={copy.employmentType}
            data={["Full time", "Part time", "Contract", "Internship"]}
            value={form.type}
            onChange={(value) =>
              setForm({ ...form, type: value || "Full time" })
            }
          />
          <TextInput
            label={copy.skills}
            description={copy.comma}
            value={form.skills}
            onChange={(event) =>
              setForm({ ...form, skills: event.currentTarget.value })
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              {copy.cancel}
            </Button>
            <Button loading={create.isPending} onClick={submit}>
              {copy.saveDraft}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export function RecruiterJobs() {
  const copy = useRecruiterCopy();
  const { jobs, status, isLoading, isError, online } = useRecruiterJobs();
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>{copy.jobs}</Title>
          <Text c="dimmed" size="sm">
            {copy.lifecycle} · {online ? "API" : "Local demo"}
          </Text>
        </div>
        <CreateJobButton />
      </Group>
      {isLoading ? (
        <Text>{copy.loading}</Text>
      ) : isError ? (
        <Text c="red">{copy.loadJobsError}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {jobs.map((job) => (
            <Card key={job.id} withBorder>
              <Group justify="space-between">
                <Badge color={job.status === "PUBLISHED" ? "teal" : "gray"}>
                  {job.status}
                </Badge>
                <Text size="xs" c="dimmed">
                  {job.applicants} {copy.applicants}
                </Text>
              </Group>
              <Title order={4} mt="md">
                {job.title}
              </Title>
              <Text size="sm" c="dimmed">
                {job.department} · {job.location}
              </Text>
              <Group gap={5} mt="md">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="outline" color="gray">
                    {skill}
                  </Badge>
                ))}
              </Group>
              <Group grow mt="xl">
                <Button
                  loading={status.isPending}
                  variant="default"
                  onClick={() =>
                    status.mutate({
                      id: job.id,
                      status:
                        job.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED",
                    })
                  }
                >
                  {job.status === "PUBLISHED" ? copy.pause : copy.publish}
                </Button>
                <Button variant="light">{copy.details}</Button>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

export function CandidateDrawer({
  application,
  opened,
  onClose,
}: {
  application: DemoApplication | null;
  opened: boolean;
  onClose: () => void;
}) {
  const copy = useRecruiterCopy();
  const [text, setText] = useState("");
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ["recruiter", "application", application?.id],
    queryFn: () => recruiterApi.applicationDetail(application!.id),
    enabled: opened && Boolean(application),
  });
  const resume = useMutation({
    mutationFn: () => recruiterApi.resumeUrl(application!.id),
    onSuccess: (result) =>
      window.open(result.url, "_blank", "noopener,noreferrer"),
  });
  const note = useMutation({
    mutationFn: () =>
      application
        ? recruiterApi.addNote(application.id, text)
        : Promise.resolve(),
    onSuccess: () => {
      setText("");
      client.invalidateQueries({ queryKey: ["recruiter", "pipeline"] });
      notifications.show({ color: "teal", message: "Note saved" });
    },
  });
  if (!application) return null;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={copy.candidateProfile}
      size="lg"
    >
      <Stack>
        <Title order={3}>{application.candidate}</Title>
        <Text c="dimmed">{application.email}</Text>
        <Badge w="fit-content">
          {application.score}% {copy.match}
        </Badge>
        {detail.isLoading && <Text c="dimmed">{copy.loading}</Text>}
        {detail.data && (
          <>
            <Card withBorder>
              <Text fw={700}>
                {detail.data.candidate?.candidateProfile?.headline ||
                  copy.candidateProfile}
              </Text>
              <Text size="sm" c="dimmed">
                {detail.data.candidate?.candidateProfile?.location}
              </Text>
              <Text size="sm" mt="sm">
                {detail.data.candidate?.candidateProfile?.bio}
              </Text>
              <Group gap={5} mt="sm">
                {(detail.data.candidate?.candidateProfile?.skills || []).map(
                  (skill: string) => (
                    <Badge key={skill} variant="light">
                      {skill}
                    </Badge>
                  ),
                )}
              </Group>
            </Card>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Card withBorder>
                <Text fw={700}>Experience</Text>
                {(detail.data.candidate?.candidateExperiences || []).map(
                  (item: any) => (
                    <Text size="sm" mt="xs" key={item.id}>
                      {item.title} · {item.company}
                    </Text>
                  ),
                )}
              </Card>
              <Card withBorder>
                <Text fw={700}>Education</Text>
                {(detail.data.candidate?.candidateEducations || []).map(
                  (item: any) => (
                    <Text size="sm" mt="xs" key={item.id}>
                      {item.degree} · {item.school}
                    </Text>
                  ),
                )}
              </Card>
            </SimpleGrid>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text fw={700}>{detail.data.resume?.name}</Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(Number(detail.data.resume?.size || 0) / 1024)}{" "}
                    KB · PDF
                  </Text>
                </div>
                <Button
                  size="xs"
                  loading={resume.isPending}
                  onClick={() => resume.mutate()}
                >
                  Preview resume
                </Button>
              </Group>
              {detail.data.resume?.extractedText && (
                <Text size="xs" c="dimmed" mt="sm" lineClamp={4}>
                  {detail.data.resume.extractedText}
                </Text>
              )}
            </Card>
            <Card withBorder>
              <Text fw={700}>Activity timeline</Text>
              {(detail.data.history || []).map((item: any) => (
                <Text size="xs" c="dimmed" mt="xs" key={item.id}>
                  {new Date(item.createdAt).toLocaleString()} ·{" "}
                  {item.fromStage || "—"} → {item.toStage}
                </Text>
              ))}
            </Card>
          </>
        )}
        {application.aiMatch && (
          <Card withBorder>
            <Group justify="space-between">
              <Text fw={700}>Explainable matching</Text>
              <Badge variant="outline">{application.aiMatch.provider}</Badge>
            </Group>
            <Text size="sm" c="dimmed" mt="sm">
              {application.aiMatch.explanation}
            </Text>
            <Text size="xs" fw={700} mt="md">
              Matched skills
            </Text>
            <Group gap={6} mt={5}>
              {application.aiMatch.matchedSkills.map((skill) => (
                <Badge key={skill} color="teal" variant="light">
                  {skill}
                </Badge>
              ))}
            </Group>
            <Text size="xs" fw={700} mt="md">
              Missing skills
            </Text>
            <Group gap={6} mt={5}>
              {application.aiMatch.missingSkills.map((skill) => (
                <Badge key={skill} color="orange" variant="light">
                  {skill}
                </Badge>
              ))}
            </Group>
            {application.aiMatch.evidence.length > 0 && (
              <Stack gap={4} mt="md">
                {application.aiMatch.evidence.map((item) => (
                  <Text size="xs" key={item}>
                    • {item}
                  </Text>
                ))}
              </Stack>
            )}
            <Text size="xs" c="dimmed" mt="md">
              Advisory signal only — never used for automatic rejection.
            </Text>
          </Card>
        )}
        <Textarea
          label={copy.internalNote}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
        />
        <Button
          loading={note.isPending}
          disabled={!text.trim()}
          onClick={() => note.mutate()}
        >
          {copy.saveNote}
        </Button>
      </Stack>
    </Modal>
  );
}

export function Interviews() {
  const copy = useRecruiterCopy();
  const flow = useRecruiterInterviews(),
    { applications } = useRecruiterPipeline();
  const [open, setOpen] = useState(false),
    [scoreOpen, setScoreOpen] = useState<string | null>(null),
    [offerApplication, setOfferApplication] = useState<string | null>(null),
    [applicationId, setApplicationId] = useState<string | null>(null),
    [date, setDate] = useState<string | null>(
      new Date(Date.now() + 864e5).toISOString(),
    ),
    [meetingUrl, setMeetingUrl] = useState(
      "https://meet.google.com/demo-hirehub",
    ),
    [score, setScore] = useState<number | string>(4),
    [notes, setNotes] = useState(""),
    [salary, setSalary] = useState<number | string>(45000000);
  const offer = useMutation({
    mutationFn: () =>
      recruiterApi.createOffer({
        applicationId: offerApplication!,
        salary: Number(salary),
        currency: "VND",
        startsAt: new Date(Date.now() + 30 * 864e5).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      }),
    onSuccess: () => {
      setOfferApplication(null);
      notifications.show({
        color: "teal",
        message: "Offer sent and candidate notified",
      });
    },
  });
  const schedule = () => {
    if (!applicationId || !date) return;
    flow.schedule.mutate(
      { applicationId, startsAt: new Date(date).toISOString(), meetingUrl },
      {
        onSuccess: () => {
          setOpen(false);
          notifications.show({
            color: "teal",
            message: "Interview scheduled and candidate notified",
          });
        },
        onError: (error) =>
          notifications.show({ color: "red", message: error.message }),
      },
    );
  };
  const submitScore = () => {
    if (!scoreOpen) return;
    flow.score.mutate(
      { interviewId: scoreOpen, score: Number(score), notes },
      {
        onSuccess: () => {
          setScoreOpen(null);
          setNotes("");
          notifications.show({ color: "teal", message: "Scorecard submitted" });
        },
      },
    );
  };
  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>{copy.interviews}</Title>
          <Text c="dimmed" size="sm">
            {copy.interviewSubtitle}
          </Text>
        </div>
        <Button leftSection={<Plus size={16} />} onClick={() => setOpen(true)}>
          {copy.schedule}
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {flow.interviews.map((interview) => (
          <Card key={interview.id} withBorder>
            <Group justify="space-between">
              <Badge
                color={interview.status === "COMPLETED" ? "teal" : "violet"}
              >
                {interview.status}
              </Badge>
              <Text size="xs" c="dimmed">
                {new Date(interview.startsAt).toLocaleString()}
              </Text>
            </Group>
            <Title order={4} mt="md">
              {interview.candidate}
            </Title>
            <Text size="sm" c="dimmed">
              {interview.type}
            </Text>
            {interview.score ? (
              <Group mt="md" justify="space-between">
                <Text fw={700}>
                  {copy.scorecard}: {interview.score}/5
                </Text>
                <Button
                  size="xs"
                  color="teal"
                  onClick={() => setOfferApplication(interview.applicationId)}
                >
                  {copy.sendOffer}
                </Button>
              </Group>
            ) : (
              <Button
                mt="md"
                variant="light"
                onClick={() => setScoreOpen(interview.id)}
              >
                {copy.completeScorecard}
              </Button>
            )}
          </Card>
        ))}
      </SimpleGrid>
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={copy.scheduleInterview}
      >
        <Stack>
          <Select
            label={copy.candidate}
            data={applications.map((app) => ({
              value: app.id,
              label: `${app.candidate} — ${app.jobTitle}`,
            }))}
            value={applicationId}
            onChange={setApplicationId}
          />
          <DateTimePicker
            label={copy.startTime}
            value={date}
            onChange={setDate}
          />
          <TextInput
            label={copy.meetingLink}
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.currentTarget.value)}
          />
          <Button loading={flow.schedule.isPending} onClick={schedule}>
            {copy.confirmInterview}
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(scoreOpen)}
        onClose={() => setScoreOpen(null)}
        title={copy.structuredScorecard}
      >
        <Stack>
          <NumberInput
            label={copy.score}
            min={1}
            max={5}
            value={score}
            onChange={setScore}
          />
          <Textarea
            label={copy.evidence}
            minRows={4}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          <Button loading={flow.score.isPending} onClick={submitScore}>
            {copy.submitScorecard}
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(offerApplication)}
        onClose={() => setOfferApplication(null)}
        title={copy.sendOffer}
      >
        <Stack>
          <NumberInput
            label={copy.monthlySalary}
            min={0}
            thousandSeparator=","
            value={salary}
            onChange={setSalary}
          />
          <TextInput label="Currency" value="VND" readOnly />
          <Text size="xs" c="dimmed">
            {copy.offerHint}
          </Text>
          <Button
            color="teal"
            loading={offer.isPending}
            onClick={() => offer.mutate()}
          >
            {copy.sendOffer}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

export function Messages() {
  const copy = useRecruiterCopy();
  const [selected, setSelected] = useState(""),
    [text, setText] = useState("");
  const flow = useRecruiterMessages(selected);
  const current = selected || flow.threads[0]?.id || "";
  if (!selected && current) queueMicrotask(() => setSelected(current));
  const submit = () => {
    if (!text.trim() || !current) return;
    flow.send.mutate(text.trim(), { onSuccess: () => setText("") });
  };
  return (
    <div className="message-layout">
      <Card withBorder className="conversation-list">
        <Title order={4} mb="md">
          {copy.messages}
        </Title>
        {flow.threads.map((thread) => (
          <button
            className={
              current === thread.id ? "conversation active" : "conversation"
            }
            onClick={() => setSelected(thread.id)}
            key={thread.id}
          >
            <b>{thread.candidate}</b>
            <span>{thread.jobTitle}</span>
          </button>
        ))}
      </Card>
      <Card withBorder className="chat-panel">
        <div className="chat-messages">
          {flow.rows.map((message) => (
            <div key={message.id} className={`chat-bubble ${message.sender}`}>
              <span>{message.body}</span>
              <small>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          ))}
        </div>
        <Group mt="md">
          <TextInput
            style={{ flex: 1 }}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder={copy.typeMessage}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
          <Button
            loading={flow.send.isPending}
            aria-label={copy.send}
            onClick={submit}
          >
            <Send size={16} />
          </Button>
        </Group>
      </Card>
    </div>
  );
}

export function Analytics() {
  const copy = useRecruiterCopy();
  const api = useRecruiterAnalytics(),
    { applications } = useRecruiterPipeline(),
    { jobs } = useRecruiterJobs();
  const data = api.data || {
    activeJobs: jobs.filter((job) => job.status === "PUBLISHED").length,
    applications: applications.length,
    upcomingInterviews: 0,
    hires: applications.filter((app) => app.stage === "HIRED").length,
    conversion: applications.length
      ? Math.round(
          (applications.filter((app) => app.stage === "HIRED").length /
            applications.length) *
            100,
        )
      : 0,
  };
  const stages = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"];
  return (
    <Stack>
      <Title order={2}>{copy.analytics}</Title>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Metric label={copy.activeJobs} value={data.activeJobs} />
        <Metric label={copy.applications} value={data.applications} />
        <Metric
          label={copy.upcomingInterviews}
          value={data.upcomingInterviews}
        />
        <Metric label={copy.hireConversion} value={`${data.conversion}%`} />
      </SimpleGrid>
      <Card withBorder>
        <Title order={4}>{copy.funnel}</Title>
        <div className="funnel-bars">
          {stages.map((stage, index) => {
            const count = applications.filter(
              (app) =>
                stages.indexOf(app.stage) >= index && app.stage !== "REJECTED",
            ).length;
            return (
              <div key={stage}>
                <span>{stage}</span>
                <i
                  style={{
                    width: `${Math.max(8, applications.length ? (count / applications.length) * 100 : 8)}%`,
                  }}
                />
                <b>{count}</b>
              </div>
            );
          })}
        </div>
      </Card>
    </Stack>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card withBorder>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={2}>{value}</Title>
    </Card>
  );
}

export function RecruiterSettings() {
  const { i18n } = useTranslation(),
    english = i18n.resolvedLanguage?.startsWith("en");
  const client = useQueryClient();
  const company = useQuery({
    queryKey: ["recruiter", "company-settings"],
    queryFn: recruiterApi.companySettings,
  });
  const members = useQuery({
    queryKey: ["recruiter", "members"],
    queryFn: recruiterApi.members,
  });
  const [companyForm, setCompanyForm] = useState({
    name: "Nexa Studio",
    website: "https://nexa.example",
    description: "",
  });
  const [inviteOpened, setInviteOpened] = useState(false);
  const [invite, setInvite] = useState({
    email: "",
    role: "RECRUITER" as "RECRUITER" | "COMPANY_ADMIN",
  });
  const saveCompany = useMutation({
    mutationFn: () => recruiterApi.updateCompanySettings(companyForm),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["recruiter", "company-settings"] });
      notifications.show({
        color: "teal",
        message: english ? "Company settings saved" : "Đã lưu cài đặt công ty",
      });
    },
  });
  const sendInvite = useMutation({
    mutationFn: () => recruiterApi.inviteMember(invite.email, invite.role),
    onSuccess: (result) => {
      setInviteOpened(false);
      setInvite({ email: "", role: "RECRUITER" });
      notifications.show({
        color: "teal",
        message: result.token
          ? `${english ? "Demo invitation code" : "Mã mời demo"}: ${result.token}`
          : english
            ? "Invitation sent"
            : "Đã gửi lời mời",
      });
    },
  });
  const updateMember = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      recruiterApi.updateMember(id, data),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["recruiter", "members"] }),
  });
  const billing = useMutation({
    mutationFn: async () => {
      const plan = (company.data?.subscription as { plan?: string } | undefined)
        ?.plan;
      return plan === "PRO"
        ? recruiterApi.billingPortal()
        : recruiterApi.billingCheckout();
    },
    onSuccess: (result) => window.location.assign(result.url),
  });
  const changeLanguage = async (value: string | null) => {
    if (value) {
      localStorage.setItem("language", value);
      await i18n.changeLanguage(value);
    }
  };
  return (
    <Stack>
      <Title order={2}>
        {english ? "Workspace settings" : "Cài đặt workspace"}
      </Title>
      <Tabs defaultValue="company">
        <Tabs.List>
          <Tabs.Tab value="company" leftSection={<Settings size={14} />}>
            {english ? "Company" : "Công ty"}
          </Tabs.Tab>
          <Tabs.Tab value="team" leftSection={<UsersRound size={14} />}>
            {english ? "Members" : "Thành viên"}
          </Tabs.Tab>
          <Tabs.Tab value="billing" leftSection={<ShieldCheck size={14} />}>
            {english ? "Plan" : "Gói dịch vụ"}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="company" pt="lg">
          <Card withBorder>
            <Stack>
              <TextInput
                label={english ? "Company name" : "Tên công ty"}
                value={companyForm.name}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    name: event.currentTarget.value,
                  })
                }
              />
              <TextInput
                label="Website"
                value={companyForm.website}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    website: event.currentTarget.value,
                  })
                }
              />
              <Textarea
                label={english ? "Company description" : "Giới thiệu công ty"}
                value={companyForm.description}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    description: event.currentTarget.value,
                  })
                }
              />
              <Select
                label={english ? "Default language" : "Ngôn ngữ mặc định"}
                value={english ? "en" : "vi"}
                onChange={changeLanguage}
                allowDeselect={false}
                data={[
                  { value: "vi", label: "Tiếng Việt" },
                  { value: "en", label: "English" },
                ]}
              />
              <Switch
                label={
                  english
                    ? "Allow candidates to request rescheduling"
                    : "Cho phép ứng viên yêu cầu đổi lịch"
                }
                defaultChecked
              />
              <Button
                w="fit-content"
                loading={saveCompany.isPending}
                onClick={() => saveCompany.mutate()}
              >
                {english ? "Save changes" : "Lưu thay đổi"}
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="team" pt="lg">
          <Card withBorder>
            <Stack>
              {members.isLoading ? (
                <Text>{english ? "Loading..." : "Đang tải..."}</Text>
              ) : (
                (members.data || []).map((row) => {
                  const user = row.user as
                    { name?: string; email?: string } | undefined;
                  const status = String(row.status);
                  return (
                    <Group
                      key={String(row.id)}
                      justify="space-between"
                      align="end"
                    >
                      <div>
                        <Text fw={700}>{user?.name}</Text>
                        <Text size="sm" c="dimmed">
                          {user?.email}
                        </Text>
                      </div>
                      <Select
                        w={170}
                        size="xs"
                        label={english ? "Role" : "Vai trò"}
                        value={String(row.role)}
                        data={[
                          { value: "RECRUITER", label: "Recruiter" },
                          { value: "COMPANY_ADMIN", label: "Company Admin" },
                        ]}
                        onChange={(role) =>
                          role &&
                          updateMember.mutate({
                            id: String(row.id),
                            data: { role },
                          })
                        }
                      />
                      <Button
                        size="xs"
                        color={status === "ACTIVE" ? "red" : "teal"}
                        variant="light"
                        loading={updateMember.isPending}
                        onClick={() =>
                          updateMember.mutate({
                            id: String(row.id),
                            data: {
                              status:
                                status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                            },
                          })
                        }
                      >
                        {status === "ACTIVE"
                          ? english
                            ? "Disable"
                            : "Vô hiệu hóa"
                          : english
                            ? "Enable"
                            : "Kích hoạt"}
                      </Button>
                    </Group>
                  );
                })
              )}
            </Stack>
            <Button
              mt="lg"
              variant="light"
              leftSection={<Mail size={15} />}
              onClick={() => setInviteOpened(true)}
            >
              {english ? "Invite member" : "Mời thành viên"}
            </Button>
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="billing" pt="lg">
          <Card withBorder>
            <Badge>
              {String(
                (company.data?.subscription as { plan?: string } | undefined)
                  ?.plan || "FREE",
              )}
            </Badge>
            <Title order={3} mt="sm">
              HireHub Pro
            </Title>
            <Text c="dimmed">
              {english
                ? "Unlimited jobs, analytics and explainable matching."
                : "Không giới hạn tin tuyển dụng, analytics và matching có giải thích."}
            </Text>
            <Button
              mt="lg"
              loading={billing.isPending}
              onClick={() => billing.mutate()}
            >
              {english ? "Manage billing" : "Quản lý thanh toán"}
            </Button>
          </Card>
        </Tabs.Panel>
      </Tabs>
      <Modal
        opened={inviteOpened}
        onClose={() => setInviteOpened(false)}
        title={english ? "Invite a teammate" : "Mời thành viên"}
      >
        <Stack>
          <TextInput
            required
            type="email"
            label="Email"
            value={invite.email}
            onChange={(event) =>
              setInvite({ ...invite, email: event.currentTarget.value })
            }
          />
          <Select
            label={english ? "Role" : "Vai trò"}
            value={invite.role}
            onChange={(value) =>
              setInvite({
                ...invite,
                role: (value || "RECRUITER") as "RECRUITER" | "COMPANY_ADMIN",
              })
            }
            data={[
              { value: "RECRUITER", label: "Recruiter" },
              { value: "COMPANY_ADMIN", label: "Company Admin" },
            ]}
          />
          <Button
            disabled={!invite.email.includes("@")}
            loading={sendInvite.isPending}
            onClick={() => sendInvite.mutate()}
          >
            {english ? "Send invitation" : "Gửi lời mời"}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
