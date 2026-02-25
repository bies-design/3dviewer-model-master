"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"; // ★ 引入上下箭頭

export interface StoredViewpoint {
  id: string;
  title: string;
  snapshot: string | null;
  viewpoint: OBC.Viewpoint;
  userData?: any;
}

export type PathSegment = 'door-to-elevator' | 'elevator-vertical' | 'elevator-to-device';

interface ViewpointsProps {
  darkMode: boolean;
  createViewpoint: () => Promise<OBC.Viewpoint | null>;
  updateViewpointCamera: (viewpoint: OBC.Viewpoint) => Promise<void>;
  setWorldCamera: (viewpoint: OBC.Viewpoint) => Promise<void>;
  getViewpointSnapshotData: (viewpoint: OBC.Viewpoint) => string | null;
  storedViews: StoredViewpoint[];
  setStoredViews: React.Dispatch<React.SetStateAction<StoredViewpoint[]>>;
  onDrawPath?: (view: StoredViewpoint, segment: PathSegment) => void;
  onClearPath?: () => void;
  targetFloor: string; 
  targetName: string;
}

export default function Viewpoints({
  darkMode,
  setWorldCamera,
  storedViews,
  setStoredViews,
  onDrawPath,
  onClearPath,
  targetFloor,
  targetName
}: ViewpointsProps) {
  const { t } = useTranslation();
  
  const [selectedEntrance, setSelectedEntrance] = useState<StoredViewpoint | null>(null);
  const [activeSegment, setActiveSegment] = useState<PathSegment | null>(null);
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  const deleteViewpoint = (id: string) => {
    setStoredViews(prev => prev.filter(v => v.id !== id));
    if (selectedEntrance?.id === id) {
      setSelectedEntrance(null);
      setActiveSegment(null);
    }
  };

  const handleEntranceClick = (view: StoredViewpoint) => {
    setSelectedEntrance(view);
    setActiveSegment('door-to-elevator');
    setIsCollapsed(false);
    if (onDrawPath) {
      onDrawPath(view, 'door-to-elevator');
    }
  };

  const handleSegmentClick = (segment: PathSegment) => {
    setActiveSegment(segment);
    if (onDrawPath && selectedEntrance) {
      onDrawPath(selectedEntrance, segment);
    }
  };

  const handleBack = () => {
    setSelectedEntrance(null);
    setActiveSegment(null);
    setIsCollapsed(false);
    if (onClearPath) {
      onClearPath(); 
    }
  };

  const renderSegmentBtn = (segment: PathSegment, label: string) => {
    const isActive = activeSegment === segment;
    return (
      <div
        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between font-bold ${
          isActive
            ? (darkMode ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-blue-500 bg-blue-50 text-blue-600")
            : (darkMode ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
        }`}
        onClick={() => handleSegmentClick(segment)}
      >
        <span>{label}</span>
        {isActive && (
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'h-auto' : 'h-[40vh]'}`}>
      {!selectedEntrance ? (
        <>
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-inherit z-10">
            <h2 className="text-lg font-bold">入口</h2>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              {isCollapsed ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
              {storedViews.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">No viewpoints created yet.</p>
              )}
              {storedViews.map(view => (
                <div
                  key={view.id}
                  className={`p-2 border rounded cursor-pointer transition-colors ${darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"}`}
                  onClick={() => handleEntranceClick(view)}
                >
                  <div className="flex justify-between items-center gap-3">
                    {view.snapshot ? (
                        <img src={`data:image/png;base64,${view.snapshot}`} alt={view.title} className="w-20 h-14 object-cover rounded bg-gray-300" />
                    ) : (
                      <div className="w-20 h-14 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
                    )}
                    
                    <span className={`flex-1 font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                      {view.title}
                    </span>
                    
                    <button
                      className={`p-2 rounded hover:bg-red-100 text-red-500 transition-colors`}
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
          )}
        </>
      ) : (
        // ==================== 第二層：路徑分段選單 ====================
        <>
          <div className={`flex items-center justify-between mb-3 pb-3 sticky top-0 bg-inherit z-10 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <button 
                onClick={handleBack} 
                className={`p-2 rounded-full transition-colors hover:bg-gray-700 text-white shadow-md flex-shrink-0`}
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold truncate">路徑: {selectedEntrance.title}</h2>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1 rounded-full transition-colors flex-shrink-0 ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              {isCollapsed ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 pt-1">
              {renderSegmentBtn('door-to-elevator', '1. 門口 走到 1號電梯')}
              {renderSegmentBtn('elevator-vertical', `2. 搭乘電梯 移動到 ${targetFloor}`)}
              {renderSegmentBtn('elevator-to-device', `3. 出電梯 到 ${targetName}`)}
            </div>
          )}
        </>
      )}
    </div>
  );
}