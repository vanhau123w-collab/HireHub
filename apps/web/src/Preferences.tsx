import {
  ActionIcon,
  Group,
  Select,
  useMantineColorScheme,
} from "@mantine/core";
import { Languages, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Preferences() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { i18n, t } = useTranslation();
  const dark = colorScheme === "dark";

  const changeLanguage = async (value: string | null) => {
    if (!value) return;
    localStorage.setItem("language", value);
    await i18n.changeLanguage(value);
  };

  return (
    <Group gap={6} className="preferences">
      <Languages size={16} aria-hidden="true" />
      <Select
        aria-label={t("common.language")}
        value={i18n.resolvedLanguage?.startsWith("en") ? "en" : "vi"}
        onChange={changeLanguage}
        data={[
          { value: "vi", label: "VI" },
          { value: "en", label: "EN" },
        ]}
        allowDeselect={false}
        size="xs"
        w={70}
      />
      <ActionIcon
        variant="subtle"
        size="lg"
        aria-label={dark ? t("common.lightMode") : t("common.darkMode")}
        onClick={() => setColorScheme(dark ? "light" : "dark")}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </ActionIcon>
    </Group>
  );
}
