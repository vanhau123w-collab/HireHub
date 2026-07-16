import {
  Avatar,
  Divider,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "./store";

type Props = {
  name: string;
  email: string;
  initials: string;
  portal: "candidate" | "recruiter" | "admin";
  color?: string;
};

export function UserMenu({
  name,
  email,
  initials,
  portal,
  color = "violet",
}: Props) {
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en");
  const destination =
    portal === "candidate"
      ? "/candidate/profile"
      : portal === "recruiter"
        ? "/recruiter/settings"
        : "/admin";
  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <Menu position="bottom-end" width={250} shadow="md" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className="user-menu-trigger"
          aria-label={english ? "Open account menu" : "Mở menu tài khoản"}
        >
          <Avatar size={34} radius="xl" color={color}>
            {initials}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <div className="user-menu-identity">
          <Group wrap="nowrap" gap="sm">
            <Avatar size={40} radius="xl" color={color}>
              {initials}
            </Avatar>
            <div>
              <Text fw={700} size="sm">
                {name}
              </Text>
              <Text size="xs" c="dimmed">
                {email}
              </Text>
            </div>
          </Group>
        </div>
        <Divider />
        <Menu.Item
          leftSection={
            portal === "candidate" ? (
              <UserRound size={16} />
            ) : (
              <Settings size={16} />
            )
          }
          onClick={() => navigate(destination)}
        >
          {portal === "candidate"
            ? english
              ? "My profile"
              : "Hồ sơ của tôi"
            : t("common.settings")}
        </Menu.Item>
        <Divider />
        <Menu.Item
          color="red"
          leftSection={<LogOut size={16} />}
          onClick={signOut}
        >
          {t("common.logout")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
