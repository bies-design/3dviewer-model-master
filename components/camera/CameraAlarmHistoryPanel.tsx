"use client";

import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ScrollShadow } from "@heroui/react";
import { X, History, AlertCircle, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import Draggable from "react-draggable";

interface AlarmEvent {
  id: string;
  cameraIds: string[];
  cameraTitle: string;
  elementName?: string;
  timestamp: Date;
}

interface CameraAlarmHistoryPanelProps {
  history: AlarmEvent[];
  onClose: () => void;
  onSelectEvent: (cameraIds: string[], elementName?: string) => void;
}

const CameraAlarmHistoryPanel: React.FC<CameraAlarmHistoryPanelProps> = ({ history, onClose, onSelectEvent }) => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const nodeRef = useRef(null);

  return (
    <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent" disabled={isMaximized}>
      <div
        ref={nodeRef}
        className={`absolute right-4 bottom-4 w-80 bg-zinc-900 border border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 rounded-lg overflow-hidden transition-all ${
          isMaximized ? "h-[calc(100%-2rem)] top-4" : "h-[400px]"
        }`}
      >
        <div className="drag-handle p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md cursor-move active:cursor-grabbing group">
          <div className="flex items-center gap-2 text-white">
            {!isMaximized && <GripHorizontal size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />}
            <History size={18} className="text-zinc-400" />
            <span className="font-bold text-sm">{t("alarm_history")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="text-zinc-400"
              onClick={() => setIsMaximized(!isMaximized)}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
            <Button isIconOnly size="sm" variant="light" className="text-zinc-400" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        </div>

      <ScrollShadow className="flex-1 p-4">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
            <History size={32} strokeWidth={1} />
            <p className="text-tiny">{t("no_alarm_history")}</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-zinc-800 ml-2 pl-4 space-y-6">
            {[...history].reverse().map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-red-500 border-4 border-zinc-900 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                  <div
                    className="bg-zinc-800/50 p-2 rounded border border-zinc-700/50 group hover:border-red-500/50 transition-colors cursor-pointer active:scale-[0.98]"
                    onClick={() => onSelectEvent(event.cameraIds, event.elementName)}
                  >
                    <div className="flex items-center gap-2 text-zinc-200 text-sm">
                      <AlertCircle size={14} className="text-red-500 shrink-0" />
                      <span className="font-medium break-words">{event.cameraTitle}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {t("camera_alarm_detected")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </ScrollShadow>
      </div>
    </Draggable>
  );
};

export default CameraAlarmHistoryPanel;