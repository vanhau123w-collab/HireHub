import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { candidateApi } from "./api";
import { useSession } from "./store";
import { useTranslation } from "react-i18next";
type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  link?: string;
};
const demo: Notice[] = [
  {
    id: "demo",
    title: "HireHub",
    body: "Your workspace is ready.",
    createdAt: new Date().toISOString(),
  },
];
export function NotificationsMenu() {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en");
  const online = Boolean(useSession((s) => s.token)),
    navigate = useNavigate(),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: candidateApi.notifications,
    enabled: online,
    refetchInterval: online ? 30_000 : false,
  });
  const rows: Notice[] = online ? query.data || [] : demo,
    unread = rows.filter((item) => !item.readAt).length;
  const read = useMutation({
    mutationFn: candidateApi.markNotificationRead,
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <Menu position="bottom-end" width={340} shadow="md">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label={english ? "Notifications" : "Thông báo"}
          pos="relative"
        >
          <Bell size={18} />
          {unread > 0 && (
            <Badge circle size="xs" pos="absolute" top={-2} right={-2}>
              {unread}
            </Badge>
          )}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Group justify="space-between" px="sm" py="xs">
          <Text fw={700}>{english ? "Notifications" : "Thông báo"}</Text>
          <Text size="xs" c="dimmed">
            {unread} {english ? "unread" : "chưa đọc"}
          </Text>
        </Group>
        <Menu.Divider />
        <Stack gap={0}>
          {rows.length === 0 ? (
            <Text p="md" size="sm" c="dimmed">
              {english ? "No notifications" : "Không có thông báo"}
            </Text>
          ) : (
            rows.slice(0, 8).map((item) => (
              <Menu.Item
                key={item.id}
                bg={
                  item.readAt ? undefined : "var(--mantine-color-violet-light)"
                }
                onClick={() => {
                  if (online && !item.readAt) read.mutate(item.id);
                  if (item.link) navigate(item.link);
                }}
              >
                <Text size="sm" fw={item.readAt ? 500 : 700}>
                  {item.title}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {item.body}
                </Text>
              </Menu.Item>
            ))
          )}
        </Stack>
        {query.isError && (
          <Button
            variant="subtle"
            color="red"
            size="xs"
            m="xs"
            onClick={() => query.refetch()}
          >
            {english ? "Retry" : "Thử lại"}
          </Button>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
