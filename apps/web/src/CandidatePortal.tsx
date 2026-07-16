import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Bookmark,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { Preferences } from "./Preferences";
import { UserMenu } from "./UserMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { useSession } from "./store";
import { type DemoApplication, type DemoJob } from "./workflowStore";
import {
  useCandidateActions,
  useCandidateApplications,
  useCandidateJobs,
  useCandidateProfileData,
  useCandidateSavedJobs,
} from "./candidateQueries";
import { candidateApi } from "./api";
import { useQuery } from "@tanstack/react-query";

const resources = {
  vi: {
    overview: "Tổng quan",
    jobs: "Việc làm",
    applications: "Đơn ứng tuyển",
    saved: "Đã lưu",
    profile: "Hồ sơ",
    logout: "Đăng xuất",
    workspace: "Không gian ứng viên",
    notifications: "Thông báo",
    hello: "CHÀO MINH ANH",
    hero: "Tìm một nơi phù hợp để làm việc tốt.",
    heroText:
      "Không chạy theo số lượng. Tập trung vào cơ hội phù hợp với kỹ năng và mục tiêu của bạn.",
    explore: "Khám phá việc làm",
    completion: "Mức hoàn thiện hồ sơ",
    completionText:
      "Thêm portfolio để hiring team hiểu rõ cách bạn giải quyết vấn đề.",
    completeProfile: "Hoàn thiện hồ sơ",
    recommended: "Gợi ý cho bạn",
    basedOn: "Dựa trên hồ sơ Product Designer",
    viewAll: "Xem tất cả",
    recent: "Tiến trình gần đây",
    opportunities: "cơ hội đang mở",
    searchPlaceholder: "Vị trí, kỹ năng hoặc phòng ban",
    details: "Chi tiết",
    apply: "Ứng tuyển",
    applied: "Ứng tuyển thành công",
    appliedText: "Hồ sơ đã xuất hiện trong pipeline của recruiter.",
    duplicate: "Bạn đã ứng tuyển vị trí này.",
    trackTitle: "Theo dõi từng bước mà không phải chờ email rời rạc.",
    emptyApplications: "Bạn chưa ứng tuyển vị trí nào.",
    position: "Vị trí",
    company: "Doanh nghiệp",
    status: "Trạng thái",
    match: "Độ phù hợp",
    savedTitle: "Việc làm đã lưu",
    savedText: "Quay lại khi bạn sẵn sàng ứng tuyển.",
    profileTitle: "Hồ sơ ứng viên",
    profileText: "Thông tin recruiter thực sự cần để đánh giá hồ sơ.",
    saveChanges: "Lưu thay đổi",
    savedProfile: "Đã lưu hồ sơ",
    information: "Thông tin",
    resume: "CV",
    privacy: "Quyền riêng tư",
    fullName: "Họ và tên",
    title: "Chức danh",
    location: "Địa điểm",
    about: "Giới thiệu",
    skills: "Kỹ năng",
    uploadResume: "Tải CV mới",
    uploadHelp: "PDF, tối đa 5 MB",
    processed: "Đã xử lý",
    privacyTitle: "Quyền riêng tư hồ sơ",
    privacyText:
      "Chỉ doanh nghiệp có đơn ứng tuyển của bạn mới được xem CV và thông tin liên hệ.",
    exportData: "Tải dữ liệu cá nhân",
    exportDone: "Đã tạo tệp dữ liệu của bạn",
    deleteAccount: "Xóa tài khoản",
    deleteConfirm:
      "Thao tác này sẽ đăng xuất và vô hiệu hóa tài khoản. Bạn có chắc không?",
  },
  en: {
    overview: "Overview",
    jobs: "Jobs",
    applications: "Applications",
    saved: "Saved jobs",
    profile: "Profile",
    logout: "Log out",
    workspace: "Candidate workspace",
    notifications: "Notifications",
    hello: "HELLO MINH ANH",
    hero: "Find a place where you can do your best work.",
    heroText:
      "Focus on quality, not quantity. Discover opportunities aligned with your skills and goals.",
    explore: "Explore jobs",
    completion: "Profile completion",
    completionText:
      "Add a portfolio so hiring teams can understand how you solve problems.",
    completeProfile: "Complete profile",
    recommended: "Recommended for you",
    basedOn: "Based on your Product Designer profile",
    viewAll: "View all",
    recent: "Recent progress",
    opportunities: "open opportunities",
    searchPlaceholder: "Role, skill, or department",
    details: "Details",
    apply: "Apply",
    applied: "Application submitted",
    appliedText: "Your application is now visible in the recruiter's pipeline.",
    duplicate: "You have already applied for this role.",
    trackTitle: "Track every step without waiting for scattered emails.",
    emptyApplications: "You have not applied for any roles yet.",
    position: "Position",
    company: "Company",
    status: "Status",
    match: "Match",
    savedTitle: "Saved jobs",
    savedText: "Come back when you are ready to apply.",
    profileTitle: "Candidate profile",
    profileText:
      "The information recruiters need to evaluate your application.",
    saveChanges: "Save changes",
    savedProfile: "Profile saved",
    information: "Information",
    resume: "Resume",
    privacy: "Privacy",
    fullName: "Full name",
    title: "Professional title",
    location: "Location",
    about: "About",
    skills: "Skills",
    uploadResume: "Upload a new resume",
    uploadHelp: "PDF, up to 5 MB",
    processed: "Processed",
    privacyTitle: "Profile privacy",
    privacyText:
      "Only companies you apply to can view your resume and contact information.",
    exportData: "Download my data",
    exportDone: "Your data file is ready",
    deleteAccount: "Delete account",
    deleteConfirm:
      "This will sign you out and disable your account. Are you sure?",
  },
};
i18n.addResourceBundle("vi", "candidatePortal", resources.vi, true, true);
i18n.addResourceBundle("en", "candidatePortal", resources.en, true, true);

