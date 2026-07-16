import {
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  BriefcaseBusiness,
  Building2,
  FileClock,
  LayoutDashboard,
  LogOut,
  UsersRound,
} from "lucide-react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "./api";
import { Preferences } from "./Preferences";
import { UserMenu } from "./UserMenu";
import { useSession } from "./store";
import { useTranslation } from "react-i18next";

export default function AdminPortal() {
  const logout = useSession((s) => s.logout);
  const { t } = useTranslation();
  return (
    <div className="admin-shell">
      <aside>
        <div className="logo">
          <span>H</span>HireHub
        </div>
        <p>{t("admin.platform")}</p>
        <nav>
          <NavLink end to="/admin">
            <LayoutDashboard />
            {t("admin.overview")}
          </NavLink>
          <NavLink to="/admin/companies">
            <Building2 />
            {t("admin.companies")}
          </NavLink>
          <NavLink to="/admin/users">
            <UsersRound />
            {t("admin.users")}
          </NavLink>
          <NavLink to="/admin/jobs">
            <BriefcaseBusiness />
            {t("admin.jobs")}
          </NavLink>
          <NavLink to="/admin/audit">
            <FileClock />
            {t("admin.audit")}
          </NavLink>
        </nav>
        <button onClick={logout}>
          <LogOut />
          {t("common.logout")}
        </button>
      </aside>
      <section className="admin-content">
        <header>
          <Text fw={700}>{t("admin.title")}</Text>
          <Group ml="auto">
            <Preferences />
            <UserMenu
              name="Platform Admin"
              email="admin@hirehub.vn"
              initials="PA"
              portal="admin"
            />
          </Group>
        </header>
        <main>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="companies" element={<Companies />} />
            <Route path="users" element={<Users />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="audit" element={<Audit />} />
            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </main>
      </section>
    </div>
  );
}
function Dashboard() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ["admin", "summary"],
    queryFn: adminApi.summary,
  });
  const data = query.data || {
    users: 0,
    companies: 0,
    jobs: 0,
    applications: 0,
    proSubscriptions: 0,
    failedJobs: 0,
  };
  return (
    <Stack>
      <div>
        <Text size="xs" fw={700} c="violet">
          {t("admin.platform")}
        </Text>
        <Title order={2}>{t("admin.center")}</Title>
        <Text c="dimmed" size="sm">
          {t("admin.metrics")}
        </Text>
      </div>
      {query.isError && <ErrorState retry={() => query.refetch()} />}
      <SimpleGrid cols={{ base: 2, lg: 6 }}>
        <Metric label={t("admin.users")} value={data.users} />
        <Metric label={t("admin.companies")} value={data.companies} />
        <Metric label={t("admin.activeJobs")} value={data.jobs} />
        <Metric label={t("admin.applications")} value={data.applications} />
        <Metric label={t("admin.plans")} value={data.proSubscriptions} />
        <Metric label={t("admin.failedJobs")} value={data.failedJobs} />
      </SimpleGrid>
    </Stack>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card withBorder>
      <Text c="dimmed" size="xs">
        {label}
      </Text>
      <Title order={2}>{value}</Title>
    </Card>
  );
}
function Companies() {
  const { t } = useTranslation();
  const client = useQueryClient(),
    query = useQuery({
      queryKey: ["admin", "companies"],
      queryFn: adminApi.companies,
    });
  const update = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "VERIFIED" | "SUSPENDED";
    }) => adminApi.companyStatus(id, status),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  return (
    <Stack>
      <Title order={2}>{t("admin.companies")}</Title>
      {query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <Card withBorder>
          <Table.ScrollContainer minWidth={760}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("admin.company")}</Table.Th>
                  <Table.Th>{t("admin.status")}</Table.Th>
                  <Table.Th>{t("admin.members")}</Table.Th>
                  <Table.Th>{t("admin.jobs")}</Table.Th>
                  <Table.Th>{t("admin.plan")}</Table.Th>
                  <Table.Th>{t("admin.action")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(query.data || []).map((row) => {
                  const count = row._count as
                      { members?: number; jobs?: number } | undefined,
                    subscription = row.subscription as
                      { plan?: string } | undefined,
                    status = String(row.status);
                  return (
                    <Table.Tr key={String(row.id)}>
                      <Table.Td>
                        <Text fw={700}>{String(row.name)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            status === "VERIFIED"
                              ? "teal"
                              : status === "SUSPENDED"
                                ? "red"
                                : "orange"
                          }
                        >
                          {status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{count?.members || 0}</Table.Td>
                      <Table.Td>{count?.jobs || 0}</Table.Td>
                      <Table.Td>{subscription?.plan || "FREE"}</Table.Td>
                      <Table.Td>
                        <Button
                          size="xs"
                          loading={update.isPending}
                          color={status === "VERIFIED" ? "red" : "teal"}
                          variant="light"
                          onClick={() =>
                            update.mutate({
                              id: String(row.id),
                              status:
                                status === "VERIFIED"
                                  ? "SUSPENDED"
                                  : "VERIFIED",
                            })
                          }
                        >
                          {status === "VERIFIED"
                            ? t("admin.suspend")
                            : t("admin.verify")}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </Stack>
  );
}
function Users() {
  const { t } = useTranslation();
  const client = useQueryClient(),
    query = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users }),
    update = useMutation({
      mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
        adminApi.userStatus(id, suspended),
      onSuccess: () =>
        client.invalidateQueries({ queryKey: ["admin", "users"] }),
    });
  return (
    <Stack>
      <Title order={2}>{t("admin.users")}</Title>
      {query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <Card withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("admin.name")}</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>{t("admin.role")}</Table.Th>
                <Table.Th>{t("admin.status")}</Table.Th>
                <Table.Th>{t("admin.action")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(query.data || []).map((row) => {
                const suspended = Boolean(row.suspendedAt);
                return (
                  <Table.Tr key={String(row.id)}>
                    <Table.Td>{String(row.name)}</Table.Td>
                    <Table.Td>{String(row.email)}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{String(row.role)}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={suspended ? "red" : "teal"}>
                        {suspended ? "SUSPENDED" : "ACTIVE"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        color={suspended ? "teal" : "red"}
                        variant="light"
                        loading={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: String(row.id),
                            suspended: !suspended,
                          })
                        }
                      >
                        {suspended ? t("admin.restore") : t("admin.suspend")}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
function Jobs() {
  const { t } = useTranslation();
  const client = useQueryClient(),
    query = useQuery({ queryKey: ["admin", "jobs"], queryFn: adminApi.jobs }),
    update = useMutation({
      mutationFn: ({
        id,
        status,
      }: {
        id: string;
        status: "PUBLISHED" | "PAUSED" | "CLOSED";
      }) => adminApi.jobStatus(id, status),
      onSuccess: () =>
        client.invalidateQueries({ queryKey: ["admin", "jobs"] }),
    });
  return (
    <Stack>
      <Title order={2}>{t("admin.moderation")}</Title>
      {query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          {(query.data || []).map((row) => {
            const company = row.company as { name?: string; status?: string };
            return (
              <Card key={String(row.id)} withBorder>
                <Group justify="space-between">
                  <Badge>{String(row.status)}</Badge>
                  <Badge
                    color={company?.status === "VERIFIED" ? "teal" : "orange"}
                  >
                    {company?.status}
                  </Badge>
                </Group>
                <Title order={4} mt="md">
                  {String(row.title)}
                </Title>
                <Text c="dimmed" size="sm">
                  {company?.name}
                </Text>
                <Text size="sm" mt="md" lineClamp={3}>
                  {String(row.description)}
                </Text>
                <Group mt="md">
                  <Button
                    size="xs"
                    variant="light"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate({
                        id: String(row.id),
                        status:
                          String(row.status) === "PAUSED"
                            ? "PUBLISHED"
                            : "PAUSED",
                      })
                    }
                  >
                    {String(row.status) === "PAUSED"
                      ? t("admin.approve")
                      : t("admin.pause")}
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() =>
                      update.mutate({ id: String(row.id), status: "CLOSED" })
                    }
                  >
                    {t("admin.close")}
                  </Button>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}
function Audit() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: adminApi.audit,
  });
  return (
    <Stack>
      <Title order={2}>{t("admin.audit")}</Title>
      {query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <Card withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("admin.time")}</Table.Th>
                <Table.Th>{t("admin.action")}</Table.Th>
                <Table.Th>{t("admin.entity")}</Table.Th>
                <Table.Th>{t("admin.company")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(query.data || []).map((row) => (
                <Table.Tr key={String(row.id)}>
                  <Table.Td>
                    {new Date(String(row.createdAt)).toLocaleString()}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{String(row.action)}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {String(row.entityType)} · {String(row.entityId)}
                  </Table.Td>
                  <Table.Td>
                    {String(
                      (row.company as { name?: string })?.name || "Platform",
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
function ErrorState({ retry }: { retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Card withBorder>
      <Text c="red">{t("admin.error")}</Text>
      <Button size="xs" mt="sm" onClick={retry}>
        {t("common.retry")}
      </Button>
    </Card>
  );
}
