"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";
import { Camera, Rotate3d, HatGlasses, Hand } from "lucide-react";
import { Tooltip } from "@heroui/react";

interface CameraControlsProps {
  darkMode: boolean;
  projection: "Perspective" | "Orthographic";
  navigation: "Orbit" | "FirstPerson" | "Plan";
  setProjection: React.Dispatch<React.SetStateAction<"Perspective" | "Orthographic">>;
  setNavigation: React.Dispatch<React.SetStateAction<"Orbit" | "FirstPerson" | "Plan">>;
  worldRef: React.MutableRefObject<any>;
}

export default function CameraControls({
  darkMode,
  projection,
  navigation,
  setProjection,
  setNavigation,
  worldRef,
}: CameraControlsProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [show2DMenu, setShow2DMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleProjectionChange = async (mode: "Perspective" | "Orthographic") => {
    const world = worldRef.current;
    if (!world) return;
    if (mode === projection) return;

    await world.camera.projection.set(mode);
    setProjection(mode);
    triggerToast(t("toast_projection", { mode }));
  };

  const handleNavigationChange = async (mode: "Orbit" | "FirstPerson" | "Plan") => {
    const world = worldRef.current;
    if (!world) return;
    if (mode === navigation) return;

    await world.camera.set(mode);
    setNavigation(mode);
    triggerToast(t("toast_navigation_mode", { mode: t(mode.toLowerCase()) }));
  };

  const handle2DView = async (
    orientation: "top" | "bottom" | "front" | "back" | "left" | "right"
  ) => {
    const world = worldRef.current;
    if (!world || !world.camera.hasCameraControls()) return;

    const boxer = world.components.get(OBC.BoundingBoxer);
    if (!boxer) return;

    const { position, target } = await boxer.getCameraOrientation(orientation);
    await world.camera.projection.set("Orthographic");
    await world.camera.controls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true
    );

    await world.camera.set("Plan");
    setNavigation("Plan");
    triggerToast(t("toast_2d_view", { orientation }));
  };

  const close2DView = async () => {
    const world = worldRef.current;
    if (!world) return;

    await world.camera.projection.set("Perspective");
    await world.camera.set("Orbit");
    setNavigation("Orbit");
    triggerToast(t("toast_closed_2d_view"));
  };

  return (
    <div className="relative flex flex-col h-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg
          ${darkMode ? "bg-dark-default-200/70 text-white hover:bg-dark-content4/70" : "bg-white/50 text-black hover:bg-gray-200/50"} transition-colors duration-200`}
      >
        <Camera size={18} />
        <span>Camera</span>
      </button>
        <div
          className={`top-full mt-2 flex flex-col gap-4 p-4 rounded-xl shadow-lg`}
        >
          {/* Projection */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-medium">{isClient ? t("projection") : "Projection"}</span>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleProjectionChange("Perspective")}
                disabled={projection === "Perspective"}
                className={`px-3 py-2 rounded-xl transition-colors duration-200 w-28 flex justify-center
                  ${projection === "Perspective"
                    ? (darkMode ? "bg-dark-content4 text-gray-400 cursor-not-allowed" : "bg-light-default-200 text-gray-400 cursor-not-allowed")
                    : (darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus")}`}
              >
                {isClient ? t("perspective") : "Perspective"}
              </button>
              
              <button
                onClick={() => {
                    handleProjectionChange("Orthographic");
                    if (navigation === "FirstPerson"){
                      worldRef.current?.camera.set("Orbit");
                      setNavigation("Orbit");
                      handleNavigationChange("Orbit");
                    }
                    worldRef.current?.camera.projection.set("Orthographic");
                    setProjection("Orthographic");                  
                  }}
                disabled={projection === "Orthographic"}
                className={`px-3 py-2 rounded-xl transition-colors duration-200 cursor-pointer w-28 flex justify-center
                  ${projection === "Orthographic"
                    ? (darkMode ? "bg-dark-content4 text-gray-400 cursor-not-allowed" : "bg-light-default-200 text-gray-400 cursor-not-allowed")
                    : (darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus")}`}
              >
                {isClient ? t("orthographic") : "Orthographic"}
              </button>
            </div>
          </div>

          <div className={`w-full h-px ${darkMode ? "bg-white" : "bg-gray-500"} opacity-50`}></div>

          {/* Navigation */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-medium">{isClient ? t("navigation_mode") : "Navigation Mode"}</span>
            <div className="grid grid-cols-3 gap-2 w-full">
              {(["Orbit", "FirstPerson", "Plan"] as const).map((mode) => (
                <Tooltip key={mode} content={isClient ? t(mode.toLowerCase()) : mode} placement="top">
                  <button
                    onClick={() => handleNavigationChange(mode)}
                    disabled={mode === navigation || (mode === "FirstPerson" && projection === "Orthographic")}
                    className={`p-2 rounded-xl flex justify-center items-center transition-colors duration-200 cursor-pointer
                      ${mode === navigation || (mode === "FirstPerson" && projection === "Orthographic")
                        ? (darkMode ? "bg-dark-content4 text-gray-400 cursor-not-allowed" : "bg-gray-400 text-gray-200 cursor-not-allowed")
                        : (darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus")}`}
                  >
                    {mode === "Orbit" && <Rotate3d size={20} />}
                    {mode === "FirstPerson" && <HatGlasses size={20} />}
                    {mode === "Plan" && <Hand size={20} />}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className={`w-full h-px ${darkMode ? "bg-white" : "bg-gray-500"} opacity-50`}></div>

          {/* 2D Views */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-medium">{isClient ? t("2d_views") : "2D Views"}</span>
            <div className="grid grid-cols-3 gap-2">
              {["top", "front", "left", "bottom", "back", "right"].map((o) => (
                <button
                  key={o}
                  onClick={() => handle2DView(o as any)}
                  className={`px-3 py-1 rounded-xl cursor-pointer flex justify-center w-16 ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"} transition-colors duration-200`}
                >
                  {isClient ? t(o) : o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={`w-full h-px ${darkMode ? "bg-white" : "bg-gray-500"} opacity-50`}></div>

          {/* Fit to Model */}
          <div className="flex flex-col justify-center items-center gap-2">
            <button
              onClick={() => worldRef.current?.camera.fitToItems()}
              className={`px-3 py-2 rounded-xl cursor-pointer w-full flex justify-center ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"} transition-colors duration-200`}
            >
              {isClient ? t("fit_to_model") : "Fit to Model"}
            </button>
          </div>
        </div>
      {/* Navigation Mode Message */}
      {toastMessage && (
        <div
          className={`absolute top-12 left-1/2 transform -translate-x-1/2 
            px-6 py-3 rounded-xl bg-black text-white text-lg font-medium 
            transition-opacity duration-500 ${showToast ? "opacity-70" : "opacity-0"}`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
