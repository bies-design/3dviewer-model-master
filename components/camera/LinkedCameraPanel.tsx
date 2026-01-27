"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import { X } from "lucide-react";
import CameraPlayer from "@/components/camera/CameraPlayer";

interface LinkedCameraPanelProps {
  cameras: any[];
  onClose: () => void;
  onLocate?: (elementName: string) => void;
  darkMode?: boolean;
}

const LinkedCameraPanel: React.FC<LinkedCameraPanelProps> = ({
  cameras,
  onClose,
  onLocate,
  darkMode = false,
}) => {
  const { t } = useTranslation();

  if (cameras.length === 0) return null;

  // Simple grid logic
  let gridCols = 1;
  if (cameras.length > 1) gridCols = 2;
  
  const rows = Math.ceil(cameras.length / gridCols);

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden ${darkMode ? "bg-zinc-950 text-white" : "bg-zinc-100 text-black"}`}>
      <div className={`p-2 flex justify-between items-center shrink-0 ${darkMode ? "bg-zinc-900" : "bg-zinc-200"}`}>
        <h2 className="text-sm font-bold ml-2">
          {t("linked_cameras")} ({cameras.length})
        </h2>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </div>

      <div
        className="flex-1 grid gap-1 p-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {cameras.map((camera) => (
          <div key={camera.id} className="relative w-full h-full overflow-hidden bg-black">
            <CameraPlayer
              hlsUrl={camera.hlsUrl}
              webrtcUrl={camera.webrtcUrl}
              title={camera.title}
              elementName={camera.elementName}
              onLocate={onLocate}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinkedCameraPanel;