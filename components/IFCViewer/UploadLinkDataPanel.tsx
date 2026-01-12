"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface UploadLinkDataPanelProps {
  darkMode: boolean;
}

export default function UploadLinkDataPanel({ darkMode }: UploadLinkDataPanelProps) {
  const { t } = useTranslation();

  const handleButtonClick = (category: string) => {
    window.open(`/element-manager/${category}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-black"}`}>
        {t("upload_link_data")}
      </h3>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => handleButtonClick('3dmodels')}
          className={`w-full flex justify-center items-center font-medium px-6 py-3 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"}`}
        >
          {t("upload_3d_models")}
        </button>
        <button
          onClick={() => handleButtonClick('drawings')}
          className={`w-full flex justify-center items-center font-medium px-6 py-3 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-secondary text-white hover:bg-dark-focus" : "bg-light-secondary text-white hover:bg-light-focus"}`}
        >
          {t("upload_drawings")}
        </button>
        <button
          onClick={() => handleButtonClick('documents')}
          className={`w-full flex justify-center items-center font-medium px-6 py-3 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-default-400 text-white hover:bg-dark-default-300" : "bg-light-default-400 text-black hover:bg-light-default-500"}`}
        >
          {t("upload_documents")}
        </button>
      </div>
    </div>
  );
}