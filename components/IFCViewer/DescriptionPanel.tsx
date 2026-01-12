"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface DescriptionPanelProps {
  darkMode: boolean;
  activeTool: "clipper" | "length" | "area" | "colorize" | "collision" | "search" | "multi-select" | null;
}

const DescriptionPanel: React.FC<DescriptionPanelProps> = ({ darkMode, activeTool }) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getDescription = () => {
    if (!isClient) return null;
    switch (activeTool) {
      case "clipper":
        return (
          <div className="text-left">
            <div className="mb-1 font-bold text-center">
              <span><b>{t("clipper_description_title")}</b></span>
            </div>            
            <hr/>
            <span><b>{t("clipper_description_1")}</b></span>
            <br/>
            <span><b>{t("clipper_description_2")}</b></span>
            <br/>
            <span><b>{t("clipper_description_3")}</b></span>
            <br/>
            <span><b>{t("clipper_description_4")}</b></span>
            <br/>
            <span><b>{t("clipper_description_5")}</b></span>
          </div>        
      );
      case "length":
        return (
          <div className="text-left">
            <div className="mb-1 font-bold text-center">
              <span><b>{t("length_measurement_description_title")}</b></span>
            </div>            
            <hr/>
            <span><b>{t("length_measurement_description_1")}</b></span>
            <br/>
            <span><b>{t("length_measurement_description_2")}</b></span>
            <br/>
            <span><b>{t("clipper_description_5")}</b></span>
          </div>        
      );
      case "area":
        return (
          <div className="text-left">
            <div className="mb-1 font-bold text-center">
              <span><b>{t("area_measurement_description_title")}</b></span>
            </div>            
            <hr/>
            <span><b>{t("area_measurement_description_1")}</b></span>
            <br/>
            <span><b>{t("area_measurement_description_2")}</b></span>
            <br/>
            <span><b>{t("area_measurement_description_3")}</b></span>
            <br/>
            <span><b>{t("clipper_description_5")}</b></span>
          </div>        
      );
      case "colorize":
        return (
          <div className="text-left">
            <div className="mb-1 font-bold text-center">
              <span><b>{t("colorize_description_title")}</b></span>
            </div>
            <hr />
            <span><b>{t("colorize_description_1")}</b></span>
          </div>
        );
      case "multi-select":
        return (
          <div className="text-left">
            <div className="mb-1 font-bold text-center">
              <span><b>{t("multi_select_description_title")}</b></span>
            </div>
            <hr />
            <span><b>{t("multi_select_description_1")}</b></span>
          </div>
        );
      default:
        return (
          <div className="text-left">
            <p>{t("no_tool_selected")}</p>
          </div>
        );
    }
  };

  return (
    <div
      className={`p-4 h-full rounded-xl shadow-lg backdrop-blur-sm ${
        darkMode ? "bg-gray-800/70 text-white" : "bg-white/70 text-black"
      }`}
    >
      <h2 className="text-lg font-bold mb-4">{t("tool_description")}</h2>
      {getDescription()}
    </div>
  );
};

export default DescriptionPanel;
