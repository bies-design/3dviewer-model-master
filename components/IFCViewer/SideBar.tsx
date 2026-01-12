"use client";

import React, { useState, useContext } from "react";
import { Tooltip } from "@heroui/react";
import { Upload, Camera, Search, MessageSquare, AlertTriangle, HelpCircle, Folder, Bot, Layers, Building2, Home, LayoutList, Sun, Moon, LogIn, LogOut, Users, Settings, BrickWall } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar } from "@heroui/react";
import UserPanel from "./UserPanel";

interface SideBarProps {
  darkMode: boolean;
  children: React.ReactNode;
  explodeButton?: React.ReactNode;
  themeSwitcher: React.ReactNode;
  onToggle: (isOpen: boolean) => void;
  onToggleDescription: () => void;
  isDescriptionOpen: boolean;
  onToggleUserManagementPanel: () => void;
  activeTab: string | null;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
  isOpen: boolean;
}

const SideBar: React.FC<SideBarProps> = ({ darkMode, children, themeSwitcher, explodeButton, onToggle, onToggleDescription, isDescriptionOpen, onToggleUserManagementPanel, activeTab, setActiveTab, isOpen }) => {
  const { t } = useTranslation();
  const { isLoggedIn, user } = useAppContext();
  const [showUserPanel, setShowUserPanel] = useState(false);

  const allTabs = React.Children.toArray(children) as React.ReactElement<{name: string}>[];
  const settingsTab = allTabs.find(tab => tab.props.name === "Settings");
  const tabs = allTabs.filter(tab => tab.props.name !== "Settings" && tab.props.name !== "User" && tab.props.name !== "UserManagement");

  const handleTabClick = (name: string) => {
    if (name === "UserManagement") {
      onToggleUserManagementPanel();
      setActiveTab(null);
      onToggle(false);
      return;
    }

    if (activeTab === name) {
      setActiveTab(null);
      onToggle(false);
    } else {
      setActiveTab(name);
      onToggle(true);
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case "Models":
        return <Upload size={24} />;
      case "Viewpoints":
        return <Camera size={24} />;
      case "Search":
        return <Search size={24} />;
      case "BCF":
        return <MessageSquare size={24} />;
      case "Collision":
        return <AlertTriangle size={24} />;
      case "Projects":
        return <Folder size={24} />;
      case "AI":
        return <Bot size={24} />;
      case "Camera":
        return <Camera size={24} />;
      case "Floors":
        return <Layers size={24} />;
      case "Assets":
        return <LayoutList size={24} />;
      case "Home":
        return <Building2 size={24} />;
      case "Element Manager":
        return <BrickWall size={24} />;
      case "Shadows":
        return <Sun size={24} />;
      case "UserManagement":
        return <Users size={24} />;
      case "Settings":
        return <Settings size={24} />;
      default:
        return "?";
    }
  };

  return (
    <div className="flex h-full">
      <div className={`flex flex-col justify-between items-center p-1 ${darkMode ? "bg-gray-900 border-r border-gray-700" : "bg-indigo-400 border-r border-indigo-500"} text-white z-30`}>
        <div className="flex flex-col items-center">
          <div className="p-2 mt-2 mb-2 w-full flex justify-center">
            <Image src="/Frame1.svg" alt="Logo" width={48} height={20} className={darkMode ? "brightness-0 invert" : ""} />
          </div>
          {tabs.map((child) => (
            child.props.name && (
              <Tooltip key={child.props.name} content={t(child.props.name.toLowerCase())} placement="right">
                <button
                  onClick={() => handleTabClick(child.props.name)}
                  className={`p-2 my-2 rounded-xl cursor-pointer ${activeTab === child.props.name ? (darkMode ? "bg-gray-700" : "bg-indigo-600") : (darkMode ? "hover:bg-gray-700" : "hover:bg-indigo-500")}`}
                >
                  {getIcon(child.props.name)}
                </button>
              </Tooltip>
            )
          ))}
          {user?.role === 'admin' && (
            <Tooltip key="UserManagement" content={t("user_management")} placement="right">
              <button
                onClick={() => handleTabClick("UserManagement")}
                className={`p-2 my-2 rounded-xl cursor-pointer ${activeTab === "UserManagement" ? (darkMode ? "bg-gray-700" : "bg-indigo-600") : (darkMode ? "hover:bg-gray-700" : "hover:bg-indigo-500")}`}
              >
                {getIcon("UserManagement")}
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex flex-col items-center space-y-4">
          {explodeButton}
          {settingsTab && (
            <Tooltip key={settingsTab.props.name} content={t(settingsTab.props.name.toLowerCase())} placement="right">
              <button
                onClick={() => handleTabClick(settingsTab.props.name)}
                className={`p-2 my-2 rounded-xl cursor-pointer ${activeTab === settingsTab.props.name ? (darkMode ? "bg-gray-700" : "bg-indigo-600") : (darkMode ? "hover:bg-gray-700" : "hover:bg-indigo-500")}`}
              >
                {getIcon(settingsTab.props.name)}
              </button>
            </Tooltip>
          )}
          <Tooltip content={t("description")} placement="right">
            <button
              onClick={onToggleDescription}
              className={`p-2 my-2 rounded-xl ${
                isDescriptionOpen
                  ? darkMode
                    ? "bg-gray-700"
                    : "bg-indigo-600"
                  : darkMode
                  ? "hover:bg-gray-700"
                  : "hover:bg-indigo-500"
              }`}
            >
              <HelpCircle size={24} />
            </button>
          </Tooltip>
          <Tooltip content={t("user")} placement="right">
            <button
              onClick={() => handleTabClick("User")}
              className={`p-1 rounded-xl cursor-pointer ${activeTab === "User" ? (darkMode ? "bg-gray-700" : "bg-indigo-600") : (darkMode ? "hover:bg-gray-700" : "hover:bg-indigo-500")}`}
            >
              {user?.avatar ? (
                <Image src={user.avatar} alt="User Avatar" width={48} height={48} className="rounded-full" />
              ) : (
                <Avatar isBordered color="danger" src="" />
              )}
            </button>
          </Tooltip>
          <div className="mb-2">
            {themeSwitcher}
          </div>
        </div>
      </div>
      <div
        className={`transition-all duration-300 ${darkMode ? "bg-gray-800 border-r border-gray-700" : "bg-zinc-200 border-r border-gray-300"} ${
          isOpen ? "w-80" : "w-0"
        } flex flex-col`}
      >
        <div className="flex-grow overflow-y-auto p-2">
          {isOpen && allTabs.find((child) => child.props.name === activeTab)}
        </div>
      </div>
    </div>
  );
};

export default SideBar;
