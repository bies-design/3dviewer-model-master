"use client";

import React from "react";
import * as OBC from "@thatopen/components";
import { Search, Tag, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MobileActionButtonsProps {
  components: OBC.Components;
  darkMode: boolean;
  activeSearchMode: "element" | "issue" | null;
  onSetSearchMode: (mode: "element" | "issue" | null) => void;
  onScanQR: () => void; // Handler for QR Code button
}

const MobileActionButtons: React.FC<MobileActionButtonsProps> = ({
  darkMode,
  activeSearchMode,
  onSetSearchMode,
  onScanQR,
}) => {
  const { t } = useTranslation();

  const buttonClass = (isActive: boolean) =>
    `flex-1 flex flex-col justify-center items-center py-2 transition-colors duration-200 
    ${isActive 
      ? (darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white") 
      : (darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-600")
    }`;

  return (
    <div className={`hud-panel relative w-full h-16 flex`}>
      
      {/* 1. Element Name Button */}
      <button
        onClick={() => onSetSearchMode(activeSearchMode === 'element' ? null : 'element')}
        className={buttonClass(activeSearchMode === 'element')}
      >
        <Search size={24} className="mb-1" />
        <span className="text-[10px] font-medium">Element Name</span>
      </button>

      {/* Separator */}
      <div className={`w-[1px] h-full ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>

      {/* 2. Issue ID Button */}
      <button
        onClick={() => onSetSearchMode(activeSearchMode === 'issue' ? null : 'issue')}
        className={buttonClass(activeSearchMode === 'issue')}
      >
        <Tag size={24} className="mb-1" />
        <span className="text-[10px] font-medium">Issue ID</span>
      </button>

      {/* Separator */}
      <div className={`w-[1px] h-full ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>

      {/* 3. Scan QR Code Button */}
      <button
        onClick={onScanQR}
        className={buttonClass(false)}
      >
        <QrCode size={24} className="mb-1" />
        <span className="text-[10px] font-medium">Scan QR</span>
      </button>

    </div>
  );
};

export default MobileActionButtons;