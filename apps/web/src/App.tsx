import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Progress,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Analytics,
  CandidateDrawer,
  CreateJobButton,
  Interviews,
  Messages,
  RecruiterJobs,
  RecruiterSettings,
} from "./RecruiterFlows";
import { Preferences } from "./Preferences";
import { UserMenu } from "./UserMenu";
import { useSession } from "./store";
import { useWorkflow, type DemoApplication } from "./workflowStore";
import { useRecruiterJobs, useRecruiterPipeline } from "./recruiterQueries";
import { recruiterApi } from "./api";

const nav = [
  { to: "/recruiter", key: "overview", icon: LayoutDashboard },
  { to: "/recruiter/jobs", key: "jobs", icon: BriefcaseBusiness },
  { to: "/recruiter/pipeline", key: "candidates", icon: UsersRound },
  { to: "/recruiter/interviews", key: "interviews", icon: CalendarDays },
  { to: "/recruiter/messages", key: "messages", icon: MessageSquareText },
  { to: "/recruiter/analytics", key: "analytics", icon: BarChart3 },
];

function Dashboard() {
  const { t } = useTranslation();
  const { jobs } = useRecruiterJobs(),
    { applications: apps } = useRecruiterPipeline(),
    interviews = useWorkflow((s) => s.interviews);
  const active = jobs.filter((j) => j.status === "PUBLISHED").length;
  const average = apps.length
    ? Math.round(apps.reduce((n, a) => n + a.score, 0) / apps.length)
    : 0;
  return (
    <>
      <Group justify="space-between" align="flex-start" mb="xl">
        <div>
          <Title order={2}>{t("dashboard.greeting")}</Title>
          <Text c="dimmed" size="sm">
            {t("dashboard.subtitle")}
          </Text>
        </div>
        <CreateJobButton />
      </Group>
      <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="md">
        <Stat
          label={t("dashboard.activeJobs")}
          value={String(active)}
          note={t("dashboard.follow")}
        />
        <Stat
          label={t("dashboard.pipelineCandidates")}
          value={String(apps.length)}
          note={`${apps.filter((a) => a.stage === "APPLIED").length} ${t("dashboard.newProfiles")}`}
        />
        <Stat
          label={t("dashboard.upcomingInterviews")}
          value={String(
            interviews.filter((i) => i.status !== "COMPLETED").length,
          )}
          note={t("dashboard.sevenDays")}
        />
        <Stat
          label={t("dashboard.averageMatch")}
          value={`${average}%`}
          note={t("dashboard.referenceOnly")}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }} mt="lg">
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" mb="lg">
            <div>
              <Title order={4}>{t("dashboard.tasks")}</Title>
              <Text size="xs" c="dimmed">
                {t("dashboard.priority")}
              </Text>
            </div>
            <Badge variant="light">{t("dashboard.today")}</Badge>
          </Group>
          <Task
            title={t("dashboard.reviewProfiles")}
            meta="Senior Product Designer"
            color="violet"
          />
          <Task
            title={t("dashboard.finishScorecard")}
            meta="Nguyễn Minh Anh · 09:30"
            color="orange"
          />
          <Task
            title={t("dashboard.replyReschedule")}
            meta="Frontend Engineer"
            color="blue"
          />
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Title order={4}>{t("dashboard.pipelineHealth")}</Title>
          <Text size="xs" c="dimmed" mb="lg">
            {t("dashboard.allActiveJobs")}
          </Text>
          {["APPLIED", "SCREENING", "INTERVIEW", "OFFER"].map((stage) => {
            const count = apps.filter((a) => a.stage === stage).length;
            return (
              <div key={stage} style={{ marginBottom: 14 }}>
                <Group justify="space-between" mb={5}>
                  <Text size="xs">{stage}</Text>
                  <Text size="xs" fw={700}>
                    {count}
                  </Text>
                </Group>
                <Progress
                  value={apps.length ? (count / apps.length) * 100 : 0}
                />
              </div>
            );
          })}
        </Card>
      </SimpleGrid>
      <Card withBorder radius="md" padding="lg" mt="lg">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={4}>{t("dashboard.recent")}</Title>
            <Text size="xs" c="dimmed">
              {t("dashboard.liveUpdate")}
            </Text>
          </div>
          <Button
            component={NavLink}
            to="/recruiter/pipeline"
            variant="subtle"
            size="xs"
          >
            {t("dashboard.openPipeline")}
          </Button>
        </Group>
        <div className="clean-candidate-list">
          {apps.slice(0, 5).map((a) => (
            <div key={a.id}>
              <span className="avatar purple">
                {a.candidate.split(" ").at(-1)?.[0]}
              </span>
              <div>
                <b>{a.candidate}</b>
                <small>{a.jobTitle}</small>
              </div>
              <Badge variant="light">{a.stage}</Badge>
              <Text size="xs" c="dimmed">
                {a.score}% match
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Title order={2} mt={4}>
        {value}
      </Title>
      <Text size="xs" c="teal" mt={6}>
        {note}
      </Text>
    </Card>
  );
}
function Task({
  title,
  meta,
  color,
}: {
  title: string;
  meta: string;
  color: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="task-row">
      <i className={color} />
      <div>
        <b>{title}</b>
        <small>{meta}</small>
      </div>
      <Button size="compact-xs" variant="subtle">
        {t("common.process")}
      </Button>
    </div>
  );
}

function Pipeline() {
  const { t, i18n } = useTranslation();
  const { applications: apps, move } = useRecruiterPipeline();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoApplication | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const client = useQueryClient();
  const bulk = useMutation({
    mutationFn: (action: "SCREENING" | "REJECTED") =>
      recruiterApi.bulkApplications({
        ids: selectedIds,
        action: action === "REJECTED" ? "REJECT" : "MOVE",
        stage: action,
      }),
    onSuccess: (result) => {
      setSelectedIds([]);
      client.invalidateQueries({ queryKey: ["recruiter", "pipeline"] });
      notifications.show({
        color: "teal",
        message: `${result.updated} applications updated`,
      });
    },
    onError: (error) =>
      notifications.show({ color: "red", message: error.message }),
  });
  const stages: DemoApplication["stage"][] = [
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "HIRED",
  ];
  const visible = apps.filter((a) =>
    a.candidate.toLowerCase().includes(query.toLowerCase()),
  );
  const changeStage = (
    application: DemoApplication,
    stage: DemoApplication["stage"],
  ) => move.mutate({ id: application.id, stage, version: application.version });
  const exportCsv = () => {
    const csv = [
      "Candidate,Email,Job,Stage,Score",
      ...visible.map((a) =>
        [a.candidate, a.email, a.jobTitle, a.stage, a.score]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "hirehub-pipeline.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>{t("pipeline.title")}</Title>
          <Text c="dimmed" size="sm">
            {t("pipeline.subtitle")}
          </Text>
        </div>
        <Group>
          {selectedIds.length > 0 && (
            <>
              <Badge>
                {selectedIds.length}{" "}
                {i18n.resolvedLanguage?.startsWith("en")
                  ? "selected"
                  : "đã chọn"}
              </Badge>
              <Button
                size="xs"
                loading={bulk.isPending}
                onClick={() => bulk.mutate("SCREENING")}
              >
                {i18n.resolvedLanguage?.startsWith("en")
                  ? "Move to screening"
                  : "Chuyển sang sàng lọc"}
              </Button>
              <Button
                size="xs"
                color="red"
                variant="light"
                loading={bulk.isPending}
                onClick={() => bulk.mutate("REJECTED")}
              >
                {i18n.resolvedLanguage?.startsWith("en") ? "Reject" : "Từ chối"}
              </Button>
            </>
          )}
          <Button variant="default" onClick={exportCsv}>
            {t("pipeline.export")}
          </Button>
        </Group>
      </Group>
      <div className="recruiter-search">
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("pipeline.search")}
        />
      </div>
      <div className="clean-kanban">
        {stages.map((stage, index) => (
          <section key={stage}>
            <header>
              <b>{stage}</b>
              <span>{visible.filter((a) => a.stage === stage).length}</span>
            </header>
            {visible
              .filter((a) => a.stage === stage)
              .map((a) => (
                <Card key={a.id} withBorder radius="md" padding="md">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Checkbox
                        aria-label={`${i18n.resolvedLanguage?.startsWith("en") ? "Select" : "Chọn"} ${a.candidate}`}
                        checked={selectedIds.includes(a.id)}
                        onChange={(event) =>
                          setSelectedIds(
                            event.currentTarget.checked
                              ? [...selectedIds, a.id]
                              : selectedIds.filter((id) => id !== a.id),
                          )
                        }
                      />
                      <span className="avatar purple">
                        {a.candidate.split(" ").at(-1)?.[0]}
                      </span>
                    </Group>
                    <Badge variant="light">{a.score}%</Badge>
                  </Group>
                  <Text fw={700} size="sm" mt="sm">
                    {a.candidate}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {a.jobTitle}
                  </Text>
                  <Button
                    fullWidth
                    size="xs"
                    variant="subtle"
                    mt="sm"
                    onClick={() => setSelected(a)}
                  >
                    {i18n.resolvedLanguage?.startsWith("en")
                      ? "View profile"
                      : "Xem hồ sơ"}
                  </Button>
                  <Group grow mt="xs">
                    <Button
                      size="xs"
                      variant="default"
                      disabled={index === 0 || move.isPending}
                      onClick={() => changeStage(a, stages[index - 1]!)}
                    >
                      ←
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      disabled={index === stages.length - 1 || move.isPending}
                      onClick={() => changeStage(a, stages[index + 1]!)}
                    >
                      {t("common.next")} →
                    </Button>
                  </Group>
                </Card>
              ))}
          </section>
        ))}
      </div>
      <CandidateDrawer
        application={selected}
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function Shell() {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false),
    logout = useSession((s) => s.logout);
  return (
    <div className="shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="logo">
          <span>H</span>HireHub
        </div>
        <button
          className="close"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        >
          <X />
        </button>
        <div className="workspace-switch">
          <span className="company-mark">N</span>
          <div>
            <b>Nexa Studio</b>
            <small>Recruiter workspace</small>
          </div>
          <ChevronDown />
        </div>
        <nav>
          {nav.map(({ to, key, icon: Icon }) => (
            <NavLink
              end={to === "/recruiter"}
              to={to}
              key={to}
              onClick={() => setMenu(false)}
            >
              <Icon />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <NavLink to="/recruiter/settings">
            <Settings />
            {t("common.settings")}
          </NavLink>
          <button className="recruiter-logout" onClick={logout}>
            <LogOut />
            {t("common.logout")}
          </button>
        </div>
      </aside>
      <section className="main">
        <header>
          <button
            className="menu"
            onClick={() => setMenu(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="global-search">
            <Search />
            <input placeholder={t("common.search")} />
            <kbd>⌘ K</kbd>
          </div>
          <div className="header-actions">
            <Preferences />
            <button aria-label={t("common.help")}>
              <CircleHelp />
            </button>
            <button
              className="notification"
              aria-label={t("common.notifications")}
            >
              <Bell />
              <i />
            </button>
            <UserMenu
              name="Linh Anh"
              email="recruiter@hirehub.vn"
              initials="LA"
              portal="recruiter"
            />
          </div>
        </header>
        <main>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="jobs" element={<RecruiterJobs />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="messages" element={<Messages />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<RecruiterSettings />} />
            <Route path="*" element={<Navigate to="/recruiter" />} />
          </Routes>
        </main>
      </section>
    </div>
  );
}
export default function App() {
  return <Shell />;
}
