"use client";

import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@heroui/react";

interface LanguageSwitchProps {
  className?: string;
}

const ZhIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fill="currentColor">中</text>
  </svg>
);

const EnIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fill="currentColor">EN</text>
  </svg>
);

export const LanguageSwitch: FC<LanguageSwitchProps> = ({ className }) => {
  const { i18n } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
  };

  if (!isClient) {
    return null;
  }

  return (
    <Switch
      isSelected={i18n.language === "zh"}
      onChange={toggleLanguage}
      color="default"
      startContent={<ZhIcon />}
      endContent={<EnIcon />}
      size="lg"
      className={className}
    />
  );
};
