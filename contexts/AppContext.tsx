"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import { useSession } from "next-auth/react"; // Import useSession
import { viewerApi, ViewerAPI } from "@/lib/viewer-api";
import { User } from "@/types/mongodb"; // Import User interface from types/mongodb

type TResultItem = {
    id: string;
    name: string;
    category: string;
    expressID: number;
    fragmentId: string;
    floor: string;
};

interface AppContextType {
  darkMode: boolean;
  toggleTheme: () => void;
  uploadedModels: any[];
  setUploadedModels: React.Dispatch<React.SetStateAction<any[]>>;
  viewerApi: ViewerAPI;
  selectedModelUrl: string | null;
  setSelectedModelUrl: (url: string | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  uploadTime: string | null;
  setUploadTime: React.Dispatch<React.SetStateAction<string | null>>;
  uploadStatus: string | null;
  setUploadStatus: React.Dispatch<React.SetStateAction<string | null>>;
  showUploadStatus: boolean;
  setShowUploadStatus: React.Dispatch<React.SetStateAction<boolean>>;
  isUploadPaused: boolean;
  setIsUploadPaused: React.Dispatch<React.SetStateAction<boolean>>;
  downloadProgress: number;
  setDownloadProgress: React.Dispatch<React.SetStateAction<number>>;
  downloadStatus: string | null;
  setDownloadStatus: React.Dispatch<React.SetStateAction<string | null>>;
  showDownloadProgress: boolean;
  setShowDownloadProgress: React.Dispatch<React.SetStateAction<boolean>>;
  showLoginModal: boolean;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
  showRegisterModal: boolean;
  setShowRegisterModal: React.Dispatch<React.SetStateAction<boolean>>;
  toast: { message: string; type: string } | null;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; type: string } | null>>;
  isLoadingUser: boolean; // Add isLoadingUser to context type
  showProgressModal: boolean;
  setShowProgressModal: React.Dispatch<React.SetStateAction<boolean>>;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  // New states for view mode and floor selection
  viewMode: 'global' | 'allfloors' | 'floor' | 'device' | 'warnings' | 'issueforms';
  setViewMode: React.Dispatch<React.SetStateAction<'global' | 'allfloors' | 'floor' | 'device' | 'warnings'| 'issueforms'>>;
  selectedFloor: string | null;
  setSelectedFloor: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDevice: number | null;
  setSelectedDevice: React.Dispatch<React.SetStateAction<number | null>>;
  selectedFragId: string | null;
  setSelectedFragId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDeviceName: string | null;
  setSelectedDeviceName: React.Dispatch<React.SetStateAction<string | null>>;
  deviceViewMode:'HVAC' | 'CCTV' | 'EAC' | '' ;
  setDeviceViewMode: React.Dispatch<React.SetStateAction<'HVAC' | 'CCTV' | 'EAC' | ''>>;
  isHVACOn: boolean;
  setIsHVACOn:  React.Dispatch<React.SetStateAction<boolean>>;
  isCCTVOn: boolean;
  setIsCCTVOn:  React.Dispatch<React.SetStateAction<boolean>>;
  isEACOn: boolean;
  setIsEACOn:  React.Dispatch<React.SetStateAction<boolean>>;
  isGlobalLoading: boolean;
  setIsGlobalLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingMessage: string;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string | "">>;
  currentFoundDevices: TResultItem[];
  setCurrentFoundDevices: React.Dispatch<React.SetStateAction<TResultItem[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [uploadedModels, setUploadedModels] = useState<any[]>([]);
  const [selectedModelUrl, setSelectedModelUrl] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Define isLoadingUser state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTime, setUploadTime] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showUploadStatus, setShowUploadStatus] = useState(false);
  const [isUploadPaused, setIsUploadPaused] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // New states for view mode and floor selection
  const [viewMode, setViewMode] = useState<'global' | 'allfloors' | 'floor' | 'device' | 'warnings' | 'issueforms'>('global');
  const [deviceViewMode, setDeviceViewMode] = useState<'HVAC' | 'CCTV' | 'EAC' | ''>('');
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);

  const [selectedFragId, setSelectedFragId] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);

  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("處理中...");

  const [isHVACOn, setIsHVACOn] = useState<boolean>(false);
  const [isCCTVOn, setIsCCTVOn] = useState<boolean>(false);
  const [isEACOn, setIsEACOn] = useState<boolean>(false);

  const { data: session, status } = useSession(); // Get session and status
  
  const [currentFoundDevices, setCurrentFoundDevices] = useState<TResultItem[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user on initial load", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    // Only fetch user if session is loaded and user is not already set
    if (status === "authenticated" && !user) {
      fetchUser();
    } else if (status === "unauthenticated") {
      setIsLoadingUser(false); // If unauthenticated, stop loading
    }
  }, [status, user]); // Depend on session status and user state

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <AppContext.Provider value={{
      darkMode, toggleTheme, uploadedModels, setUploadedModels, viewerApi, selectedModelUrl, setSelectedModelUrl, isLoggedIn, setIsLoggedIn, user, setUser,
      uploadProgress, setUploadProgress, uploadTime, setUploadTime, uploadStatus, setUploadStatus, showUploadStatus, setShowUploadStatus,
      isUploadPaused, setIsUploadPaused,
      downloadProgress, setDownloadProgress, downloadStatus, setDownloadStatus, showDownloadProgress, setShowDownloadProgress,
      showLoginModal, setShowLoginModal, showRegisterModal, setShowRegisterModal, toast, setToast,
      isLoadingUser, // Add isLoadingUser to context value
      showProgressModal, setShowProgressModal, progress, setProgress,
      viewMode, setViewMode, deviceViewMode, setDeviceViewMode, selectedFloor,setSelectedFloor, selectedDevice, setSelectedDevice, selectedFragId, setSelectedFragId, selectedDeviceName, setSelectedDeviceName,
      isHVACOn, setIsHVACOn, isCCTVOn, setIsCCTVOn, isEACOn, setIsEACOn,isGlobalLoading,setIsGlobalLoading,loadingMessage,setLoadingMessage,currentFoundDevices,setCurrentFoundDevices// Add new states to context value
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
