"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Sun, BarChart } from "lucide-react";
import CameraControls from "./CameraControls";
import ShadowScenePanel from "./ShadowScenePanel";
import ControlPanel from "./ControlPanel";
import * as OBC from "@thatopen/components";

interface PreferenceSettingsProps {
  darkMode: boolean;
  projection: "Perspective" | "Orthographic";
  navigation: "Orbit" | "FirstPerson" | "Plan";
  setProjection: React.Dispatch<React.SetStateAction<"Perspective" | "Orthographic">>;
  setNavigation: React.Dispatch<React.SetStateAction<"Orbit" | "FirstPerson" | "Plan">>;
  worldRef: React.RefObject<any>;
  components: OBC.Components | null;
  showGauges: {
    kw: { ring: boolean; line: boolean };
    temp: { ring: boolean; line: boolean };
    humi: { ring: boolean; line: boolean };
    co2: { ring: boolean; line: boolean };
  };
  setShowGauges: React.Dispatch<React.SetStateAction<{
    kw: { ring: boolean; line: boolean };
    temp: { ring: boolean; line: boolean };
    humi: { ring: boolean; line: boolean };
    co2: { ring: boolean; line: boolean };
  }>>;
  showVisitors: boolean;
  setShowVisitors: React.Dispatch<React.SetStateAction<boolean>>;
  intervalMs: number;
  setIntervalMs: React.Dispatch<React.SetStateAction<number>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

const PreferenceSettings: React.FC<PreferenceSettingsProps> = ({
  darkMode,
  projection,
  navigation,
  setProjection,
  setNavigation,
  worldRef,
  components,
  showGauges,
  setShowGauges,
  showVisitors,
  setShowVisitors,
  intervalMs,
  setIntervalMs,
  activeTab,
  setActiveTab,
}) => {
  const { t } = useTranslation();
  const tabs = ["camera", "chart", "shadows"];
  const activeIndex = tabs.indexOf(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "camera":
        return (
          <CameraControls
            darkMode={darkMode}
            projection={projection}
            navigation={navigation}
            setProjection={setProjection}
            setNavigation={setNavigation}
            worldRef={worldRef}
          />
        );
      case "shadows":
        return components ? <ShadowScenePanel components={components} /> : null;
      case "chart":
        return (
          <ControlPanel
            showGauges={showGauges}
            setShowGauges={setShowGauges}
            showVisitors={showVisitors}
            setShowVisitors={setShowVisitors}
            intervalMs={intervalMs}
            setIntervalMs={setIntervalMs}
            darkMode={darkMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative border-b border-gray-300 dark:border-gray-700">
        <div className="grid grid-cols-3">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
              activeTab === "camera"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Camera size={16} className="flex-shrink-0" />
            <span className="flex-shrink-0">{t("camera")}</span>
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
              activeTab === "chart"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <BarChart size={16} className="flex-shrink-0" />
            <span className="flex-shrink-0">{t("chart")}</span>
          </button>
          <button
            onClick={() => setActiveTab("shadows")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
              activeTab === "shadows"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Sun size={16} className="flex-shrink-0" />
            <span className="flex-shrink-0">{t("shadows")}</span>
          </button>
        </div>
        <div
          className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-300"
          style={{
            width: `${100 / tabs.length}%`,
            left: `${(activeIndex * 100) / tabs.length}%`,
          }}
        />
      </div>
      <div className="flex-grow overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
};

export default PreferenceSettings;