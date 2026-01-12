"use client";

import { FC } from "react";
import { Switch } from "@heroui/react";
import { SunIcon, MoonIcon } from "lucide-react";

interface ThemeSwitchProps {
  darkMode: boolean;
  toggleTheme: () => void;
  className?: string;
  collapsed?: boolean;
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
  darkMode,
  toggleTheme,
  className,
  collapsed = false,
}) => {
  return (
    <Switch
      isSelected={darkMode}
      onChange={toggleTheme}
      color="secondary"
      startContent={<MoonIcon size={18} />}
      endContent={<SunIcon size={18} />}
      size="lg"
      className={className}
    >
      {/* {!collapsed && (darkMode ? "Dark Mode" : "Light Mode")} */}
    </Switch>
  );
};