export default function CandidatePortal() {
  const { t } = useTranslation("candidatePortal");
  const logout = useSession((s) => s.logout);
  const [open, setOpen] = useState(false);
  const item = (
    to: string,
    label: string,
    Icon: typeof Search,
    end = false,
  ) => (
    <NavLink end={end} to={to} onClick={() => setOpen(false)}>
      <Icon />
      {label}
    </NavLink>
  );
  return (
    <div className="candidate-shell candidate-sidebar-layout">
      <aside className={open ? "candidate-sidebar open" : "candidate-sidebar"}>
        <div className="candidate-sidebar-head">
          <NavLink
            to="/candidate"
            className="candidate-logo"
            onClick={() => setOpen(false)}
          >
            <span>H</span>HireHub
          </NavLink>
          <button
            className="candidate-sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <nav>
          {item("/candidate", t("overview"), LayoutDashboard, true)}
          {item("/candidate/jobs", t("jobs"), Search)}
          {item("/candidate/applications", t("applications"), FileText)}
          {item("/candidate/saved", t("saved"), Bookmark)}
          {item("/candidate/profile", t("profile"), UserRound)}
        </nav>
        <div className="candidate-sidebar-bottom">
          <button onClick={logout}>
            <LogOut />
            {t("logout")}
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="candidate-overlay"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <section className="candidate-content">
        <header>
          <button
            className="candidate-menu-button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <Text fw={700} size="sm">
            {t("workspace")}
          </Text>
          <div className="candidate-header-actions">
            <Preferences />
            <NotificationsMenu />
            <UserMenu
              name="Minh Anh"
              email="candidate@hirehub.vn"
              initials="MA"
              portal="candidate"
              color="orange"
            />
          </div>
        </header>
        <main>
          <Routes>
            <Route index element={<Home />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="applications" element={<Applications />} />
            <Route path="saved" element={<Saved />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/candidate" />} />
          </Routes>
        </main>
      </section>
    </div>
  );
}

function Home() {
  const { t } = useTranslation("candidatePortal"),
    { jobs } = useCandidateJobs(),
    { applications: apps } = useCandidateApplications();
  return (
    <Stack gap="xl">
      <section className="candidate-welcome">
        <div>
          <Text size="xs" fw={700}>
            {t("hello")}
          </Text>
          <Title order={1}>{t("hero")}</Title>
          <Text c="dimmed">{t("heroText")}</Text>
          <Button
            component={NavLink}
            to="/candidate/jobs"
            mt="lg"
            leftSection={<Search size={16} />}
          >
            {t("explore")}
          </Button>
        </div>
        <Card withBorder className="profile-completion-card">
          <Text size="xs" c="dimmed">
            {t("completion")}
          </Text>
          <Title order={2}>82%</Title>
          <Progress value={82} mt="xs" size="sm" radius="xl" w="100%" />
          <Text size="sm" c="dimmed" mt="sm">
            {t("completionText")}
          </Text>
          <Button
            component={NavLink}
            to="/candidate/profile"
            variant="light"
            mt="lg"
          >
            {t("completeProfile")}
          </Button>
        </Card>
      </section>
      <div>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>{t("recommended")}</Title>
            <Text size="sm" c="dimmed">
              {t("basedOn")}
            </Text>
          </div>
          <Button component={NavLink} to="/candidate/jobs" variant="subtle">
            {t("viewAll")}
          </Button>
        </Group>
        <JobGrid jobs={jobs.slice(0, 3)} />
      </div>
      {apps.length > 0 && (
        <Card withBorder>
          <Title order={4} mb="md">
            {t("recent")}
          </Title>
          <ApplicationTable apps={apps} />
        </Card>
      )}
    </Stack>
  );
}
function Jobs() {
  const { t } = useTranslation("candidatePortal");
  const [q, setQ] = useState("");
  const [workplace, setWorkplace] = useState<string | null>(null),
    [employmentType, setEmploymentType] = useState<string | null>(null),
    [sort, setSort] = useState<string | null>("newest");
  const { jobs, isLoading, isError, online } = useCandidateJobs({
    q,
    workplace: workplace || undefined,
    employmentType: employmentType || undefined,
    sort: sort || undefined,
  });
  return (
    <Stack>
      <div>
        <Title order={2}>{t("explore")}</Title>
        <Text c="dimmed" size="sm">
          {isLoading ? "…" : jobs.length} {t("opportunities")} ·{" "}
          {online ? "API" : "Local demo"}
        </Text>
      </div>
      <TextInput
        leftSection={<Search size={15} />}
        placeholder={t("searchPlaceholder")}
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
      />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Select
          clearable
          label={
            i18n.resolvedLanguage?.startsWith("en")
              ? "Workplace"
              : "Hình thức làm việc"
          }
          value={workplace}
          onChange={setWorkplace}
          data={[
            { value: "ONSITE", label: "On-site" },
            { value: "HYBRID", label: "Hybrid" },
            { value: "REMOTE", label: "Remote" },
          ]}
        />
        <Select
          clearable
          label={
            i18n.resolvedLanguage?.startsWith("en")
              ? "Employment type"
              : "Loại hình"
          }
          value={employmentType}
          onChange={setEmploymentType}
          data={[
            {
              value: "FULL_TIME",
              label: i18n.resolvedLanguage?.startsWith("en")
                ? "Full time"
                : "Toàn thời gian",
            },
            {
              value: "PART_TIME",
              label: i18n.resolvedLanguage?.startsWith("en")
                ? "Part time"
                : "Bán thời gian",
            },
            { value: "CONTRACT", label: "Contract" },
            {
              value: "INTERNSHIP",
              label: i18n.resolvedLanguage?.startsWith("en")
                ? "Internship"
                : "Thực tập",
            },
          ]}
        />
        <Select
          label={
            i18n.resolvedLanguage?.startsWith("en") ? "Sort by" : "Sắp xếp"
          }
          value={sort}
          onChange={setSort}
          allowDeselect={false}
          data={[
            {
              value: "newest",
              label: i18n.resolvedLanguage?.startsWith("en")
                ? "Newest"
                : "Mới nhất",
            },
            { value: "title", label: "A–Z" },
            {
              value: "salary",
              label: i18n.resolvedLanguage?.startsWith("en")
                ? "Highest salary"
                : "Lương cao nhất",
            },
          ]}
        />
      </SimpleGrid>
      {isError ? (
        <Card withBorder>
          <Text c="red">Unable to load jobs from API.</Text>
        </Card>
      ) : (
        <JobGrid jobs={jobs} />
      )}
    </Stack>
  );
}
function JobGrid({ jobs }: { jobs: DemoJob[] }) {
  const { t } = useTranslation("candidatePortal"),
    actions = useCandidateActions(),
    saved = useCandidateSavedJobs();
  const [localSaved, setLocalSaved] = useState<string[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [companySlug, setCompanySlug] = useState<string | null>(null),
    [coverLetter, setCoverLetter] = useState(""),
    [resumeId, setResumeId] = useState<string | null>(null),
    [answers, setAnswers] = useState<Record<string, string>>({});
  const detail = useQuery({
    queryKey: ["candidate", "job", selected],
    queryFn: () => candidateApi.job(selected!),
    enabled: actions.online && Boolean(selected),
  });
  const company = useQuery({
    queryKey: ["candidate", "company", companySlug],
    queryFn: () => candidateApi.company(companySlug!),
    enabled: actions.online && Boolean(companySlug),
  });
  const savedIds = actions.online
    ? saved.jobs.map((job) => job.id)
    : localSaved;
  const toggleSaved = (jobId: string) => {
    const exists = savedIds.includes(jobId);
    if (actions.online) actions.saveMutation.mutate({ jobId, saved: exists });
    else
      setLocalSaved((ids) =>
        exists ? ids.filter((id) => id !== jobId) : [...ids, jobId],
      );
  };
  const quickApply = (jobId: string) =>
    actions.applyMutation.mutate(jobId, {
      onSuccess: () =>
        notifications.show({
          color: "teal",
          title: t("applied"),
          message: t("appliedText"),
        }),
      onError: (error) =>
        notifications.show({
          color: "orange",
          message:
            error.message === "RESUME_REQUIRED"
              ? t("uploadResume")
              : t("duplicate"),
        }),
    });
  const submitDetailed = () => {
    if (!selected) return;
    const requiredMissing = detail.data?.questions.some(
      (question) => question.required && !answers[question.id]?.trim(),
    );
    if (requiredMissing)
      return notifications.show({
        color: "red",
        message: "Please answer all required screening questions.",
      });
    actions.applyDetailed.mutate(
      {
        jobId: selected,
        resumeId: resumeId || undefined,
        coverLetter,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      },
      {
        onSuccess: () => {
          setSelected(null);
          notifications.show({
            color: "teal",
            title: t("applied"),
            message: t("appliedText"),
          });
        },
        onError: (error) =>
          notifications.show({ color: "red", message: error.message }),
      },
    );
  };
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {jobs.map((job) => (
          <Card key={job.id} withBorder>
            <Group justify="space-between">
              <span className="company-logo">{job.department[0]}</span>
              <Button
                aria-label={t("saved")}
                variant="subtle"
                loading={actions.saveMutation.isPending}
                onClick={() => toggleSaved(job.id)}
              >
                <Bookmark
                  size={16}
                  fill={savedIds.includes(job.id) ? "currentColor" : "none"}
                />
              </Button>
            </Group>
            <Title order={4} mt="lg">
              {job.title}
            </Title>
            <Text size="sm" c="dimmed">
              Nexa Studio · {job.location}
            </Text>
            <Group gap={5} mt="md">
              {job.skills.map((skill) => (
                <Badge key={skill} variant="light" color="gray">
                  {skill}
                </Badge>
              ))}
            </Group>
            <Group grow mt="xl">
              <Button variant="default" onClick={() => setSelected(job.id)}>
                {t("details")}
              </Button>
              <Button
                loading={actions.applyMutation.isPending}
                onClick={() => quickApply(job.id)}
              >
                {t("apply")}
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      <Modal
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={detail.data?.title || "Job details"}
        size="xl"
      >
        <Stack>
          {detail.isLoading ? (
            <Text>Loading…</Text>
          ) : (
            detail.data && (
              <>
                <Group>
                  <Badge>{detail.data.employmentType}</Badge>
                  <Badge variant="outline">{detail.data.workplace}</Badge>
                  <Badge variant="outline">{detail.data.location}</Badge>
                </Group>
                <Card withBorder>
                  <Text fw={700}>{detail.data.company.name}</Text>
                  <Text size="sm" c="dimmed">
                    Company profile · {detail.data.company.slug}
                  </Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    mt="xs"
                    onClick={() => setCompanySlug(detail.data!.company.slug)}
                  >
                    {i18n.resolvedLanguage?.startsWith("en")
                      ? "View company"
                      : "Xem doanh nghiệp"}
                  </Button>
                </Card>
                <div>
                  <Title order={4}>About the role</Title>
                  <Text style={{ whiteSpace: "pre-wrap" }}>
                    {detail.data.description}
                  </Text>
                </div>
                <div>
                  <Title order={4}>Requirements</Title>
                  <Text style={{ whiteSpace: "pre-wrap" }}>
                    {detail.data.requirements}
                  </Text>
                </div>
                <Select
                  label={t("resume")}
                  placeholder="Select resume"
                  data={(actions.resumes.data || []).map((item) => ({
                    value: String(item.id),
                    label: String(item.name),
                  }))}
                  value={resumeId}
                  onChange={setResumeId}
                />
                <Textarea
                  label="Cover letter"
                  minRows={4}
                  maxLength={3000}
                  value={coverLetter}
                  onChange={(event) =>
                    setCoverLetter(event.currentTarget.value)
                  }
                />
                {detail.data.questions.map((question) => (
                  <Textarea
                    key={question.id}
                    required={question.required}
                    label={question.prompt}
                    value={answers[question.id] || ""}
                    onChange={(event) =>
                      setAnswers({
                        ...answers,
                        [question.id]: event.currentTarget.value,
                      })
                    }
                  />
                ))}
                <Button
                  loading={actions.applyDetailed.isPending}
                  onClick={submitDetailed}
                >
                  {t("apply")}
                </Button>
              </>
            )
          )}
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(companySlug)}
        onClose={() => setCompanySlug(null)}
        title={String(
          company.data?.name ||
            (i18n.resolvedLanguage?.startsWith("en")
              ? "Company profile"
              : "Hồ sơ doanh nghiệp"),
        )}
        size="lg"
      >
        <Stack>
          {company.isLoading ? (
            <Text>
              {i18n.resolvedLanguage?.startsWith("en")
                ? "Loading..."
                : "Đang tải..."}
            </Text>
          ) : company.isError ? (
            <Text c="red">
              {i18n.resolvedLanguage?.startsWith("en")
                ? "Unable to load company profile."
                : "Không thể tải hồ sơ doanh nghiệp."}
            </Text>
          ) : (
            <>
              <Text c="dimmed">
                {String(
                  company.data?.description ||
                    (i18n.resolvedLanguage?.startsWith("en")
                      ? "No company description yet."
                      : "Doanh nghiệp chưa cập nhật giới thiệu."),
                )}
              </Text>
              {company.data?.website && (
                <Button
                  component="a"
                  href={String(company.data.website)}
                  target="_blank"
                  rel="noreferrer"
                  variant="default"
                >
                  Website
                </Button>
              )}
              <Title order={4}>
                {i18n.resolvedLanguage?.startsWith("en")
                  ? "Open roles"
                  : "Vị trí đang tuyển"}
              </Title>
              <Stack gap="xs">
                {(
                  (company.data?.jobs as
                    Array<Record<string, unknown>> | undefined) || []
                ).map((job) => (
                  <Card key={String(job.id)} withBorder>
                    <Text fw={700}>{String(job.title)}</Text>
                    <Text size="sm" c="dimmed">
                      {String(job.location)}
                    </Text>
                  </Card>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
function Applications() {
  const { t } = useTranslation("candidatePortal"),
    flow = useCandidateApplications(),
    apps = flow.applications;
  return (
    <Stack>
      <div>
        <Title order={2}>{t("applications")}</Title>
        <Text c="dimmed" size="sm">
          {t("trackTitle")}
        </Text>
      </div>
      <Card withBorder>
        {flow.isLoading ? (
          <Text c="dimmed">Loading…</Text>
        ) : flow.isError ? (
          <Text c="red">Unable to load applications.</Text>
        ) : apps.length ? (
          <ApplicationTable apps={apps} />
        ) : (
          <Text c="dimmed">{t("emptyApplications")}</Text>
        )}
      </Card>
      {flow.online &&
        flow.raw.map((application) => (
          <Card key={application.id} withBorder>
            <Group justify="space-between">
              <div>
                <Title order={4}>{application.job.title}</Title>
                <Text size="sm" c="dimmed">
                  {application.job.company.name}
                </Text>
              </div>
              <Badge>{application.stage}</Badge>
            </Group>
            {application.history.length > 0 && (
              <Stack gap={4} mt="md">
                {application.history.map((item) => (
                  <Text key={item.id} size="xs" c="dimmed">
                    {new Date(item.createdAt).toLocaleString()} · {item.toStage}
                  </Text>
                ))}
              </Stack>
            )}
            {application.interviews.map((interview) => (
              <Card key={interview.id} withBorder mt="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={700}>Interview · {interview.status}</Text>
                    <Text size="sm" c="dimmed">
                      {new Date(interview.startsAt).toLocaleString()} (
                      {interview.timezone})
                    </Text>
                  </div>
                  {interview.status === "SCHEDULED" && (
                    <Group>
                      <Button
                        size="xs"
                        variant="default"
                        loading={flow.respondInterview.isPending}
                        onClick={() =>
                          flow.respondInterview.mutate({
                            id: interview.id,
                            status: "RESCHEDULE_REQUESTED",
                          })
                        }
                      >
                        Request reschedule
                      </Button>
                      <Button
                        size="xs"
                        loading={flow.respondInterview.isPending}
                        onClick={() =>
                          flow.respondInterview.mutate({
                            id: interview.id,
                            status: "CONFIRMED",
                          })
                        }
                      >
                        Confirm
                      </Button>
                    </Group>
                  )}
                </Group>
              </Card>
            ))}
            {application.offer && (
              <Card withBorder mt="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={700}>Offer · {application.offer.status}</Text>
                    <Text size="sm" c="dimmed">
                      {application.offer.salary.toLocaleString()}{" "}
                      {application.offer.currency} · starts{" "}
                      {new Date(
                        application.offer.startsAt,
                      ).toLocaleDateString()}
                    </Text>
                  </div>
                  {application.offer.status === "SENT" && (
                    <Group>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        onClick={() =>
                          flow.respondOffer.mutate({
                            id: application.offer!.id,
                            status: "DECLINED",
                          })
                        }
                      >
                        Decline
                      </Button>
                      <Button
                        size="xs"
                        color="teal"
                        onClick={() =>
                          flow.respondOffer.mutate({
                            id: application.offer!.id,
                            status: "ACCEPTED",
                          })
                        }
                      >
                        Accept offer
                      </Button>
                    </Group>
                  )}
                </Group>
              </Card>
            )}
          </Card>
        ))}
    </Stack>
  );
}
function ApplicationTable({ apps }: { apps: DemoApplication[] }) {
  const { t } = useTranslation("candidatePortal");
  return (
    <Table.ScrollContainer minWidth={650}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("position")}</Table.Th>
            <Table.Th>{t("company")}</Table.Th>
            <Table.Th>{t("status")}</Table.Th>
            <Table.Th>{t("match")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {apps.map((a) => (
            <Table.Tr key={a.id}>
              <Table.Td>{a.jobTitle}</Table.Td>
              <Table.Td>Nexa Studio</Table.Td>
              <Table.Td>
                <Badge>{a.stage}</Badge>
              </Table.Td>
              <Table.Td>{a.score}%</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
function Saved() {
  const { t } = useTranslation("candidatePortal"),
    saved = useCandidateSavedJobs(),
    fallback = useCandidateJobs()
      .jobs.filter((j) => j.status === "PUBLISHED")
      .slice(0, 2);
  const jobs = saved.online ? saved.jobs : fallback;
  return (
    <Stack>
      <div>
        <Title order={2}>{t("savedTitle")}</Title>
        <Text c="dimmed" size="sm">
          {t("savedText")}
        </Text>
      </div>
      {saved.isLoading ? (
        <Text c="dimmed">Loading…</Text>
      ) : (
        <JobGrid jobs={jobs} />
      )}
    </Stack>
  );
}
function Profile() {
  const { t } = useTranslation("candidatePortal"),
    data = useCandidateProfileData(),
    logout = useSession((state) => state.logout);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [experience, setExperience] = useState({
    company: "",
    title: "",
    startsAt: "",
    endsAt: "",
    description: "",
  });
  const [education, setEducation] = useState({
    school: "",
    degree: "",
    field: "",
    startsAt: "",
    endsAt: "",
  });
  const [form, setForm] = useState({
    headline: "Senior Product Designer",
    location: "Ho Chi Minh City",
    bio: "Product designer focused on clear experiences and measurable outcomes.",
    skills: "Figma, UX Research, Design Systems, Prototyping",
    portfolioUrl: "",
  });
  const save = () => {
    if (!data.online)
      return notifications.show({ color: "teal", message: t("savedProfile") });
    data.update.mutate(
      {
        headline: form.headline,
        location: form.location,
        bio: form.bio,
        skills: form.skills
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        portfolioUrl: form.portfolioUrl || undefined,
      },
      {
        onSuccess: () =>
          notifications.show({ color: "teal", message: t("savedProfile") }),
        onError: (error) =>
          notifications.show({ color: "red", message: error.message }),
      },
    );
  };
  const upload = (file: File | null) => {
    if (!file) return;
    if (!data.online)
      return notifications.show({
        color: "orange",
        message: "Resume upload requires API mode.",
      });
    data.upload.mutate(file, {
      onSuccess: () =>
        notifications.show({ color: "teal", message: t("processed") }),
      onError: (error) =>
        notifications.show({
          color: "red",
          message:
            error.message === "INVALID_FILE"
              ? t("uploadHelp")
              : "Upload failed",
        }),
    });
  };
  const exportData = async () => {
    if (!data.online) return;
    setPrivacyBusy(true);
    try {
      const payload = await candidateApi.exportData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "hirehub-personal-data.json";
      link.click();
      URL.revokeObjectURL(url);
      notifications.show({ color: "teal", message: t("exportDone") });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setPrivacyBusy(false);
    }
  };
  const deleteAccount = async () => {
    if (!data.online || !window.confirm(t("deleteConfirm"))) return;
    setPrivacyBusy(true);
    try {
      await candidateApi.deleteAccount();
      logout();
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Delete failed",
      });
      setPrivacyBusy(false);
    }
  };
  const addExperience = () =>
    data.createExperience.mutate(
      {
        ...experience,
        startsAt: new Date(experience.startsAt).toISOString(),
        endsAt: experience.endsAt
          ? new Date(experience.endsAt).toISOString()
          : undefined,
      },
      {
        onSuccess: () =>
          setExperience({
            company: "",
            title: "",
            startsAt: "",
            endsAt: "",
            description: "",
          }),
        onError: (error) =>
          notifications.show({ color: "red", message: error.message }),
      },
    );
  const addEducation = () =>
    data.createEducation.mutate(
      {
        ...education,
        startsAt: new Date(education.startsAt).toISOString(),
        endsAt: education.endsAt
          ? new Date(education.endsAt).toISOString()
          : undefined,
      },
      {
        onSuccess: () =>
          setEducation({
            school: "",
            degree: "",
            field: "",
            startsAt: "",
            endsAt: "",
          }),
        onError: (error) =>
          notifications.show({ color: "red", message: error.message }),
      },
    );
  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>{t("profileTitle")}</Title>
          <Text c="dimmed" size="sm">
            {t("profileText")} · {data.online ? "API" : "Local demo"}
          </Text>
        </div>
        <Button loading={data.update.isPending} onClick={save}>
          {t("saveChanges")}
        </Button>
      </Group>
      <Tabs defaultValue="info">
        <Tabs.List>
          <Tabs.Tab value="info">{t("information")}</Tabs.Tab>
          <Tabs.Tab value="experience">
            {i18n.resolvedLanguage?.startsWith("en")
              ? "Experience"
              : "Kinh nghiệm"}
          </Tabs.Tab>
          <Tabs.Tab value="education">
            {i18n.resolvedLanguage?.startsWith("en") ? "Education" : "Học vấn"}
          </Tabs.Tab>
          <Tabs.Tab value="resume">{t("resume")}</Tabs.Tab>
          <Tabs.Tab value="privacy">{t("privacy")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="info" pt="lg">
          <Card withBorder>
            <Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label={t("fullName")}
                  value="Nguyễn Minh Anh"
                  readOnly
                />
                <TextInput
                  label={t("title")}
                  value={form.headline}
                  onChange={(event) =>
                    setForm({ ...form, headline: event.currentTarget.value })
                  }
                />
                <TextInput
                  label="Email"
                  value="candidate@hirehub.vn"
                  readOnly
                />
                <TextInput
                  label={t("location")}
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.currentTarget.value })
                  }
                />
              </SimpleGrid>
              <Textarea
                label={t("about")}
                minRows={4}
                value={form.bio}
                onChange={(event) =>
                  setForm({ ...form, bio: event.currentTarget.value })
                }
              />
              <TextInput
                label={t("skills")}
                value={form.skills}
                onChange={(event) =>
                  setForm({ ...form, skills: event.currentTarget.value })
                }
              />
              <TextInput
                label="Portfolio URL"
                value={form.portfolioUrl}
                onChange={(event) =>
                  setForm({ ...form, portfolioUrl: event.currentTarget.value })
                }
              />
            </Stack>
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="experience" pt="lg">
          <Stack>
            <Card withBorder>
              <Stack>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    required
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "Company"
                        : "Công ty"
                    }
                    value={experience.company}
                    onChange={(event) =>
                      setExperience({
                        ...experience,
                        company: event.currentTarget.value,
                      })
                    }
                  />
                  <TextInput
                    required
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "Job title"
                        : "Chức danh"
                    }
                    value={experience.title}
                    onChange={(event) =>
                      setExperience({
                        ...experience,
                        title: event.currentTarget.value,
                      })
                    }
                  />
                  <TextInput
                    required
                    type="date"
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "Start date"
                        : "Ngày bắt đầu"
                    }
                    value={experience.startsAt}
                    onChange={(event) =>
                      setExperience({
                        ...experience,
                        startsAt: event.currentTarget.value,
                      })
                    }
                  />
                  <TextInput
                    type="date"
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "End date"
                        : "Ngày kết thúc"
                    }
                    value={experience.endsAt}
                    onChange={(event) =>
                      setExperience({
                        ...experience,
                        endsAt: event.currentTarget.value,
                      })
                    }
                  />
                </SimpleGrid>
                <Textarea
                  label={
                    i18n.resolvedLanguage?.startsWith("en")
                      ? "Description"
                      : "Mô tả"
                  }
                  value={experience.description}
                  onChange={(event) =>
                    setExperience({
                      ...experience,
                      description: event.currentTarget.value,
                    })
                  }
                />
                <Button
                  w="fit-content"
                  disabled={
                    !data.online ||
                    !experience.company ||
                    !experience.title ||
                    !experience.startsAt
                  }
                  loading={data.createExperience.isPending}
                  onClick={addExperience}
                >
                  {i18n.resolvedLanguage?.startsWith("en")
                    ? "Add experience"
                    : "Thêm kinh nghiệm"}
                </Button>
              </Stack>
            </Card>
            {(data.experiences.data || []).map(
              (item: Record<string, unknown>) => (
                <Card withBorder key={String(item.id)}>
                  <Group justify="space-between">
                    <div>
                      <Text fw={700}>
                        {String(item.title)} · {String(item.company)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {new Date(String(item.startsAt)).toLocaleDateString()} —{" "}
                        {item.current
                          ? i18n.resolvedLanguage?.startsWith("en")
                            ? "Present"
                            : "Hiện tại"
                          : item.endsAt
                            ? new Date(String(item.endsAt)).toLocaleDateString()
                            : ""}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() =>
                        data.deleteExperience.mutate(String(item.id))
                      }
                    >
                      {i18n.resolvedLanguage?.startsWith("en")
                        ? "Delete"
                        : "Xóa"}
                    </Button>
                  </Group>
                </Card>
              ),
            )}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="education" pt="lg">
          <Stack>
            <Card withBorder>
              <Stack>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    required
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "School"
                        : "Trường"
                    }
                    value={education.school}
                    onChange={(event) =>
                      setEducation({
                        ...education,
                        school: event.currentTarget.value,
                      })
                    }
                  />
                  <TextInput
                    required
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "Degree"
                        : "Bằng cấp"
                    }
                    value={education.degree}
                    onChange={(event) =>
                      setEducation({
                        ...education,
                        degree: event.currentTarget.value,
                      })
                    }
                  />
                  <TextInput
                    label={
                      i18n.resolvedLanguage?.startsWith("en")
                        ? "Field of study"
                        : "Chuyên ngành"
                    }
                    value={education.field}
                    onChange={(event) =>
                      setEducation({
                        ...education,
                        field: event.currentTarget.value,
                      })
                    }
                  />
                  <Group grow>
                    <TextInput
                      required
                      type="date"
                      label={
                        i18n.resolvedLanguage?.startsWith("en")
                          ? "Start date"
                          : "Ngày bắt đầu"
                      }
                      value={education.startsAt}
                      onChange={(event) =>
                        setEducation({
                          ...education,
                          startsAt: event.currentTarget.value,
                        })
                      }
                    />
                    <TextInput
                      type="date"
                      label={
                        i18n.resolvedLanguage?.startsWith("en")
                          ? "End date"
                          : "Ngày kết thúc"
                      }
                      value={education.endsAt}
                      onChange={(event) =>
                        setEducation({
                          ...education,
                          endsAt: event.currentTarget.value,
                        })
                      }
                    />
                  </Group>
                </SimpleGrid>
                <Button
                  w="fit-content"
                  disabled={
                    !data.online ||
                    !education.school ||
                    !education.degree ||
                    !education.startsAt
                  }
                  loading={data.createEducation.isPending}
                  onClick={addEducation}
                >
                  {i18n.resolvedLanguage?.startsWith("en")
                    ? "Add education"
                    : "Thêm học vấn"}
                </Button>
              </Stack>
            </Card>
            {(data.educations.data || []).map(
              (item: Record<string, unknown>) => (
                <Card withBorder key={String(item.id)}>
                  <Group justify="space-between">
                    <div>
                      <Text fw={700}>
                        {String(item.degree)} · {String(item.school)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {String(item.field || "")}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() =>
                        data.deleteEducation.mutate(String(item.id))
                      }
                    >
                      {i18n.resolvedLanguage?.startsWith("en")
                        ? "Delete"
                        : "Xóa"}
                    </Button>
                  </Group>
                </Card>
              ),
            )}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="resume" pt="lg">
          <Card withBorder>
            <FileInput
              label={t("uploadResume")}
              description={t("uploadHelp")}
              accept="application/pdf"
              disabled={!data.online}
              onChange={upload}
              clearable
            />
            {data.resumes.isLoading ? (
              <Text mt="lg">Loading…</Text>
            ) : (
              (
                data.resumes.data || [
                  { id: "demo", name: "Minh-Anh-Product-Designer.pdf" },
                ]
              ).map((item) => (
                <Card withBorder mt="lg" key={String(item.id)}>
                  <Group>
                    <FileText />
                    <Text fw={700}>{String(item.name)}</Text>
                    <Badge ml="auto" color="teal">
                      {t("processed")}
                    </Badge>
                  </Group>
                </Card>
              ))
            )}
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="privacy" pt="lg">
          <Card withBorder>
            <Title order={4}>{t("privacyTitle")}</Title>
            <Text c="dimmed" size="sm" my="md">
              {t("privacyText")}
            </Text>
            <Group>
              <Button
                variant="default"
                loading={privacyBusy}
                disabled={!data.online}
                onClick={exportData}
              >
                {t("exportData")}
              </Button>
              <Button
                color="red"
                variant="light"
                loading={privacyBusy}
                disabled={!data.online}
                onClick={deleteAccount}
              >
                {t("deleteAccount")}
              </Button>
            </Group>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
