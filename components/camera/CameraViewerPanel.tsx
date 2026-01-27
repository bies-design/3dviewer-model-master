"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, Spinner, Switch, Tooltip } from "@heroui/react";
import { X, Plus, Bell, BellOff, History } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import CameraPlayer from "@/components/camera/CameraPlayer";
import AddCameraModal from "@/components/camera/AddCameraModal";
import CameraAlarmHistoryPanel from "@/components/camera/CameraAlarmHistoryPanel";

interface CameraViewerPanelProps {
  onClose?: () => void;
  onLocate?: (elementName: string) => void;
}

const CameraViewerPanel: React.FC<CameraViewerPanelProps> = ({ onClose, onLocate }) => {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [alarmIds, setAlarmIds] = useState<Set<string>>(new Set());
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);
  const [alarmHistory, setAlarmHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const alarmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCameras = async () => {
    try {
      const response = await fetch("/api/cameras");
      if (response.ok) {
        const data = await response.json();
        setCameras(data);
      }
    } catch (error) {
      console.error("Failed to fetch cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  useEffect(() => {
    if (cameras.length === 0 || !isAlarmEnabled) {
      setAlarmIds(new Set());
      return;
    }

    const interval = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...cameras].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(count, cameras.length));
      
      const newAlarmIds = new Set(selected.map(c => c.id));
      setAlarmIds(newAlarmIds);

      const alarmMessage = selected.map(c => c.title).join(", ");
      setToast({
        message: `${t("camera_alarm_detected")}: ${alarmMessage}`,
        type: "error"
      });

      const newEvents = selected.map(c => ({
        id: `alarm-${c.id}-${Date.now()}-${Math.random()}`,
        cameraIds: [c.id],
        cameraTitle: c.title,
        elementName: c.elementName,
        timestamp: new Date()
      }));
      setAlarmHistory(prev => [...prev, ...newEvents].slice(-50));

      if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = setTimeout(() => {
        setAlarmIds(new Set());
      }, 10000);

    }, 15000);

    return () => {
      clearInterval(interval);
      if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    };
  }, [cameras, t, isAlarmEnabled]);

  const toggleMinimize = (id: string) => {
    setMinimizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAlarmEvent = (cameraIds: string[], elementName?: string) => {
    if (elementName && onLocate) {
      onLocate(elementName);
      return;
    }
    setMinimizedIds((prev) => {
      const next = new Set(prev);
      cameras.forEach(c => {
        if (cameraIds.includes(c.id)) {
          next.delete(c.id);
        } else {
          next.add(c.id);
        }
      });
      return next;
    });
  };

  const handleShowAll = () => {
    setMinimizedIds(new Set());
  };

  const expandedCount = cameras.filter(c => !minimizedIds.has(c.id)).length;
  const totalCount = cameras.length;
  
  let gridCols = 1;
  if (expandedCount > 1) gridCols = 2;
  if (expandedCount > 4) gridCols = 3;
  if (expandedCount > 9) gridCols = 4;
  if (expandedCount > 16) gridCols = 5;

  const rows = expandedCount > 0 ? Math.ceil(expandedCount / gridCols) : 1;

  if (loading) {
    return (
      <div className="w-full h-dvh bg-black flex items-center justify-center">
        <Spinner color="white" label={t("loading_cameras")} />
      </div>
    );
  }

  return (
    <div className="w-full h-dvh bg-black flex flex-col overflow-hidden">
      <div className="p-2 bg-zinc-900 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold ml-2">{t("camera_viewer")} ({totalCount})</h1>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-white"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={20} />
          </Button>
          <div className="flex items-center gap-2 bg-zinc-800/50 px-2 py-1 rounded-full border border-zinc-700">
            <span className="text-tiny text-zinc-400 ml-1">
              {/* {t("simulate_alarm")} */}
              alarm
            </span>
            <Switch
              size="sm"
              color="danger"
              isSelected={isAlarmEnabled}
              onValueChange={setIsAlarmEnabled}
              startContent={<Bell size={12} />}
              endContent={<BellOff size={12} />}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 mr-2">
          <Tooltip content={t("alarm_history")}>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className={`transition-all ${
                isHistoryOpen ? "text-red-500" : "text-white"
              }`}
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            >
              <History size={20} />
            </Button>
          </Tooltip>
          {onClose && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="text-white"
              onPress={onClose}
            >
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      {minimizedIds.size > 0 && (
        <div className="flex flex-wrap gap-1 p-1 bg-zinc-900 border-b border-zinc-800 shrink-0 max-h-[20%] overflow-y-auto">
          {cameras.filter(c => minimizedIds.has(c.id)).map(camera => (
            <div key={camera.id} className="w-72 h-[48px]">
              <CameraPlayer
                hlsUrl={camera.hlsUrl}
                webrtcUrl={camera.webrtcUrl}
                title={camera.title}
                elementName={camera.elementName}
                isMinimized={true}
                isAlarm={alarmIds.has(camera.id)}
                onMinimizeToggle={() => toggleMinimize(camera.id)}
                onLocate={onLocate}
              />
            </div>
          ))}
          {expandedCount === 0 && (
            <div className="flex items-center justify-center text-zinc-500 italic">
              {t("all_cameras_minimized")}
            </div>
          )}
          <div className="flex items-center px-2 ml-auto">
            <Button
              size="sm"
              variant="flat"
              className="bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
              onClick={handleShowAll}
            >
              {t("show_all")}
            </Button>
          </div>
        </div>
      )}

      <div
        className="flex-1 grid gap-1 p-1 min-h-0"
        style={{
          gridTemplateColumns: expandedCount > 0 ? `repeat(${gridCols}, minmax(0, 1fr))` : "1fr",
          gridTemplateRows: expandedCount > 0 ? `repeat(${rows}, minmax(0, 1fr))` : "1fr",
        }}
      >
        {cameras.filter(c => !minimizedIds.has(c.id)).map((camera) => (
          <div key={camera.id} className="relative w-full h-full overflow-hidden">
            <CameraPlayer
              hlsUrl={camera.hlsUrl}
              webrtcUrl={camera.webrtcUrl}
              title={camera.title}
              elementName={camera.elementName}
              isMinimized={false}
              isAlarm={alarmIds.has(camera.id)}
              onMinimizeToggle={() => toggleMinimize(camera.id)}
              onLocate={onLocate}
            />
          </div>
        ))}
        {expandedCount === 0 && (
          <div className="flex items-center justify-center text-zinc-500 italic">
            {t("all_cameras_minimized")}
          </div>
        )}
      </div>

      {isHistoryOpen && (
        <CameraAlarmHistoryPanel
          history={alarmHistory}
          onClose={() => setIsHistoryOpen(false)}
          onSelectEvent={handleSelectAlarmEvent}
        />
      )}

      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchCameras}
        nextId={`cam${cameras.length + 1}`}
      />
    </div>
  );
};

export default CameraViewerPanel;