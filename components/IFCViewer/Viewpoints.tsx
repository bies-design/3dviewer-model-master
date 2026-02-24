"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";

export interface StoredViewpoint {
  id: string;
  title: string;
  snapshot: string | null;
  viewpoint: OBC.Viewpoint;
  userData?: any;
}

interface ViewpointsProps {
  darkMode: boolean;
  createViewpoint: () => Promise<OBC.Viewpoint | null>;
  updateViewpointCamera: (viewpoint: OBC.Viewpoint) => Promise<void>;
  setWorldCamera: (viewpoint: OBC.Viewpoint) => Promise<void>;
  getViewpointSnapshotData: (viewpoint: OBC.Viewpoint) => string | null;
  storedViews: StoredViewpoint[];
  setStoredViews: React.Dispatch<React.SetStateAction<StoredViewpoint[]>>;
  onDrawPath?: (doorName: string) => void; 
}

export default function Viewpoints({
  darkMode,
  createViewpoint,
  updateViewpointCamera,
  setWorldCamera,
  getViewpointSnapshotData,
  storedViews,
  setStoredViews,
  onDrawPath,
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
    setWorldCamera(view.viewpoint);
    if (onDrawPath) {
      onDrawPath(view.title);
    }
  };

  const refreshSnapshot = async (view?: StoredViewpoint) => {
    const vp = view || currentView;
    if (!vp) return;

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* <h2 className="text-lg font-bold mb-2 sticky top-0 bg-inherit z-10">{isClient ? t("viewpoints") : "Viewpoints"}</h2> */}
      <h2 className="text-lg font-bold mb-2 sticky top-0 bg-inherit z-10">Entrances</h2>

      {/* <div className="flex-shrink-0 space-y-2 mb-2">
        <button
            className={`w-full py-2 rounded cursor-pointer text-white font-medium transition-colors ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
            onClick={handleAddViewpoint}
        >
            {isClient ? t("create_viewpoint") : "Create Viewpoint"}
        </button>
      </div> */}

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
        {storedViews.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">No viewpoints created yet.</p>
        )}
        {storedViews.map(view => (
          <div
            key={view.id}
            className={`p-2 border rounded cursor-pointer transition-colors ${
              currentView?.id === view.id
                ? (darkMode ? "border-blue-500 bg-gray-800" : "border-blue-500 bg-blue-50")
                : (darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50")
            }`}
            onClick={() => selectViewpoint(view)}
          >
            <div className="flex justify-between items-center gap-3">
              {view.snapshot ? (
                  <img
                    src={`data:image/png;base64,${view.snapshot}`}
                    alt={view.title}
                    className="w-20 h-14 object-cover rounded bg-gray-300"
                  />
              ) : (
                <div className="w-20 h-14 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
              )}
              
              <input
                type="text"
                value={view.title}
                onClick={(e) => e.stopPropagation()}
                onChange={e => renameViewpoint(view.id, e.target.value)}
                className={`border rounded p-1 text-sm flex-1 min-w-0 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
              />
              <button
                className={`p-1 rounded hover:bg-red-100 text-red-500 transition-colors`}
                onClick={e => {
                  e.stopPropagation();
                  deleteViewpoint(view.id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}