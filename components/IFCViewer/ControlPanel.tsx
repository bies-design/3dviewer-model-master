"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Switch, Tooltip } from "@heroui/react";
import { Zap, Thermometer, Droplets, Cloud, Gauge, BarChart, Power } from "lucide-react";

interface ControlPanelProps {
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
  darkMode: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  showGauges,
  setShowGauges,
  showVisitors,
  setShowVisitors,
  intervalMs,
  setIntervalMs,
  darkMode,
}) => {
  const { t } = useTranslation();
  const [customInput, setCustomInput] = useState("");

  const handleSpeedChange = () => {
    setIntervalMs((prev) => {
      if (prev === 10000) return 5000;
      if (prev === 5000) return 3000;
      return 10000;
    });
  };

  const handleCustomInput = () => {
    const seconds = parseFloat(customInput);
    if (!isNaN(seconds) && seconds > 0) {
      setIntervalMs(seconds * 1000);
    }
  };

  const speedLabel = useMemo(() => {
    if (intervalMs === 10000) return "speed：slow (10s)";
    if (intervalMs === 5000) return "speed：medium (5s)";
    return "speed：fast (3s)";
  }, [intervalMs]);

  return (
    <div className="">
      <h3 className="text-xl font-semibold">{t("control_panel")}</h3>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {(Object.keys(showGauges) as Array<keyof typeof showGauges>).map((key) => {
          const { ring, line } = showGauges[key];
          const Icon = {
            kw: Zap,
            temp: Thermometer,
            humi: Droplets,
            co2: Cloud,
          }[key] || Gauge;
          return (
            <div key={key} className="flex flex-row items-stretch p-2 rounded-lg bg-gray-700">
              <div className="flex items-center pr-2">
                <Icon size={24} />
              </div>
              <div className="border-l border-gray-500"></div>
              <div className="flex flex-col flex-grow pl-2 gap-y-2">
                <div className="flex justify-center w-full">
                  <Tooltip content={t("toggle_all")}>
                    <Switch
                      isSelected={ring || line}
                      onChange={() => setShowGauges(prev => ({ ...prev, [key]: { ring: !ring, line: !line } }))}
                      size="lg"
                      startContent={<Power size={16} />}
                      endContent={<Power size={16} />}
                    />
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip content={t("ring_chart")}>
                    <button onClick={() => setShowGauges(prev => ({ ...prev, [key]: { ...prev[key], ring: !ring } }))} className={`p-2 rounded ${ring ? 'bg-blue-600' : 'bg-gray-500'} w-full flex justify-center`}>
                      <Gauge size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("line_chart")}>
                    <button onClick={() => setShowGauges(prev => ({ ...prev, [key]: { ...prev[key], line: !line } }))} className={`p-2 rounded ${line ? 'bg-blue-600' : 'bg-gray-500'} w-full flex justify-center`}>
                      <BarChart size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          );
        })}
        <Tooltip content={t("visitors_chart")}>
          <button onClick={() => setShowVisitors(!showVisitors)} className={`col-span-2 p-2 rounded flex items-center justify-center ${showVisitors ? (darkMode ? "bg-blue-900" : "bg-blue-700") : (darkMode ? "bg-custom-blue-600 hover:bg-custom-blue-700" : "bg-custom-blue-500 hover:bg-custom-blue-600")}`}>
            <BarChart size={18} />
          </button>
        </Tooltip>
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSpeedChange}
          className="px-2 py-1 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 mr-2"
        >
          {speedLabel}
        </button>
        <input
          type="number"
          min="1"
          placeholder="custom interval (s)"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onBlur={handleCustomInput}
          onKeyDown={(e) => e.key === "Enter" && handleCustomInput()}
          className="w-24 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-xl text-gray-700 dark:text-gray-300">s</span>
      </div>
    </div>
  );
};

export default ControlPanel;