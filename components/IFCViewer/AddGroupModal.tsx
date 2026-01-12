"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGroup: (groupName: string) => void;
  darkMode: boolean;
}

export default function AddGroupModal({
  isOpen,
  onClose,
  onAddGroup,
  darkMode,
}: AddGroupModalProps) {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [groupName, setGroupName] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setGroupName(""); // Reset input when modal opens
      document.body.style.overflow = "hidden"; // Prevent scrolling
    } else {
      document.body.style.overflow = "unset"; // Re-enable scrolling
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  const handleAddClick = () => {
    if (groupName.trim()) {
      onAddGroup(groupName.trim());
      onClose();
    } else {
      setToast({ message: t("group_name_cannot_be_empty"), type: "error" });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`relative p-6 rounded-lg shadow-lg w-full max-w-md mx-4 ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        }`}
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-semibold mb-4">
          {t("add_new_group")}
        </h2>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t("enter_group_name")}
          className={`w-full p-2 border rounded-md mb-4 ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          }`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddClick();
            }
          }}
        />
        <div className="flex justify-end space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            onClick={handleAddClick}
          >
            {t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}