// Viewpoints.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";

interface StoredViewpoint {
  id: string;
  title: string;
  snapshot: string | null;
  viewpoint: OBC.Viewpoint;
}

interface ViewpointsProps {
  darkMode: boolean;
  createViewpoint: () => Promise<OBC.Viewpoint | null>;
  updateViewpointCamera: (viewpoint: OBC.Viewpoint) => Promise<void>;
  setWorldCamera: (viewpoint: OBC.Viewpoint) => Promise<void>;
  getViewpointSnapshotData: (viewpoint: OBC.Viewpoint) => string | null;
  storedViews: StoredViewpoint[];
  setStoredViews: React.Dispatch<React.SetStateAction<StoredViewpoint[]>>;
}

export default function Viewpoints({
  darkMode,
  createViewpoint,
  updateViewpointCamera,
  setWorldCamera,
  getViewpointSnapshotData,
  storedViews,
  setStoredViews,
}: ViewpointsProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [currentView, setCurrentView] = useState<StoredViewpoint | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddViewpoint = async () => {
    const vp = await createViewpoint();
    if (!vp) return;
    const snapshot = getViewpointSnapshotData(vp);

    const newView: StoredViewpoint = {
      id: vp.guid,
      title: `Viewpoint ${storedViews.length + 1}`,
      snapshot,
      viewpoint: vp,
    };
    setCurrentView(newView);
  };

  const deleteViewpoint = (id: string) => {
    setStoredViews(prev => prev.filter(v => v.id !== id));
    if (currentView?.id === id) setCurrentView(null);
  };

  const selectViewpoint = (view: StoredViewpoint) => {
    setCurrentView(view);
    view.viewpoint.go();
  };

  const refreshSnapshot = async (view?: StoredViewpoint) => {
    const vp = view || currentView;
    if (!vp) return;

    await vp.viewpoint.takeSnapshot?.();
    const snapshot = getViewpointSnapshotData(vp.viewpoint);
    const updatedView = { ...vp, snapshot };

    setCurrentView(updatedView);
    setStoredViews(prev =>
      prev.map(v => (v.id === vp.id ? updatedView : v))
    );
  };

  const renameViewpoint = (id: string, newTitle: string) => {
    setStoredViews(prev =>
      prev.map(v => (v.id === id ? { ...v, title: newTitle } : v))
    );
    if (currentView?.id === id) {
      setCurrentView(prev => (prev ? { ...prev, title: newTitle } : prev));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-2">{isClient ? t("viewpoints") : "Viewpoints"}</h2>

      <button
        className={`w-full py-2 mb-2 rounded cursor-pointer text-white ${darkMode ? 'bg-dark-primary hover:bg-dark-focus' : 'bg-light-primary hover:bg-light-focus'}`}
        onClick={handleAddViewpoint}
      >
        {isClient ? t("create_viewpoint") : "Create Viewpoint"}
      </button>

      {currentView && (
        <div className="mb-2 flex flex-col gap-1">
          <button
            className={`py-1 rounded cursor-pointer text-white ${darkMode ? 'bg-custom-purple-600 hover:bg-custom-purple-700' : 'bg-custom-purple-500 hover:bg-custom-purple-600'}`}
            onClick={async () => {
              await updateViewpointCamera(currentView.viewpoint);
              await refreshSnapshot(currentView);
            }}
          >
            {isClient ? t("update_camera_snapshot") : "Update Camera & Snapshot"}
          </button>
        </div>
      )}

      <h3 className="font-semibold mt-4 mb-2">{isClient ? t("stored_viewpoints") : "Stored Viewpoints"}</h3>
      <div className="flex flex-col gap-2 max-h-150 overflow-y-auto">
        {storedViews.map(view => (
          <div
            key={view.id}
            className={`p-2 border rounded cursor-pointer ${
              currentView?.id === view.id
                ? (darkMode ? "border-dark-focus bg-dark-content2" : "border-light-focus bg-light-content2")
                : (darkMode ? "border-dark-divider" : "border-light-divider")
            }`}
            onClick={() => selectViewpoint(view)}
          >
            <div className="flex justify-between items-center gap-2">
              <img
                src={`data:image/png;base64,${view.snapshot}`}
                alt={view.title}
                className="w-28 h-32 object-cover"
              />
              <input
                type="text"
                value={view.title}
                onChange={e => renameViewpoint(view.id, e.target.value)}
                className={`border rounded p-1 text-sm flex-1 w-22 ${darkMode ? 'bg-dark-content3 text-white' : 'bg-light-content3 text-black'}`}
              />
              <button
                className={`font-bold ml-2 ${darkMode ? 'text-dark-danger hover:bg-dark-content3' : 'text-light-danger hover:bg-light-content3'}`}
                onClick={e => {
                  e.stopPropagation();
                  deleteViewpoint(view.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
