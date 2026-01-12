"use client";

import React, { useState } from "react";
import * as OBC from "@thatopen/components";
import { Eye, Focus, Ghost, EyeOff, Scissors, Ruler, Square, BoxSelect, Info, Boxes, ChevronUp, ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface MobileActionButtonsProps {
  components: OBC.Components;
  darkMode: boolean;
  onToggleVisibility: () => void;
  onIsolate: () => void;
  onFocus: () => void;
  onShow: () => void;
  onGhost: () => void;
  isGhost: boolean;
  onToggleShadowScene: () => void;
  isShadowed: boolean;
  activeTool: "clipper" | "length" | "area" | "multi-select" | null;
  onSelectTool: (tool: "clipper" | "length" | "area" | "multi-select" | null) => void;
  onToggleInfo: () => void;
  isInfoOpen: boolean;
  isMultiSelectActive: boolean;
  lengthMode: "free" | "edge";
  setLengthMode: (mode: "free" | "edge") => void;
  areaMode: "free" | "square";
  setAreaMode: (mode: "free" | "square") => void;
  onMeasurementCreate: () => void;
  onMeasurementDelete: () => void;
}

type ButtonCategory = "visibility" | "mode" | "tools";

const MobileActionButtons: React.FC<MobileActionButtonsProps> = ({
  components,
  darkMode,
  onToggleVisibility,
  onIsolate,
  onFocus,
  onShow,
  onGhost,
  isGhost,
  onToggleShadowScene,
  isShadowed,
  activeTool,
  onSelectTool,
  onToggleInfo,
  isInfoOpen,
  isMultiSelectActive,
  lengthMode,
  setLengthMode,
  areaMode,
  setAreaMode,
  onMeasurementCreate,
  onMeasurementDelete,
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ButtonCategory>("visibility");

  const handleToggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleCategorySelect = (category: ButtonCategory) => {
    setActiveCategory(category);
    setIsMenuOpen(false);
  };

  const handleToolSelect = (tool: "clipper" | "length" | "area" | "multi-select" | null) => {
    onSelectTool(activeTool === tool ? null : tool);
  };

  const buttonClass = (tool: string | null) =>
    `flex-1 p-2 rounded-none flex justify-center items-center ${activeTool === tool && tool !== null ? (darkMode ? "bg-blue-600" : "bg-blue-400") : (darkMode ? "hover:bg-gray-700" : "hover:bg-gray-300")}`;

  const renderButtonsForCategory = (category: ButtonCategory) => {
    switch (category) {
      case "visibility":
        return (
          <>
            <button onClick={onFocus} className={buttonClass(null)}><Focus size={32} /></button>
            <button onClick={onToggleVisibility} className={buttonClass(null)}><EyeOff size={32} /></button>
            <button onClick={onIsolate} className={buttonClass(null)}><BoxSelect size={32} /></button>
            <button onClick={onShow} className={buttonClass(null)}><Eye size={32} /></button>
          </>
        );
      case "mode":
        return (
          <>
            <button onClick={onGhost} className={`flex-1 p-2 rounded-none flex justify-center items-center ${isGhost ? (darkMode ? "bg-blue-600" : "bg-blue-400") : (darkMode ? "hover:bg-gray-700" : "hover:bg-gray-300")}`}><Ghost size={32} /></button>
            <button onClick={onToggleShadowScene} className={`flex-1 p-2 rounded-none flex justify-center items-center ${isShadowed ? (darkMode ? "bg-blue-600" : "bg-blue-400") : (darkMode ? "hover:bg-gray-700" : "hover:bg-gray-300")}`}><Icon icon="radix-icons:shadow" width="32" height="32" /></button>
            <button onClick={() => onSelectTool("multi-select")} className={`${buttonClass("multi-select")} ${isMultiSelectActive ? (darkMode ? "bg-blue-600" : "bg-blue-400") : ""}`}><Boxes size={32} /></button>
          </>
        );
      case "tools":
        if (activeTool === "length") {
          return (
            <>
              <button onClick={() => setLengthMode("free")} className={`flex-1 p-2 text-sm ${lengthMode === 'free' ? 'bg-blue-500' : ''}`}>{t("free")}</button>
              <button onClick={() => setLengthMode("edge")} className={`flex-1 p-2 text-sm ${lengthMode === 'edge' ? 'bg-blue-500' : ''}`}>{t("edge")}</button>
              <button onClick={onMeasurementCreate} className="flex-1 p-2 text-sm bg-green-500">{t("finish")}</button>
              <button onClick={onMeasurementDelete} className="flex-1 p-2 text-sm bg-red-500">{t("delete")}</button>
            </>
          );
        }
        if (activeTool === "area") {
          return (
            <>
              <button onClick={() => setAreaMode("free")} className={`flex-1 p-2 text-sm ${areaMode === 'free' ? 'bg-blue-500' : ''}`}>{t("free")}</button>
              <button onClick={() => setAreaMode("square")} className={`flex-1 p-2 text-sm ${areaMode === 'square' ? 'bg-blue-500' : ''}`}>{t("square")}</button>
              <button onClick={onMeasurementCreate} className="flex-1 p-2 text-sm bg-green-500">{t("finish")}</button>
              <button onClick={onMeasurementDelete} className="flex-1 p-2 text-sm bg-red-500">{t("delete")}</button>
            </>
          );
        }
        return (
          <>
            <button onClick={() => handleToolSelect("clipper")} className={buttonClass("clipper")}><Scissors size={32} /></button>
            {/* <button onClick={() => handleToolSelect("length")} className={buttonClass("length")}><Ruler size={32} /></button>
            <button onClick={() => handleToolSelect("area")} className={buttonClass("area")}><Square size={32} /></button> */}
            <button onClick={onToggleInfo} className={`flex-1 p-2 rounded-none flex justify-center items-center ${isInfoOpen ? (darkMode ? "bg-blue-600" : "bg-blue-400") : (darkMode ? "hover:bg-gray-700" : "hover:bg-gray-300")}`}><Info size={32} /></button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"} border-t border-b`}>
      <div className={`absolute bottom-full left-0 w-1/5 flex flex-col-reverse items-center bg-inherit divide-y-reverse divide-y divide-white dark:divide-gray-600 transition-all duration-300 ease-in-out transform ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button className="w-full p-2 hover:bg-gray-300 dark:hover:bg-gray-700" onClick={() => handleCategorySelect("tools")}>{t("tools")}</button>
        <button className="w-full p-2 hover:bg-gray-300 dark:hover:bg-gray-700" onClick={() => handleCategorySelect("mode")}>{t("mode")}</button>
        <button className="w-full p-2 hover:bg-gray-300 dark:hover:bg-gray-700" onClick={() => handleCategorySelect("visibility")}>{t("visibility")}</button>
      </div>
      <div className="flex items-stretch divide-x divide-white dark:divide-gray-600 h-16">
        <button
          onClick={activeTool === 'length' || activeTool === 'area' ? () => onSelectTool(null) : handleToggleMenu}
          className="flex-1 h-full p-2 rounded-none hover:bg-gray-300 dark:hover:bg-gray-700 flex justify-center items-center gap-2"
        >
          <span>{activeTool === 'length' ? t('length_mode') : activeTool === 'area' ? t('area_mode') : t(activeCategory)}</span>
          {activeTool === 'length' || activeTool === 'area' ? <X size={16} /> : (isMenuOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />)}
        </button>
        {renderButtonsForCategory(activeCategory)}
      </div>
    </div>
  );
};

export default MobileActionButtons;