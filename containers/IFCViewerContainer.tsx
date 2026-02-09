"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { PerspectiveCamera, OrthographicCamera, Vector2, Object3D, Mesh, Color, Vector3, BufferGeometry, BufferAttribute, MeshLambertMaterial, DoubleSide, EquirectangularReflectionMapping } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import LoadingModal from "@/components/IFCViewer/LoadingModal";
import ActionButtons from "@/components/IFCViewer/ActionButtons";
import R2ModelHistoryPanel from "@/components/IFCViewer/R2ModelHistoryPanel";
import { R2Model } from "@/components/IFCViewer/R2ModelHistoryPanel";
import HomePanel, { HomePanelRef } from "@/components/IFCViewer/HomePanel";
import Link from "next/link";
import { LogIn, LogOut, User as UserIcon, Pause, Play, Download, Menu, Undo2, Layers, Globe, Layers2, TriangleAlert, ChevronRight, BookAlert, Box, AirVent, Cctv, DoorClosedLocked, Focus } from "lucide-react";
import { Tooltip,Avatar,Switch } from "@heroui/react";
import DescriptionPanel from "@/components/IFCViewer/DescriptionPanel";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import { useAppContext } from "@/contexts/AppContext";
import { useTranslation } from "react-i18next";
import TopsideDataPanel from "@/components/IFCViewer/datapanel/TopsideDataPanel";
import RightsideDataPanel from "@/components/IFCViewer/datapanel/RightsideDataPanel";
import LeftsideDataPanel from "@/components/IFCViewer/datapanel/LeftsideDataPanel";
import FloorModePanel from "@/components/IFCViewer/FloorModePanel";
import RightSideDataPanelForFloor from "@/components/IFCViewer/datapanel/RightSideDataPanelForFloor";
import UserManagementPanel from "@/components/IFCViewer/UserManagementPanel";
import UploadLinkDataPanel from "@/components/IFCViewer/UploadLinkDataPanel";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import R2ModelPreviewModal from "@/components/IFCViewer/R2ModelPreviewModal";
import dayjs from 'dayjs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import DeviceModePanel from "@/components/IFCViewer/DeviceModePanel";
import LiquidFillGauge from "@/components/IFCViewer/LiquidFillGauge";
import RightSideDataPanelForAllFloor from "@/components/IFCViewer/datapanel/RightSideDataPanelForAllFloor";
import WarningHistoryModal from "@/components/WarningHistoryModal";
import CameraViewerPanel from "@/components/camera/CameraViewerPanel";
import LinkedCameraPanel from "@/components/camera/LinkedCameraPanel";
import { createMarkerElement } from "@/app/markerElements/CCTVMarkerDiv";
import GlobalLoader from "@/components/loader/GlobalLoader";

// --- 模擬圖表數據 ---
  const powerData = [
    { time: '10:00', val: 42 }, { time: '11:00', val: 29 }, { time: '12:00', val: 55 },
    { time: '13:00', val: 48 }, { time: '14:00', val: 32 }, { time: '15:00', val: 50 },
    { time: '16:00', val: 22 }, { time: '17:00', val: 18 }, { time: '18:00', val: 30 },
    { time: '19:00', val: 58 },
  ];

  const tempData1 = [
    { time: '10:00', val: 24 }, { time: '12:00', val: 26 }, { time: '14:00', val: 29 },
    { time: '16:00', val: 25 }, { time: '18:00', val: 23 },
  ];

  const tempData2 = [
    { time: '10:00', in: 50, out: 20 }, { time: '12:00', in: 55, out: 22 }, 
    { time: '14:00', in: 65, out: 25 }, { time: '16:00', in: 58, out: 23 }, 
    { time: '18:00', in: 52, out: 21 },
  ];
  
// --- 輔助函式：從 ModelID 解析樓層 ---
const extractFloorFromModelId = (modelId: string): string | null => {
  try {
    let tempId = modelId.replace('.ifc.frag', '');
    if (tempId.endsWith('_')) tempId = tempId.slice(0, -1);
    const parts = tempId.split('_');
    return parts[parts.length - 1];
  } catch (e) {
    return null;
  }
};

interface UploadedModel {
  _id: string; // Changed from id to _id to reflect MongoDB ID
  id: string; // Keep original id for viewer internal use
  name: string;
  type: "ifc" | "frag" | "json";
  data?: ArrayBuffer;
  r2FileName?: string; // Add r2FileName for models uploaded to R2
  groupIds?: string[]; // Add groupIds for model grouping
}

interface HistoryEntry {
  _id: string;
  originalFileName: string;
  r2FileName: string;
  status: string;
  uploadedAt: string;
  groupName?: string; // Add groupName for R2ModelHistoryPanel
}

interface StoredViewpoint {
  id: string;
  title: string;
  viewpoint: OBC.Viewpoint;
  snapshot: string | null;
}

type ItemProps = Record<string, any>;
type PsetDict = Record<string, Record<string, any>>;

type TResultGroup = {
  id: number;
  name: string;
  items: any[];
  isCollapsed: boolean;
  isEditing: boolean;
};

export default function IFCViewerContainer() {
  const router = useRouter();
  const {
    darkMode, toggleTheme, uploadedModels, setUploadedModels, viewerApi, selectedModelUrl, isLoggedIn, setIsLoggedIn, user, setUser,
    uploadProgress, uploadTime, uploadStatus, showUploadStatus, setShowUploadStatus, setUploadStatus,
    isUploadPaused, setIsUploadPaused,
    downloadProgress, setDownloadProgress, downloadStatus, setDownloadStatus, showDownloadProgress, setShowDownloadProgress,
    showProgressModal, setShowProgressModal, progress, setProgress, setToast,
    viewMode, setViewMode, selectedFloor, setSelectedFloor, selectedDevice, setSelectedDevice, selectedFragId, setSelectedFragId,
    selectedDeviceName, setSelectedDeviceName, isHVACOn, setIsHVACOn, isCCTVOn, setIsCCTVOn, isEACOn, setIsEACOn,
    isGlobalLoading,setIsGlobalLoading,loadingMessage,setLoadingMessage
  } = useAppContext();

  const workerRef = useRef<Worker | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const ifcLoaderRef = useRef<OBC.IfcLoader | null>(null);
  const worldRef = useRef<any>(null);
  const cameraRef = useRef<OBC.OrthoPerspectiveCamera | null>(null);
  const clipperRef = useRef<OBC.Clipper | null>(null);
  const measurerRef = useRef<OBCF.LengthMeasurement | null>(null);
  const areaMeasurerRef = useRef<OBCF.AreaMeasurement | null>(null);
  const viewpointsRef = useRef<OBC.Viewpoints | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const outlinerRef = useRef<OBCF.Outliner | null>(null);
  const markerRef = useRef<OBCF.Marker | null>(null);
  const boxerRef = useRef<OBC.BoundingBoxer | null>(null);
  const colorizeRef = useRef<{ enabled: boolean }>({ enabled: false });
  const coloredElements = useRef<Record<string, Set<number>>>({});
  const searchElementRef = useRef<HomePanelRef>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  // const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isUserManagementPanelOpen, setIsUserManagementPanelOpen] = useState(false);
  // const [infoLoading, setInfoLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedLocalId, setSelectedLocalId] = useState<number | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<ItemProps>({}); // Changed to empty object
  const [selectedPsets, setSelectedPsets] = useState<PsetDict>({}); // Changed to empty object
  const [rawPsets, setRawPsets] = useState<any[]>([]);
  const [projection, setProjection] = useState<"Perspective" | "Orthographic">("Perspective");
  const [navigation, setNavigation] = useState<"Orbit" | "FirstPerson" | "Plan">("Orbit");
  const [isGhost, setIsGhost] = useState(false);
  const [isShadowed, setIsShadowed] = useState(true);
  const [isColorShadowsEnabled, setIsColorShadowsEnabled] = useState(false);
  const [bcfMode, setBcfMode] = useState(false);
  const [activeTool, setActiveTool] = useState<"clipper" | "length" | "area" | "colorize" | "collision" | "search" | "multi-select" | null>(null);
  const [originalSelectStyle, setOriginalSelectStyle] = useState<any>(null);
  const [lengthMode, setLengthMode] = useState<"free" | "edge">("free");
  const [areaMode, setAreaMode] = useState<"free" | "square">("free");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDescriptionPanel, setShowDescriptionPanel] = useState(false);
  const [currentViewpoint, setCurrentViewpoint] = useState<OBC.Viewpoint | null>(null);
  const [storedViews, setStoredViews] = useState<StoredViewpoint[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [components, setComponents] = useState<OBC.Components | null>(null);
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [activeAddGroupId, setActiveAddGroupId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ url: string; name: string; modelId: string; expressId: number }[]>([]); // Updated type
  const [activeSidebarTab, setActiveSidebarTab] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>("camera");
  const isAddingToGroupRef = useRef(isAddingToGroup);
  const activeAddGroupIdRef = useRef(activeAddGroupId);
  const activeToolRef = useRef(activeTool);
  const restListener = useRef<(() => Promise<void>) | null>(null);
  const [hasAutoLoadedModels, setHasAutoLoadedModels] = useState(false); // New state to track auto-loading
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const [showR2HistoryPanel, setShowR2HistoryPanel] = useState(false); // New state for R2 history panel
  const [showPreviewModal, setShowPreviewModal] = useState(false); // New state for PreviewModal
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<R2Model | null>(null); // New state for item to preview
  const [currentModelGroupId, setCurrentModelGroupId] = useState<string | null>(null); // New state for current model group ID
  const [mainDisplayGroupId, setMainDisplayGroupId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mainDisplayGroupId') || null;
    }
    return null;
  }); // New state for main display group ID, initialized from localStorage
  const [r2HistoryRefreshCounter, setR2HistoryRefreshCounter] = useState(0); // New state to trigger R2ModelHistoryPanel refresh
  const [showGauges, setShowGauges] = useState({
    kw: { ring: true, line: true },
    temp: { ring: true, line: true },
    humi: { ring: true, line: true },
    co2: { ring: true, line: true },
  });

  const [showWarningModal, setShowWarningModal] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string>("#ffa500");
  const selectedColorRef = useRef(selectedColor);

  const [isMonitorOpen, setIsMonitorOpen] = useState<boolean>(false);
  const [isLinkedCameraPanelOpen,setIsLinkedCameraPanelOpen] = useState<boolean>(false);
  const [linkedCameras, setLinkedCameras] = useState<any[]>();
  
  const { t } = useTranslation();

  // ★★★ 新增：用 Ref 追蹤 setViewMode ★★★
  const viewModeRef = useRef(viewMode);
  const setViewModeRef = useRef(setViewMode);
  const setSelectedFloorRef = useRef(setSelectedFloor);

  const globalCenterRef = useRef<THREE.Vector3 | null>(null);
  const globalBox3Ref = useRef<THREE.Box3 | null>(null);

  globalBox3Ref.current = new THREE.Box3(
    new THREE.Vector3(-31.00339000000001, -60.32, -56.14823), // min
    new THREE.Vector3(75.50107, 5.104999999999997, 6.288639999999997)    // max
  );
  globalCenterRef.current = new THREE.Vector3(22.248839999999994, -27.6075, -24.929795);

  const ymdhmsDate = dayjs(user?.updatedAt).format('YYYY-MM-DD HH:mm:ss');
  const {data:session, status} = useSession();

  const fetchR2Models = useCallback(async () => {
    try {
      const response = await fetch('/api/models/r2-upload/list');
      if (!response.ok) {
        throw new Error(`Failed to fetch R2 models: ${response.statusText}`);
      }
      const r2Models = await response.json();
      // Merge with existing uploadedModels, ensuring no duplicates and preserving local models
      setUploadedModels((prevModels) => {
        const r2ModelsFromApi = r2Models;
        const updatedModels = prevModels.map((prevModel) => {
          const matchingR2Model = r2ModelsFromApi.find(
            (r2Model: UploadedModel) => r2Model._id === prevModel._id
          );
          return matchingR2Model ? { ...prevModel, groupIds: matchingR2Model.groupIds } : prevModel;
        });

        // Add new R2 models that are not yet in uploadedModels
        r2ModelsFromApi.forEach((newR2Model: UploadedModel) => {
          if (!updatedModels.some((existingModel) => existingModel._id === newR2Model._id)) {
            updatedModels.push(newR2Model);
          }
        });
        return updatedModels;
      });
    } catch (error) {
      console.error('Error fetching R2 models:', error);
    }
  }, [setUploadedModels]);

  const onToggle = (isOpen:boolean) => {
    setIsSidebarOpen(isOpen);
    if(isOpen){ 
      setIsUserManagementPanelOpen(false);
    }
  }
  const handleTabClick = (name: string) => {
    if (name === "UserManagement") {
      handleToggleUserManagementPanel();
      setActiveSidebarTab(null);
      onToggle(false);
      return;
    }

    if (activeSidebarTab === name) {
      setActiveSidebarTab(null);
      onToggle(false);
    } else {
      setActiveSidebarTab(name);
      onToggle(true);
    }
  };
  const handleAssignModelToGroup = useCallback(async (modelId: string, groupIds: string[]) => {
    try {
      const response = await fetch('/api/models/assign-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, groupIds }),
      });
      if (!response.ok) {
        throw new Error(`Failed to assign model to group: ${response.statusText}`);
      }
      await fetchR2Models(); // Refresh models after assignment
      setToast({ message: `Model ${modelId} assigned to groups ${groupIds.join(', ') || 'ungrouped'} successfully!`, type: "success" });
      setR2HistoryRefreshCounter(prev => prev + 1); // Increment to trigger R2ModelHistoryPanel refresh
    } catch (error) {
      console.error('Error assigning model to group:', error);
      setToast({ message: `Failed to assign model ${modelId} to group. Check console for details.`, type: "error" });
    }
  }, [fetchR2Models]);

  const loadR2ModelIntoViewer = useCallback(async (r2FileName: string, onProgress: (progress: number) => void) => {
    if (!fragmentsRef.current || !worldRef.current) return;

    try {
      console.log(`Loading model ${r2FileName} from R2 into viewer...`);
      const downloadResponse = await fetch('/api/models/r2-upload/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: r2FileName }),
      });

      if (!downloadResponse.ok) {
        throw new Error(`Failed to get signed URL for ${r2FileName}: ${downloadResponse.statusText}`);
      }

      const { signedUrl } = await downloadResponse.json();
      const modelResponse = await fetch(signedUrl);

      if (!modelResponse.ok) {
        throw new Error(`Failed to download model ${r2FileName} from R2: ${modelResponse.statusText}`);
      }

      const contentLength = modelResponse.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = modelResponse.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
          onProgress((loaded / total) * 100); // Update progress for this model
        }
      }

      const arrayBuffer = await new Blob(chunks as BlobPart[]).arrayBuffer();
      const modelId = `${r2FileName}`;

      // Dispose existing model if it has the same ID
      if (fragmentsRef.current.list.has(modelId)) {
        fragmentsRef.current.core.disposeModel(modelId);
      }

      const fragModel = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
      fragmentsRef.current.list.set(modelId, fragModel);

      fragModel.useCamera(worldRef.current.camera.three);
      worldRef.current.scene.three.add(fragModel.object);
      fragmentsRef.current.core.update(true);

      setUploadedModels((prev) => {
        const existingModelIndex = prev.findIndex(m => m.r2FileName === r2FileName);
        if (existingModelIndex > -1) {
          // Update existing model with new data if needed
          const updated = [...prev];
          updated[existingModelIndex] = { ...updated[existingModelIndex], id: modelId };
          return updated;
        }
        return [...prev, { id: modelId, name: r2FileName, type: "frag", r2FileName }];
      });

      // Check if elements exist for this model
      let elementsExist = false;
      try {
        const checkResponse = await fetch('/api/elements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: [],
            modelIds: [modelId],
            limit: 1
          }),
        });
        
        if (checkResponse.ok) {
          const existingElements = await checkResponse.json();
          if (Array.isArray(existingElements) && existingElements.length > 0) {
            elementsExist = true;
          }
        }
      } catch (error) {
        console.error("Error checking for existing elements:", error);
      }

      if (!elementsExist) {
        await extractAndSaveElements(fragModel);
      } else {
        console.log(`Elements for model ${modelId} already exist in DB. Skipping extraction.`);
      }

      // await loadCategoriesFromAllModels();

    } catch (error) {
      console.error(`Failed to load model ${r2FileName} from R2 into viewer:`, error);
      setToast({ message: `Failed to load model ${r2FileName}. Check console for details.`, type: "error" });
    } finally {
      // No progress modal control here
    }
  }, [fragmentsRef, worldRef, setUploadedModels]);

  const handleDownloadFromDB = async (fileName: string) => {
    setShowDownloadProgress(true);
    setDownloadStatus(`Downloading ${fileName}...`);
    setDownloadProgress(0);

    try {
      // 1. Get the signed URL from our backend
      const apiResponse = await fetch('/api/models/r2-upload/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `Failed to get download link: ${apiResponse.statusText}`);
      }
      const { signedUrl } = await apiResponse.json();

      // 2. Fetch the file content from the signed URL with progress
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file from storage: ${fileResponse.statusText}`);
      }
      
      if (!fileResponse.body) {
        throw new Error("Response body is null");
      }

      const contentLength = fileResponse.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = fileResponse.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              loaded += value.length;
              if (total > 0) {
                const progress = (loaded / total) * 100;
                setDownloadProgress(progress);
              }
              controller.enqueue(value);
              push();
            });
          }
          push();
        },
      });

      const blob = await new Response(stream).blob();
      
      setDownloadStatus("Download complete!");
      setDownloadProgress(100);

      // 3. Create a local object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // 4. Clean up
      a.remove();
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        setShowDownloadProgress(false);
      }, 1000);

    } catch (error) {
      console.error('Failed to download file:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setDownloadStatus(`Failed: ${message}`);
      setToast({ message: `Failed to download file. ${message}`, type: "error" });
    }
  };

  // const handleToggleInfo = () => {
  //   setIsInfoOpen((prev) => !prev);
  //   setIsUserManagementPanelOpen(false); // Close UserManagementPanel when Info panel is opened/closed
  //   setShowR2HistoryPanel(false); // Close R2 history panel when Info panel is opened/closed
  //   // Close QR Code panel when Info panel is opened/closed
  // };
 
  const handleToggleUserManagementPanel = () => {
    setIsUserManagementPanelOpen((prev) => !prev);
    // setIsInfoOpen(false); // Close InfoPanel when UserManagementPanel is opened/closed
    setShowR2HistoryPanel(false); // Close R2 history panel when UserManagementPanel is opened/closed
  };
 
  //管理選種element後跳轉樓層sidebar改變的邏輯
  useEffect(() => {
      setViewModeRef.current = setViewMode;
      setSelectedFloorRef.current = setSelectedFloor;
  }, [setViewMode, setSelectedFloor]);
  //不管loggin
  // useEffect(() => {
  //   if (!isLoggedIn) {
  //     setShowLoginModal(true);
  //   } else {
  //     setShowLoginModal(false);
  //     // Automatically open HomePanel and set active tab to Home after login
  //     setIsSidebarOpen(true);
  //     setActiveSidebarTab("Home");
  //   }
  // }, [isLoggedIn]);

  // useEffect(() => {
  //   // Trigger selectAll and loadSelectedModels when HomePanel is opened, but only once
  //   //isLoggedIn && isSidebarOpen &&  activeSidebarTab === "Home" && 
  //   // , isLoggedIn, isSidebarOpen, activeSidebarTab, 
  //   if (searchElementRef.current && !hasAutoLoadedModels) {
  //     // Ensure the HomePanel is fully rendered and its ref is available
  //     const timer = setTimeout(async () => {
  //       if (searchElementRef.current) {
  //         const selectedModels = await searchElementRef.current.handleSelectAllModels(); // Wait for selectAll to complete and get selected models
  //         await searchElementRef.current.handleLoadSelectedR2Models(selectedModels); // Pass selected models
  //         setHasAutoLoadedModels(true); // Mark as loaded
  //       }
  //     }, 500); // A small delay to ensure rendering and model availability
  //     return () => clearTimeout(timer);
  //   }
  // }, [searchElementRef.current, hasAutoLoadedModels]);

  useEffect(() => {
    // 確保組件準備好後立即呼叫
    fetchR2Models();
  }, [fetchR2Models]);

  // 當 uploadedModels 有資料時，自動載入它們到 Viewer
// useEffect(() => {
//   // 1. 檢查 Viewer 核心是否準備好
//   if (!componentsRef.current || !fragmentsRef.current || !worldRef.current) return;
  
//   // 2. 檢查是否已經自動載入過 (避免重複執行)
//   if (hasAutoLoadedModels) return;

//   // 3. 檢查是否有模型資料
//   if (uploadedModels.length === 0) return;

//   const autoLoadSequence = async () => {
//     console.log("🚀 自動載入程序啟動...");
    
//     // 鎖定狀態，避免重複跑
//     setHasAutoLoadedModels(true); 

//     // 過濾出有效的 R2 模型 (排除沒有 r2FileName 的)
//     const r2Models = uploadedModels.filter(m => m.r2FileName);

//     if (r2Models.length === 0) {
//       console.log("沒有 R2 模型需要載入");
//       return;
//     }

//     // --- 開啟進度條 ---
//     setShowProgressModal(true);
//     setProgress(0);

//     const totalModels = r2Models.length;
//     let loadedCount = 0;

//     // 依序載入模型
//     for (const model of r2Models) {
//       // 檢查場景中是否已經有這個模型 (防止重複)
//       const isLoaded = fragmentsRef.current?.list.has(model.r2FileName);
      
//       if (!isLoaded && model.r2FileName) {
//         try {
//           await loadR2ModelIntoViewer(model.r2FileName, (modelProgress) => {
//             // --- 計算總體進度 ---
//             // 公式：(已經載入完的模型數量 * 100 + 當前正在載入的模型進度) / 總模型數量
//             const overallProgress = ((loadedCount * 100) + modelProgress) / totalModels;
//             setProgress(Math.round(overallProgress));
            
//             // console.log(`正在載入 ${model.name}: ${modelProgress.toFixed(0)}% (總進度: ${overallProgress.toFixed(0)}%)`);
//           });
//         } catch (err) {
//           console.error(`載入模型失敗: ${model.name}`, err);
//           setToast({ message: `Failed to load ${model.name}`, type: "error" });
//         }
//       }
//       // 每處理完一個模型，計數器 +1
//       loadedCount++;
//     }

//     console.log("✅ 所有模型自動載入完成，開始計算中心點...");
    
//     setProgress(100);
//     // 獲取所有模型的中點和Box3

//     // setTimeout(async () => {
//     //   await getAllCenterAndBox3();

//     // }, 1000);

//     onFocus('isometric');
//     console.log("結束了 所以我聚焦一次");
//     setShowProgressModal(false);

//   };

//   // 稍微延遲一點點，確保 Viewer DOM 已經完全穩定
//   const timer = setTimeout(() => {
//     autoLoadSequence();
//   }, 500);

//     return () => clearTimeout(timer);
  
//     // 記得要把這些依賴加進去，確保 useEffect 能讀到最新的函式
//   }, [uploadedModels, hasAutoLoadedModels, componentsRef.current, setShowProgressModal, setProgress, setToast, loadR2ModelIntoViewer]);

useEffect(() => {
  if (!isViewerReady || !componentsRef.current || !fragmentsRef.current || !worldRef.current) return;
  if (hasAutoLoadedModels) return;
  if (uploadedModels.length === 0) return;

  const autoLoadSequence = async () => {
    console.log("🚀 啟動大檔案序列載入程序...");
    setHasAutoLoadedModels(true);

    // const modelsToLoad = uploadedModels.filter(m => 
    //   m.r2FileName && !fragmentsRef.current?.list.has(m.r2FileName)
    // );
    let candidates = uploadedModels.filter(m => 
      m.r2FileName && !fragmentsRef.current?.list.has(m.r2FileName)
    );

    // if (modelsToLoad.length === 0) return;
    if (candidates.length === 0) return;

    candidates.sort((a, b) => {
        const aIsMain = a.r2FileName?.toLowerCase().includes('all') ? 1 : 0;
        const bIsMain = b.r2FileName?.toLowerCase().includes('all') ? 1 : 0;
        return bIsMain - aIsMain; // 降序排列，有 'all' 的會在陣列最前面
    });

    // 3. 切片：只取前 10 個
    const LIMIT = 10;
    const modelsToLoad = candidates.slice(0, LIMIT);

    console.log(`預計載入 ${candidates.length} 個模型，限制載入前 ${modelsToLoad.length} 個`);

    setShowProgressModal(true);
    setProgress(0);

    // 進度追蹤
    const progressMap = new Map<string, number>();
    modelsToLoad.forEach(m => progressMap.set(m.r2FileName!, 0));

    // 更新 UI 的輔助函式
    const updateUI = () => {
      let total = 0;
      progressMap.forEach(v => total += v);
      setProgress(Math.round(total / modelsToLoad.length));
    };

    // --- 核心邏輯：並發控制 ---
    // 設定最大同時下載數量。
    // 針對 500MB 的檔案，強烈建議設為 1，頂多 2。
    const MAX_CONCURRENCY = 7; 
    
    let activeCount = 0;
    let index = 0;

    const loadNext = async (): Promise<void> => {
      // 遞迴結束條件
      if (index >= modelsToLoad.length) return;

      // 取出當前要處理的模型
      const currentIndex = index++; 
      const model = modelsToLoad[currentIndex];
      
      try {
        activeCount++;
        // console.log(`開始下載第 ${currentIndex + 1} 個: ${model.name}`);
        
        await loadR2ModelIntoViewer(model.r2FileName!, (val) => {
          progressMap.set(model.r2FileName!, val);
          // 為了效能，不要每個封包都更新 React State，可以加個簡單的節流，或直接更新
          // 這裡簡化直接更新
          updateUI();
        });

        // ★★★ 關鍵記憶體優化 ★★★
        // 在 loadR2ModelIntoViewer 內部，當 ArrayBuffer 轉交給 fragments.load 後
        // 確保你沒有在任何變數保留那個 ArrayBuffer 的參照，這樣 GC 才能回收它。
        
      } catch (err) {
        console.error(`模型 ${model.name} 載入失敗`, err);
        // 失敗也算 100% 以免進度條卡住
        progressMap.set(model.r2FileName!, 100);
        updateUI();
      } finally {
        activeCount--;
        // 遞迴呼叫：一個結束了，就拉下一個進來執行
        await loadNext();
      }
    };

    // 啟動初始的 N 個任務
    const initialPromises = [];
    for (let i = 0; i < MAX_CONCURRENCY && i < modelsToLoad.length; i++) {
      initialPromises.push(loadNext());
    }

    // 等待所有任務鏈結束
    await Promise.all(initialPromises);

    // setTimeout(async () => {
    //   await getAllCenterAndBox3();

    // }, 1000);
    console.log("✅ 所有大模型載入完成");
    setProgress(100);
    
    // 稍微延遲讓記憶體穩定後再聚焦
    setTimeout(() => {
        onFocus('isometric');
        setShowProgressModal(false);
    }, 500);
  };

  autoLoadSequence();

}, [uploadedModels, hasAutoLoadedModels, isViewerReady]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (mainDisplayGroupId) {
        localStorage.setItem('mainDisplayGroupId', mainDisplayGroupId);
      } else {
        localStorage.removeItem('mainDisplayGroupId');
      }
    }
  }, [mainDisplayGroupId]);

  // useEffect(() => {
  //   // Resize the viewer after the sidebar transition is complete
  //   setTimeout(() => {
  //     if (worldRef.current?.renderer && cameraRef.current) {
  //       worldRef.current.renderer.resize();
  //       cameraRef.current.updateAspect();
  //     }
  //   }, 300);
  // }, [isSidebarOpen]);

  useEffect(() => {
    isAddingToGroupRef.current = isAddingToGroup;
    activeAddGroupIdRef.current = activeAddGroupId;
  }, [isAddingToGroup, activeAddGroupId]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    if (!viewerRef.current) return;

    const init = async () => {
      const components = new OBC.Components();
      const worlds = components.get(OBC.Worlds);
      const world = worlds.create();
      viewerApi.init(components, world);
      componentsRef.current = components;
      worldRef.current = world;

      const scene = new OBC.SimpleScene(components);
      world.scene = scene;
      scene.setup();
      scene.three.background = null;

      // axes x y z軸線
      // const axesHelper = new THREE.AxesHelper(500); // 參數 5 代表軸線長度
      // world.scene.three.add(axesHelper);

      const hdriLoader = new RGBELoader();
      hdriLoader.load(
        "https://thatopen.github.io/engine_fragment/resources/textures/envmaps/san_giuseppe_bridge_2k.hdr",
        (texture) => {
          texture.mapping = EquirectangularReflectionMapping;
          (world.scene.three as THREE.Scene).environment = texture;
        },
      );

      const renderer = new OBCF.PostproductionRenderer(components, viewerRef.current!);
      world.renderer = renderer;
      // renderer.mode = isColorShadowsEnabled ? OBC.RendererMode.MANUAL : OBC.RendererMode.AUTO;

      const camera = new OBC.OrthoPerspectiveCamera(components);
      world.camera = camera;
      await camera.controls.setLookAt(100, 100, 100 , 0, 0, 0,false);
      camera.updateAspect();
      cameraRef.current = camera;

      const postproductionRenderer = world.renderer as OBCF.PostproductionRenderer;
      postproductionRenderer.postproduction.enabled = true;
      postproductionRenderer.postproduction.style = isColorShadowsEnabled ? OBCF.PostproductionAspect.COLOR_SHADOWS : OBCF.PostproductionAspect.COLOR;
      world.dynamicAnchor = false;

      const { aoPass, edgesPass } = postproductionRenderer.postproduction;

      edgesPass.color = new THREE.Color(0x494b50);

      const aoParameters = {
        radius: 0.25,
        distanceExponent: 1,
        thickness: 1,
        scale: 1,
        samples: 8,
        distanceFallOff: 1,
        screenSpaceRadius: true,
      };

      const pdParameters = {
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 4,
        radiusExponent: 1,
        rings: 2,
        samples: 16,
      };

      aoPass.updateGtaoMaterial(aoParameters);
      aoPass.updatePdMaterial(pdParameters);

      components.init();

      const ifcLoader = components.get(OBC.IfcLoader);
      ifcLoaderRef.current = ifcLoader;

      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: { path: "https://unpkg.com/web-ifc@0.0.74/", absolute: true },
      });

      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
      const workerUrl = URL.createObjectURL(workerFile);

      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);
      fragmentsRef.current = fragments;

      fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
        const isLod = "isLodMaterial" in material && material.isLodMaterial;
        if (isLod) {
          (world.renderer as OBCF.PostproductionRenderer).postproduction.basePass.isolatedMaterials.push(material);
        }
      });

      camera.controls.addEventListener("update", () => {
        fragments.core.update(true);
      });

      fragments.list.onItemSet.add(async ({ value: model }) => {
        const cam = world.camera.three as PerspectiveCamera | OrthographicCamera;
        model.useCamera(cam);
        world.scene.three.add(model.object);
        await fragments.core.update(true);
      });
      

      const casters = components.get(OBC.Raycasters);
      casters.get(world);

      const viewpoints = components.get(OBC.Viewpoints);
      viewpoints.world = world;
      viewpointsRef.current = viewpoints;

      const clipper = components.get(OBC.Clipper);
      clipper.enabled = false;
      clipperRef.current = clipper;

      const highlighter = components.get(OBCF.Highlighter);
      
      highlighter.setup({ world });
      //避免與後免選中element篩選樓層的focus打架
      highlighter.zoomToSelection = false;
      highlighterRef.current = highlighter;

      const outliner = components.get(OBCF.Outliner);
      outliner.world = world;
      outliner.enabled = true;
      outliner.color = new THREE.Color(0xbcf124);
      outliner.fillColor = new THREE.Color("#9519c2");
      outliner.fillOpacity = 0.5;

      outlinerRef.current = outliner;

      const marker = components.get(OBCF.Marker);
      marker.threshold = 10;
      marker.autoCluster = true;
      
      markerRef.current = marker;

      const boxer = components.get(OBC.BoundingBoxer);

      boxerRef.current = boxer;

      // 原本的監聽highlight並且連接到infopanel的function
      // highlighter.events.select.onHighlight.add(async (selection) => {
      //   console.log('Highlight selection (IDs only):', selection);

      //   // --- Start: Log detailed properties on click ---
      //   for (const fragmentId in selection) {
      //     const model = fragmentsRef.current?.list.get(fragmentId);
      //     if (!model) continue;
      //     const ids = Array.from(selection[fragmentId]);
      //     const properties = await model.getItemsData(ids, {
      //       attributesDefault: true,
      //       relations: { IsDefinedBy: { attributes: true, relations: true } },
      //     });
      //     console.log(`Detailed properties for ${ids.length} element(s) in model ${fragmentId}:`, properties);
      //   }
      //   // --- End: Log detailed properties on click ---

      //   if (activeToolRef.current === "colorize") {
      //     const highlighter = highlighterRef.current;
      //     if (!highlighter) return;
      //     const color = selectedColorRef.current;
      //     const styleID = `colorize-${color}`;
      //     if (!highlighter.styles.has(styleID)) {
      //       highlighter.styles.set(styleID, {
      //         color: new Color(color),
      //         opacity: 1,
      //         transparent: false,
      //         renderedFaces: FRAGS.RenderedFaces.ONE,
      //       });
      //     }
      //     await highlighter.highlightByID(styleID, selection, false);
      //     await highlighter.clear("select");
      //     return;
      //   }

      //   if (!Object.keys(selection).length) {
      //     if (!isAddingToGroupRef.current) {
      //       setIsInfoOpen(false);
      //       setSelectedModelId(null);
      //       setSelectedLocalId(null);
      //       setSelectedAttrs({}); // Clear attrs to empty object
      //       setSelectedPsets({}); // Clear psets to empty object
      //       setRawPsets([]);
      //     }
      //     setQrCodeData([]); // Clear QR code data
      //     return;
      //   }

      //   const selectedElementsData: { modelId: string; expressId: number; attrs: ItemProps; psets: PsetDict; name: string; qrCodeUrl: string }[] = [];
      //   const allAttrs: ItemProps[] = [];
      //   const allPsets: PsetDict[] = [];
      //   const allRawPsets: any[] = [];

      //   for (const fragmentId in selection) {
      //     const model = fragmentsRef.current?.list.get(fragmentId);
      //     if (!model) continue;

      //     for (const expressId of selection[fragmentId]) {
      //       const [attrs] = await model.getItemsData([expressId], { attributesDefault: true });
      //       const psetsRaw = await getItemPsets(model, expressId);
      //       const psets = formatItemPsets(psetsRaw);

      //       let name = `Element ${expressId}`;
      //       const nameAttribute = attrs?.Name as OBC.IDSAttribute;
      //       if (nameAttribute && typeof nameAttribute.value === 'string') {
      //         name = nameAttribute.value;
      //       }

      //       // Fetch MongoDB _id for QR Code URL
      //       let qrCodeUrl = '';
      //       try {
      //         const response = await fetch(`/api/elements/${expressId}`);
      //         if (response.ok) {
      //           const elementData = await response.json();
      //           if (elementData && elementData._id) {
      //             const cleanedFragmentId = fragmentId.replace('models/', '');
      //             qrCodeUrl = `${window.location.origin}/element/${cleanedFragmentId}/${elementData._id}`;
      //           }
      //         }
      //       } catch (error) {
      //         console.error('Error fetching element data for QR code:', error);
      //       }

      //       selectedElementsData.push({ modelId: fragmentId, expressId, attrs: attrs ?? {}, psets, name, qrCodeUrl });
      //       allAttrs.push(attrs ?? {});
      //       allPsets.push(psets);
      //       allRawPsets.push(psetsRaw);
      //     }
      //   }

      //   if (isAddingToGroupRef.current && activeAddGroupIdRef.current !== null) {
      //     // Handle adding to group for multi-select
      //     for (const elementData of selectedElementsData) {
      //       const newItem = {
      //         id: `${elementData.modelId}-${elementData.expressId}`,
      //         name: elementData.name,
      //         expressID: elementData.expressId,
      //         fragmentId: elementData.modelId,
      //       };
      //       searchElementRef.current?.addItemToGroup(String(activeAddGroupIdRef.current), newItem);
      //     }
      //     await highlighter.clear("select");
      //   } else {
      //     // Handle info panel for multi-select
      //     if (selectedElementsData.length > 0) {
      //       setIsInfoOpen(true);
      //       setInfoLoading(true);

      //       // Aggregate attributes
      //       const aggregatedAttrs: ItemProps = {};
      //       if (allAttrs.length > 0) {
      //         const firstAttrs = allAttrs[0];
      //         for (const key in firstAttrs) {
      //           const allValuesForKey = allAttrs.map(attrs => attrs[key]?.value);
      //           const allValuesAreSame = allValuesForKey.every((val, i, arr) => val === arr[0]);
      //           if (allValuesAreSame) {
      //             aggregatedAttrs[key] = firstAttrs[key];
      //           } else {
      //             aggregatedAttrs[key] = { value: "multi", type: "text" };
      //           }
      //         }
      //       }

      //       // Aggregate psets (simplified for now, just showing "multi" if any pset differs)
      //       const aggregatedPsets: PsetDict = {};
      //       if (allPsets.length > 0) {
      //         const firstPsets = allPsets[0];
      //         for (const psetName in firstPsets) {
      //           const allPsetValuesForKey = allPsets.map(psets => psets[psetName]);
      //           const allPsetValuesAreSame = allPsetValuesForKey.every((val, i, arr) => JSON.stringify(val) === JSON.stringify(arr[0]));
      //           if (allPsetValuesAreSame) {
      //             aggregatedPsets[psetName] = firstPsets[psetName];
      //           } else {
      //             aggregatedPsets[psetName] = { value: "multi", type: "text" };
      //           }
      //         }
      //       }

      //       setSelectedModelId(selectedElementsData[0].modelId); // Still show first modelId
      //       setSelectedLocalId(selectedElementsData[0].expressId); // Still show first expressId
      //       setSelectedAttrs(aggregatedAttrs);
      //       setSelectedPsets(aggregatedPsets);
      //       setRawPsets(allRawPsets);

      //       setQrCodeData(selectedElementsData.map(data => ({ url: data.qrCodeUrl, name: data.name, modelId: data.modelId, expressId: data.expressId })));
      //       setInfoLoading(false);
      //     } else {
      //       setIsInfoOpen(false);
      //       setSelectedModelId(null);
      //       setSelectedLocalId(null);
      //       setSelectedAttrs({}); // Clear attrs to empty object
      //       setSelectedPsets({}); // Clear psets to empty object
      //       setRawPsets([]);
      //       setQrCodeData([]);
      //     }
      //   }
      // });
      // ★★★★★ 點擊事件處理 ★★★★★
      highlighter.events.select.onHighlight.add(async (selection) => {
        if(viewModeRef.current === "floor" || viewModeRef.current === 'device' || viewModeRef.current === 'issueforms' ) return;

        console.log('Global Highlight selection:', selection);
        
        // ★★★ 點擊物件 -> 隔離樓層邏輯 ★★★
        // 取得被點擊物件的 Model ID
        const fragmentId = Object.keys(selection)[0];
        // 解析樓層
        const floorName = extractFloorFromModelId(fragmentId);
        // 更新 selectedFloor 讓floormodepanel連動
        if(floorName){
          console.log(`Detected click on floor: ${floorName}, isolating...`);
          if (setSelectedFloorRef.current) {
            setSelectedFloorRef.current(floorName);
          }

          // 切換 ViewMode
          if (setViewModeRef.current) {
              console.log("Switching view mode to floor"); // Debug
              setViewModeRef.current('floor');
          }
        }else{
          setToast({ message: `Failed to isolate floor`, type: "error" });
        }
      });

      components.get(OBC.Hider);
      components.get(OBC.ItemsFinder);

      setComponents(components);

      const resizeObserver = new ResizeObserver(() => {
        renderer.resize();
        camera.updateAspect();
      });

      if (viewerRef.current) {
        resizeObserver.observe(viewerRef.current);
      }

      const updateIfManualMode = () => {
        const renderer = world.renderer as OBCF.PostproductionRenderer;
        if (renderer.mode === OBC.RendererMode.MANUAL) {
          renderer.needsUpdate = true;
        }
      };

      if (world.camera.controls) {
        world.camera.controls.addEventListener("update", updateIfManualMode);
      }
      if (world.renderer) {
        world.renderer.onResize.add(updateIfManualMode);
      }

      setIsViewerReady(true);
      
      return () => {
        resizeObserver.disconnect();
        if (world.camera.controls) {
          world.camera.controls.removeEventListener("update", updateIfManualMode);
        }
        if (world.renderer) {
          world.renderer.onResize.remove(updateIfManualMode);
        }
        components.dispose();
        setIsViewerReady(false);
      };
    };
    init();
  }, []);

  const extractAndSaveElements = async (model: FRAGS.FragmentsModel) => {
    if (!componentsRef.current) return;
    console.log("Starting element extraction...");
  
    try {
      const itemIDs = await model.getItemsIdsWithGeometry();
      if (itemIDs.length === 0) {
        console.log("No elements found in the model to extract.");
        return;
      }
      console.log(`Found ${itemIDs.length} elements. Processing in batches...`);
  
      const batchSize = 100; // Process 100 elements at a time
      let processedCount = 0;
      let totalInserted = 0;
  
      for (let i = 0; i < itemIDs.length; i += batchSize) {
        const batch = Array.from(itemIDs.slice(i, i + batchSize));
        
        const relationNames = await model.getRelationNames();
        const relationsConfig: { [key: string]: { attributes: boolean, relations: boolean } } = {};
        for (const name of relationNames) {
          relationsConfig[name] = { attributes: true, relations: true };
        }

        const batchProperties = await model.getItemsData(batch, {
          attributesDefault: true,
          relations: relationsConfig,
        });
  
        console.log("batchProperties:", batchProperties);

        const relationNamesSet = new Set(relationNames);
        const elementsToSave = batchProperties.map((properties: any) => {
          const attributes: { [key: string]: any } = {};
          const relations: { [key: string]: any } = {};
          let psets: PsetDict = {};

          if (properties) {
            for (const key in properties) {
              if (relationNamesSet.has(key)) {
                relations[key] = properties[key];
                if (key === "IsDefinedBy" && Array.isArray(properties[key])) {
                  psets = formatItemPsets(properties[key]);
                }
              } else {
                attributes[key] = properties[key];
              }
            }
          }

          return {
            modelId: model.modelId,
            expressID: attributes._localId?.value,
            attributes,
            psets,
            relations,
          };
        });
  
        console.log("elementsToSave:", elementsToSave);

        if (elementsToSave.length > 0) {
          const response = await fetch('/api/elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(elementsToSave),
          });
  
          if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API request failed for batch starting at index ${i}: ${errorBody}`);
            // Continue to next batch instead of stopping
            continue;
          }
  
          const apiResult = await response.json();
          totalInserted += apiResult.insertedCount || 0;
        }
  
        processedCount += batch.length;
        console.log(`Processed ${processedCount}/${itemIDs.length} elements. Total inserted so far: ${totalInserted}`);
      }
  
      console.log("Finished processing all batches.");
      setToast({ message: `Successfully processed all elements. A total of ${totalInserted} new elements were saved to the database!`, type: "success" });
  
    } catch (error) {
      console.error("An error occurred during element extraction:", error);
      setToast({ message: "Failed to extract elements. Check the console for details.", type: "error" });
    }
  };

  useEffect(() => {
    /*
    const loadModelFromDB = async () => {
      if (!fragmentsRef.current) return;
      setShowProgressModal(true);
      setProgress(0);

      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 5;
        if (simulatedProgress >= 98) simulatedProgress = 98;
        setProgress(Math.floor(simulatedProgress));
      }, 180);

      try {
        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error(`Failed to fetch model from DB: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const modelId = `default-db-model`;
        
        for (const [id] of fragmentsRef.current.list) {
          fragmentsRef.current.core.disposeModel(id);
        }

        const model = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
        
        fragmentsRef.current.list.set(modelId, model);

        setUploadedModels([{ id: modelId, name: "Default Model from DB", type: "frag", data: arrayBuffer }]);

        await loadCategoriesFromAllModels();

        // Call extraction function once the model is loaded
        // await extractAndSaveElements(model);

        clearInterval(progressInterval);
        setProgress(100);
        await new Promise((r) => setTimeout(r, 500));

      } catch (error) {
        console.error(`Failed to load model from DB:`, error);
        clearInterval(progressInterval);
      } finally {
        setShowProgressModal(false);
      }
    };
    */

    // const loadModelFromR2 = async () => {
    //   if (!fragmentsRef.current) return;
    //   setShowProgressModal(true);
    //   setProgress(0);

    //   let simulatedProgress = 0;
    //   const progressInterval = setInterval(() => {
    //     simulatedProgress += Math.random() * 8;
    //     if (simulatedProgress >= 98) simulatedProgress = 98;
    //     setProgress(Math.floor(simulatedProgress));
    //   }, 180);

    //   try {
    //     console.log("Loading model from R2...");
    //     const downloadResponse = await fetch('/api/models/r2-upload/download', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ fileName: '2024.04.18合併簡化-1V2.frag' }),
    //     });

    //     if (!downloadResponse.ok) {
    //       throw new Error(`Failed to get signed URL: ${downloadResponse.statusText}`);
    //     }

    //     const { signedUrl } = await downloadResponse.json();
    //     const modelResponse = await fetch(signedUrl);

    //     if (!modelResponse.ok) {
    //       throw new Error(`Failed to download model from R2: ${modelResponse.statusText}`);
    //     }

    //     const arrayBuffer = await modelResponse.arrayBuffer();
    //     const modelId = `default-db-model`;

    //     for (const [id] of fragmentsRef.current.list) {
    //       fragmentsRef.current.core.disposeModel(id);
    //     }

    //     const model = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
    //     fragmentsRef.current.list.set(modelId, model);

    //     setUploadedModels([{ id: modelId, name: "Default Model from R2", type: "frag", data: arrayBuffer }]);
    //     await loadCategoriesFromAllModels();

    //   } catch (error) {
    //     console.error('Failed to load model from R2:', error);
    //   } finally {
    //     clearInterval(progressInterval);
    //     setProgress(100);
    //     setTimeout(() => setShowProgressModal(false), 500);
    //   }
    // };

    // We only load the model from the DB once the viewer components are ready
    // AND the user is logged in.&& isLoggedIn
    //  isLoggedIn,
    const initModels = async () => {
      if (componentsRef.current  && fragmentsRef.current) {
        // loadModelFromDB(); // Keep commented out as per previous instructions
        // await loadModelFromR2(); // Load the default model first
        await fetchR2Models(); // Then fetch and merge R2 models
      }
    };
    initModels();
  }, [componentsRef.current, fetchR2Models]);

  useEffect(() => {
    if (!componentsRef.current || !worldRef.current) return;

    const handleDblClick = () => {
      if (activeTool === "length" && measurerRef.current?.enabled) {
        measurerRef.current.create();
      } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
        areaMeasurerRef.current.create();
      } else if (activeTool === "clipper" && clipperRef.current?.enabled) {
        clipperRef.current.create(worldRef.current);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
        if (e.code === "Enter" || e.code === "NumpadEnter") {
          areaMeasurerRef.current.endCreation();
        } else if (e.code === "Delete" || e.code === "Backspace") {
          areaMeasurerRef.current.delete();
        }
      }
      if (activeTool === "length" && measurerRef.current?.enabled) {
        if (e.code === "Delete" || e.code === "Backspace") {
          measurerRef.current.delete();
        }
      }
      if (activeTool === "clipper" && clipperRef.current?.enabled) {
        if (e.code === "Delete" || e.code === "Backspace") {
          clipperRef.current.delete(worldRef.current);
        }
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (activeTool !== "clipper" || !clipperRef.current || !worldRef.current) return;
      event.preventDefault();
      clipperRef.current.delete(worldRef.current);
    };

    viewerRef.current?.addEventListener("dblclick", handleDblClick);
    window.addEventListener("keydown", handleKeyDown);
    viewerRef.current?.addEventListener("contextmenu", handleContextMenu);

    return () => {
      viewerRef.current?.removeEventListener("dblclick", handleDblClick);
      window.removeEventListener("keydown", handleKeyDown);
      viewerRef.current?.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [componentsRef.current, worldRef.current, activeTool]);

  useEffect(() => {
    if (!components || !worldRef.current) return;
    const highlighter = components.get(OBCF.Highlighter);

    // This part is the "setup" for the current activeTool
    if (activeTool === "clipper") {
      if (clipperRef.current) clipperRef.current.enabled = true;
      if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "length") {
        if (!measurerRef.current) {
          const length = components.get(OBCF.LengthMeasurement);
          length.world = worldRef.current;
          length.color = new Color("#494cb6");
          measurerRef.current = length;
        }
        measurerRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "area") {
        if (!areaMeasurerRef.current) {
          const area = components.get(OBCF.AreaMeasurement);
          area.world = worldRef.current;
          area.color = new Color("#494cb6");
          areaMeasurerRef.current = area;
        }
        areaMeasurerRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "colorize") {
        colorizeRef.current.enabled = true;
        if (highlighter) {
          highlighter.enabled = true;
          highlighter.zoomToSelection = false;
          const style = highlighter.styles.get("select");
          if (style) {
            setOriginalSelectStyle({ color: style.color.clone(), opacity: style.opacity });
            style.opacity = 0;
          }
        }
    } else if (activeTool === "collision") {
        setIsCollisionModalOpen(true);
        if (highlighter) highlighter.enabled = true;
    } else if (activeTool === "search") {
        setIsSearchOpen(true);
    } else if (activeTool === "multi-select") {
        if (highlighter) highlighter.zoomToSelection = false;
    } else {
        // No tool is active
        if (highlighter) {
            highlighter.zoomToSelection = false;
            if (originalSelectStyle) {
              const style = highlighter.styles.get("select");
              if (style) {
                style.color.set(originalSelectStyle.color);
                style.opacity = originalSelectStyle.opacity;
              }
              setOriginalSelectStyle(null);
            }
        }
    }

    // This is the cleanup function. It will run when activeTool changes again,
    // or when the component unmounts. It captures the value of `activeTool` from its render.
    return () => {
      if (activeTool === "clipper" && clipperRef.current) {
        clipperRef.current.enabled = false;
        clipperRef.current.list.clear();
      } else if (activeTool === "length" && measurerRef.current) {
        measurerRef.current.cancelCreation();
        measurerRef.current.list.clear();
        measurerRef.current.enabled = false;
      } else if (activeTool === "area" && areaMeasurerRef.current) {
        areaMeasurerRef.current.cancelCreation();
        areaMeasurerRef.current.list.clear();
        areaMeasurerRef.current.enabled = false;
      }
      // When any tool is deactivated, we should restore the highlighter
      if (highlighter) {
        highlighter.enabled = true;
      }
    };
  }, [activeTool, components]);

  useEffect(() => {
    if (measurerRef.current) {
      measurerRef.current.mode = lengthMode;
    }
  }, [lengthMode]);

  // 隨時同步最新值到 Ref
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]); 

  useEffect(() => {
    if (areaMeasurerRef.current) {
      areaMeasurerRef.current.mode = areaMode;
    }
  }, [areaMode]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;

    let start: Vector2 | null = null;
    let box: HTMLDivElement | null = null;

    const onPointerDown = (event: PointerEvent) => {
      // Require Left Mouse Button + Shift key
      if (event.button !== 0 || !event.shiftKey || !worldRef.current) return;

      const rect = container.getBoundingClientRect();
      start = new Vector2(event.clientX - rect.left, event.clientY - rect.top);

      box = document.createElement("div");
      box.className = "selection-box";
      box.style.left = `${start.x}px`;
      box.style.top = `${start.y}px`;

      container.appendChild(box);

      if (worldRef.current.camera.controls) {
        worldRef.current.camera.controls.enabled = false;
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!start || !box) return;

      const rect = container.getBoundingClientRect();
      const current = new Vector2(event.clientX - rect.left, event.clientY - rect.top);

      const minX = Math.min(start.x, current.x);
      const minY = Math.min(start.y, current.y);
      const width = Math.abs(start.x - current.x);
      const height = Math.abs(start.y - current.y);

      box.style.left = `${minX}px`;
      box.style.top = `${minY}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
    };

    const onPointerUp = async (event: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (worldRef.current && worldRef.current.camera.controls) {
        worldRef.current.camera.controls.enabled = true;
      }

      if (!start || !box || !worldRef.current || !fragmentsRef.current || !highlighterRef.current) {
        box?.remove();
        start = null;
        box = null;
        return;
      }

      const rect = container.getBoundingClientRect();
      const end = new Vector2(event.clientX - rect.left, event.clientY - rect.top);

      const topLeft = new Vector2(Math.min(start.x, end.x), Math.min(start.y, end.y));
      const bottomRight = new Vector2(Math.max(start.x, end.x), Math.max(start.y, end.y));

      box.remove();
      start = null;
      box = null;

      const modelIdMap: OBC.ModelIdMap = {};
      for (const [, model] of fragmentsRef.current.list) {
        const res = await model.rectangleRaycast({
          camera: worldRef.current.camera.three,
          dom: worldRef.current.renderer.three.domElement,
          topLeft,
          bottomRight,
          fullyIncluded: true,
        });

        if (res && res.localIds.length) {
          modelIdMap[model.modelId] = new Set(res.localIds);
        }
      }

      if (Object.keys(modelIdMap).length) {
        await highlighterRef.current.highlightByID(
          highlighterRef.current.config.selectName,
          modelIdMap,
          false,
          false
        );
      } else {
        await highlighterRef.current.clear(highlighterRef.current.config.selectName);
      }
    };

    container.addEventListener("pointerdown", onPointerDown);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  // const IfcUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file || !ifcLoaderRef.current || !fragmentsRef.current || !worldRef.current) return;

  //   try {
  //     setProgress(0);
  //     setShowProgressModal(true);

  //     let simulatedProgress = 0;
  //     const progressInterval = setInterval(() => {
  //       simulatedProgress += Math.random() * 5;
  //       if (simulatedProgress >= 98) simulatedProgress = 98;
  //       setProgress(Math.floor(simulatedProgress));
  //     }, 180);

  //     const arrayBuffer = await file.arrayBuffer();
  //     const uint8Array = new Uint8Array(arrayBuffer);
  //     const cleanedFileName = file.name.replace(/[^a-zA-Z0-9-_.]/g, '_');
  //     const modelId = `${cleanedFileName}_${Date.now()}`;

  //     const fragModel = await ifcLoaderRef.current.load(uint8Array, true, modelId, {
  //       instanceCallback: (importer: any) => console.log("IfcImporter ready", importer),
  //       userData: {},
  //     });

  //     fragmentsRef.current.list.set(modelId, fragModel);

  //     worldRef.current.scene.three.add(fragModel.object);
  //     await fragmentsRef.current.core.update(true);
  //     fragModel.useCamera(worldRef.current.camera.three);

  //     setUploadedModels((prev) => [...prev, { id: modelId, name: file.name, type: "ifc", data: arrayBuffer }]);

  //     clearInterval(progressInterval);
  //     setProgress(100);
  //     await new Promise((r) => setTimeout(r, 300));

  //     await loadCategoriesFromAllModels();
  //   } catch (err) {
  //     console.error("Failed to load IFC:", err);
  //   } finally {
  //     setShowProgressModal(false);
  //     event.target.value = "";
  //   }
  // };
  
  // const handleFragmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file || !fragmentsRef.current || !worldRef.current) return;

  //   try {
  //     setProgress(0);
  //     setShowProgressModal(true);

  //     let simulatedProgress = 0;
  //     const progressInterval = setInterval(() => {
  //       simulatedProgress += Math.random() * 5;
  //       if (simulatedProgress >= 98) simulatedProgress = 98;
  //       setProgress(Math.floor(simulatedProgress));
  //     }, 180);

  //     const arrayBuffer = await file.arrayBuffer();
  //     const modelId = `frag_uploaded_${Date.now()}`;

  //     const fragModel = await fragmentsRef.current.core.load(arrayBuffer, { modelId });

  //     clearInterval(progressInterval);
  //     setProgress(100);
  //     await new Promise((r) => setTimeout(r, 500));

  //     fragModel.useCamera(worldRef.current.camera.three);
  //     worldRef.current.scene.three.add(fragModel.object);
  //     fragmentsRef.current.core.update(true);

  //     setUploadedModels((prev) => [...prev, { id: modelId, name: file.name, type: "frag", data: arrayBuffer }]);
  //   } finally {
  //     setShowProgressModal(false);
  //     event.target.value = "";
  //   }
  // };
  
  
  const formatItemPsets = (raw: FRAGS.ItemData[]) => {
    const result: PsetDict = {};
    for (const pset of raw) {
      const { Name: psetName, HasProperties } = pset as any;
      if (!(psetName && "value" in psetName && Array.isArray(HasProperties))) continue;
      const props: Record<string, any> = {};
      for (const prop of HasProperties) {
      const { Name, NominalValue } = prop || {};
      if (!(Name && "value" in Name && NominalValue && "value" in NominalValue)) continue;
      props[Name.value] = NominalValue.value;
      }
      result[psetName.value] = props;
    }
    return result;
  };

  const onToggleVisibility = async () => {
    const highlighter = componentsRef.current?.get(OBCF.Highlighter);
    const hider = componentsRef.current?.get(OBC.Hider);
    if (!highlighter || !hider) return;

    const selection = highlighter.selection.select;
    if (!selection || Object.keys(selection).length === 0) return;

    for (const modelId in selection) {
      const localIds = Array.from(selection[modelId]);
      if (localIds.length === 0) continue;

      const fragments = componentsRef.current?.get(OBC.FragmentsManager);
      const model = fragments?.list.get(modelId);
      if (!model) continue;

      const visibility = await model.getVisible(localIds);
      const isAllVisible = visibility.every((v) => v);

      const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set(localIds) };
      await hider.set(!isAllVisible, modelIdMap);
    }
  };
  
  const onIsolate = async () => {
    const highlighter = componentsRef.current?.get(OBCF.Highlighter);
    const hider = componentsRef.current?.get(OBC.Hider);
    if (!highlighter || !hider) return;
    const selection = highlighter.selection.select;
    if (!selection || Object.keys(selection).length === 0) return;
    await hider.set(false);
    await hider.set(true, selection);
  };

  // const getAllCenterAndBox3 = async() => {
  //   const boxer = boxerRef.current as OBC.BoundingBoxer;
  //   const fragments = fragmentsRef.current as OBC.FragmentsManager;
  //   const visibleMap: OBC.ModelIdMap = {};
  //   const allPositions: THREE.Vector3[] = [];

  //   boxer.list.clear();

  //   // 遍歷所有已載入的模型
  //   for (const [modelId, model] of fragments.list) {
  //         // 1. 獲取該模型所有可見的 expressIds
  //         const expressIds = await model.getItemsByVisibility(true);

  //         if (expressIds.length > 0) {
  //             // 2. ★ 修正：不需要內層迴圈！直接一次性獲取這些 ID 的位置
  //             // getPositions 本身就是設計來接收 ID 陣列的
  //             const positions = await model.getPositions(expressIds);
              
  //             // 3. 將位置加入總列表 (這樣比 push(...spread) 稍微快一點，或者保持原樣也可以)
  //             for (let i = 0; i < positions.length; i++) {
  //                 allPositions.push(positions[i]);
  //             }
  //         }
  //   }
  //   if (allPositions.length === 0) return;

  //   const myManualBox3 = new THREE.Box3().setFromPoints(allPositions);

  //   // 幾何中心 (Box3 的中心)
  //   const myManualCenter = new THREE.Vector3();
  //   myManualBox3.getCenter(myManualCenter);

  //   globalBox3Ref.current = myManualBox3;
  //   globalCenterRef.current = myManualCenter;

  //   console.log("✅ 全局中心點計算完成:", globalBox3Ref.current,globalCenterRef.current);
  // }
  // 定義視角模式
  type FocusMode = 'top-down' | 'isometric' | 'tight-fit';
  const onFocus = useCallback(async (mode: FocusMode = 'tight-fit') => {

    if (!cameraRef.current || !boxerRef.current || !highlighterRef.current) return;

      setIsGlobalLoading(true);
      setLoadingMessage("正在聚焦中");

      const world = worldRef.current;
      const camera = world.camera as OBC.OrthoPerspectiveCamera;
      const fragments = fragmentsRef.current as OBC.FragmentsManager;
      const boxer = boxerRef.current;

      boxer.list.clear();

      const visibleMap: OBC.ModelIdMap = {};
      
      // 遍歷所有已載入的模型
      for (const [modelId,model] of fragments.list) {
        // 獲取可見的expressIds
        const expressIds = await model.getItemsByVisibility(true);
        
        if (expressIds.length > 0) {
          for( const expressId of expressIds ){
            // 將這些visible為true 的 ID 加入 map
            visibleMap[modelId] = new Set(expressIds);
          }
        }
      }

      console.log(visibleMap);
      const modelIdCount = Object.keys(visibleMap).length;
      if(modelIdCount > 1 && globalBox3Ref.current && globalCenterRef.current){
        console.log("偵測到使用者選擇全部樓層");
        switch (mode) {
          case 'top-down': // === 俯視模式 (像 2D 平面圖) ===
            await camera.controls.setLookAt(
              globalCenterRef.current.x ,globalCenterRef.current.y + 80,globalCenterRef.current.z + 100,
              globalCenterRef.current.x ,globalCenterRef.current.y ,globalCenterRef.current.z,
              true // 開啟過渡動畫
            );
            setIsGlobalLoading(false);
            break;
          // 125,-20,100,
          //         0,0,0,
          case 'isometric': // === 等角模式 (工程視角) ===
            await camera.controls.setLookAt(
            globalBox3Ref.current.min.x + 160, globalBox3Ref.current.min.y + 50, globalBox3Ref.current.min.z + 110,
            globalBox3Ref.current.min.x - 40, globalBox3Ref.current.min.y + 10, globalBox3Ref.current.min.z -40,                    
            true
          );
          setIsGlobalLoading(false);
          break;

          case 'tight-fit': // === 緊湊聚焦 (原版 fit 的改良) ===
            // 使用底層的 fitToBox 並給予極小的 padding (預設 fit 會留很多白邊)
            await camera.controls.fitToBox(globalBox3Ref.current, true);
            setIsGlobalLoading(false);
            break;
        }
      }else{
        console.log("偵測到使用者選擇單樓層或單元素");
        await boxer.addFromModelIdMap(visibleMap);

        const box3 = boxer.get();


        // (防呆) 如果場景完全是空的，box3 會是空的，直接返回避免報錯
        if (box3.isEmpty()) {
          console.warn("場景中沒有任何模型可供聚焦");
          setIsGlobalLoading(false);
          return;
        }
        // 3. 計算選取物件的精確包圍盒 (Bounding Box) 與中心點 (Center)
        // 這是比 camera.fit() 更精準的關鍵，我們手動算出幾何中心
        const center = new THREE.Vector3();
        box3.getCenter(center);
        
        const size = new THREE.Vector3();
        box3.getSize(size);

        console.log("Center",center);
        console.log("Box3",box3);

        // 4. 根據模式執行不同的相機操作
        switch (mode) {
          case 'top-down': // === 俯視模式 (像 2D 平面圖) ===
            await camera.controls.setLookAt(
              center.x,center.y + 50,center.z + 80,
              center.x,center.y,center.z,
              true // 開啟過渡動畫
            );
            setIsGlobalLoading(false);
            break;
          // 125,-20,100,
          //         0,0,0,
          case 'isometric': // === 等角模式 (工程視角) ===
            await camera.controls.setLookAt(
            120,-20,60,
            0,-40,-40,                    
            true
          );
          setIsGlobalLoading(false);
          break;

          case 'tight-fit': // === 緊湊聚焦 (原版 fit 的改良) ===
            // 使用底層的 fitToBox 並給予極小的 padding (預設 fit 會留很多白邊)
            await camera.controls.fitToBox(box3, true, {
              paddingLeft: 0.1, 
              paddingRight: 0.1, 
              paddingTop: 0.1, 
              paddingBottom: 0.1
            });
            setIsGlobalLoading(false);
            break;
        }
      }
      
  },[worldRef, boxerRef, highlighterRef]);
  
  const onShow = async () => {
    await viewerApi.showAllElements();
    // setIsInfoOpen(false);
    if(highlighterRef) await highlighterRef.current?.clear();

    setSelectedModelId(null);
    setSelectedLocalId(null);
    setSelectedAttrs({});
    setSelectedPsets({});
    setRawPsets([]);
  };

  // --- 核心邏輯：切換檢視模式 ---
  const handleSwitchViewMode = async (mode: 'global' | 'allfloors' | 'floor' | 'device' | 'warnings' | 'issueforms') => {
    
    // 1. ★★★ 關鍵修改：最優先切換 ViewMode ★★★
    // 這會讓 React 在下一次渲染時直接 Unmount (移除) FloorModePanel
    // 這樣它就不會監聽到後面的 setSelectedFloor(null) 而觸發 Effect 了
    setViewMode(mode);

    if (mode === 'global') {
      setIsGlobalLoading(true);
      setLoadingMessage("正在切換成全景模式...");
      // 2. 恢復 3D 視圖全景
      // 這時候 FloorModePanel 已經準備要消失了，這裡的操作才是權威
      outlinerRef.current?.clean();
      markerRef.current?.dispose();

      await onShow();
      await onFocus('isometric');

      if(selectedDevice) setSelectedDevice(null);
      if(selectedFragId) setSelectedFragId(null);
      if(selectedFloor) setSelectedFloor(null);
      if(selectedDeviceName) setSelectedDeviceName(null);
      // 3. 清除選中的樓層狀態 (為了資料一致性)
      // 使用 null 比 "" 更安全，視你的 Context 定義而定
      console.log("清空選中expressId",selectedDevice);
      console.log("清空選中FragId",selectedFragId);
      console.log("清空選中Floor",selectedFloor);
      console.log("清空選中DeviceName",selectedDeviceName);

      // 按鈕狀態管理
      setIsHVACOn(false);
      setIsCCTVOn(false);
      setIsEACOn(false);

      setIsGlobalLoading(false);
    }
    if (mode === 'allfloors') {

      setIsGlobalLoading(true);
      setLoadingMessage("正在切換成分層模式...");

      outlinerRef.current?.clean();
      markerRef.current?.dispose();
      
      await onShow();
      await onFocus('isometric');
      
      if(selectedDevice) setSelectedDevice(null);
      if(selectedFragId) setSelectedFragId(null);
      if(selectedFloor) setSelectedFloor(null);
      if(selectedDeviceName) setSelectedDeviceName(null);
      // 3. 清除選中的樓層狀態 (為了資料一致性)
      // 使用 null 比 "" 更安全，視你的 Context 定義而定
      console.log("清空選中expressId",selectedDevice);
      console.log("清空選中FragId",selectedFragId);
      console.log("清空選中Floor",selectedFloor);
      console.log("清空選中DeviceName",selectedDeviceName);

      // 按鈕狀態管理
      setIsHVACOn(false);
      setIsCCTVOn(false);
      setIsEACOn(false);

      setIsGlobalLoading(false);
    }
    if (mode === 'floor') {

      //恢復單層
      // 去掉selected device跟fragId
      if(selectedDevice) setSelectedDevice(null);
      if(selectedFragId) setSelectedFragId(null);
      if(selectedDeviceName) setSelectedDeviceName(null);
      console.log("清空選中expressId",selectedDevice);
      console.log("清空選中FragId",selectedFragId);
      console.log("清空選中DeviceName",selectedDeviceName);

      // 按鈕狀態管理
      setIsHVACOn(false);
      setIsCCTVOn(false);
      setIsEACOn(false);
      
    }

    if(mode === 'device') {

      outlinerRef.current?.clean();
      markerRef.current?.dispose();
      // 按鈕狀態管理
      setIsHVACOn(false);
      setIsCCTVOn(false);
      setIsEACOn(false);

    }

  };

  const originalColors  = useRef(new Map<
    FRAGS.BIMMaterial, 
    { color: number; transparent: boolean; opacity: number }
  >());

  const setModelTransparent = (components: OBC.Components) => {
    const fragments = components.get(OBC.FragmentsManager);

    const materials = [...fragments.core.models.materials.list.values()];
    for (const material of materials) {
      if (material.userData.customId) continue;

      if (!originalColors.current.has(material)) {
        let color: number;
        if ('color' in material) {
          color = material.color.getHex();
        } else {
          color = material.lodColor.getHex();
        }

        originalColors.current.set(material, {
          color,
          transparent: material.transparent,
          opacity: material.opacity,
        });
      }

      material.transparent = true;
      material.opacity = 0.6;
      material.needsUpdate = true;

      if ('color' in material) material.color.setRGB(0.2, 0.2, 0.2);
      else material.lodColor.setRGB(0.5, 0.5, 0.5);
    }
  };

  const restoreModelMaterials = () => {
    for (const [material, data] of originalColors.current) {
      material.transparent = data.transparent;
      material.opacity = data.opacity;
      if ('color' in material) material.color.setHex(data.color);
      else material.lodColor.setHex(data.color);
      material.needsUpdate = true;
    }
    originalColors.current.clear();
  };

  const handleGhost = () => {
    if (!componentsRef.current) return;

    if (isGhost) {
      restoreModelMaterials();
      setIsGhost(false);
    } else {
      setModelTransparent(componentsRef.current);
      setIsGhost(true);
    }
  };

  const handleToggleShadowSceneAndOpenSettings = () => {
    toggleShadowScene();
    setIsSidebarOpen(true);
    setActiveSidebarTab("Settings");
    setActiveSettingsTab("shadows");
  };

  const handleToggleColorShadows = () => {
    if (!worldRef.current) return;

    const renderer = worldRef.current.renderer as OBCF.PostproductionRenderer;

    const newEnabled = !isColorShadowsEnabled;
    setIsColorShadowsEnabled(newEnabled);

    renderer.mode = newEnabled
      ? OBC.RendererMode.MANUAL
      : OBC.RendererMode.AUTO;

    renderer.postproduction.style = newEnabled
      ? OBCF.PostproductionAspect.COLOR_SHADOWS
      : OBCF.PostproductionAspect.COLOR;

    if (renderer.mode === OBC.RendererMode.MANUAL) {
      renderer.needsUpdate = true;
    }
  };

  const toggleShadowScene = async () => {
    if (!worldRef.current || !components) return;
    const world = worldRef.current;
    setIsShadowed(!(world.scene instanceof OBC.ShadowedScene));
    const fragments = components.get(OBC.FragmentsManager);
    const models = Array.from(fragments.list.values());
    const grids = components.get(OBC.Grids);
    const grid = grids.list.get("default");

    if (restListener.current) {
      world.camera.controls.removeEventListener("rest", restListener.current);
      restListener.current = null;
    }

    if (grid) {
      world.scene.three.remove(grid.three);
    }

    world.scene.dispose();

    if (world.scene instanceof OBC.ShadowedScene) {
      const newScene = new OBC.SimpleScene(components);
      world.scene = newScene;
      newScene.setup();
      world.renderer.three.shadowMap.enabled = false;
      if (grid) {
        newScene.three.add(grid.three);
      }
    } else {
      const newScene = new OBC.ShadowedScene(components);
      world.scene = newScene;
      newScene.setup();
      world.renderer.three.shadowMap.enabled = true;
      world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;

      newScene.setup({
        shadows: {
          cascade: 1,
          resolution: 1024,
        },
      });

      if (grid) {
        newScene.three.add(grid.three);
        const gridMesh = grid.three as Mesh;
        gridMesh.material = new MeshLambertMaterial({ color: 0x444444, side: DoubleSide });
        newScene.distanceRenderer.excludedObjects.add(gridMesh);
      }
      
      await newScene.updateShadows();

      if (world.renderer) {
        world.renderer.three.render(world.scene.three, world.camera.three);
      }

      restListener.current = async () => {
        if (world.scene instanceof OBC.ShadowedScene) {
            await newScene.updateShadows();
        }
      };
      world.camera.controls.addEventListener("rest", restListener.current);
    }

    for (const model of models) {
      world.scene.three.add(model.object);
      if (world.scene instanceof OBC.ShadowedScene) {
        model.tiles.onItemSet.add(({ value: mesh }) => {
          if ("isMesh" in mesh) {
            const mat = mesh.material as THREE.MeshStandardMaterial[];
            if (mat[0].opacity === 1) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          }
        });
        for (const child of model.object.children) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    }
    
    world.scene.three.background = null;
    if (cameraRef.current) {
      cameraRef.current.updateAspect();
    }
  };

  const handleClipper = () => {
    setActiveTool(prev => prev === "clipper" ? null : "clipper");
  };

  const handleLength = () => {
    setActiveTool(prev => prev === "length" ? null : "length");
  };

  const handleArea = () => {
    setActiveTool(prev => prev === "area" ? null : "area");
  };

  const deleteSelectedModel = async (model: UploadedModel) => {
    if (!fragmentsRef.current || !worldRef.current) return;

    // Remove from Three.js scene and dispose resources
    const fragModel = fragmentsRef.current.list.get(model.id);
    if (fragModel) {
      worldRef.current.scene.three.remove(fragModel.object);
    }
    fragmentsRef.current.core.disposeModel(model.id);

    // Delete from R2 and MongoDB if it's an R2 model
    if (model.r2FileName && model._id) { // Ensure _id exists for R2 models
      try {
        const response = await fetch('/api/models/r2-upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: model._id, r2FileName: model.r2FileName }), // Use model._id here
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete model from R2 and MongoDB');
        }
        console.log(`Model ${model.name} deleted from R2 and MongoDB.`);
        setToast({ message: `Model ${model.name} deleted successfully!`, type: "success" });
        await fetchR2Models(); // Refresh the list after successful deletion
      } catch (error) {
        console.error('Error deleting model from R2 and MongoDB:', error);
        setToast({ message: `Failed to delete model ${model.name} from R2 and MongoDB. Check console for details.`, type: "error" });
      }
    }

    if (selectedModelId === model.id) {
      setSelectedModelId(null);
      setSelectedLocalId(null);
      setSelectedAttrs({});
      setSelectedPsets({});
      setRawPsets([]);
    }

    setUploadedModels((prev) => prev.filter((m) => m.id !== model.id));
    await fetchR2Models();
  };

  // const deleteAllModels = async () => {
  //   if (!fragmentsRef.current || !worldRef.current) return;
    
  //   for (const [modelId, fragModel] of fragmentsRef.current.list) {
  //     worldRef.current.scene.three.remove(fragModel.object);
  //     fragmentsRef.current.core.disposeModel(modelId);
  //   }

  //   // Delete all R2 models from R2 and MongoDB
  //   const r2ModelsToDelete = uploadedModels.filter(m => m.r2FileName && m._id); // Ensure _id exists
  //   for (const model of r2ModelsToDelete) {
  //     try {
  //       const response = await fetch('/api/models/r2-upload/delete', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ modelId: model._id, r2FileName: model.r2FileName }), // Use model._id here
  //       });
  //       if (!response.ok) {
  //         const errorData = await response.json();
  //         throw new Error(errorData.error || 'Failed to delete model from R2 and MongoDB');
  //       }
  //       console.log(`Model ${model.name} deleted from R2 and MongoDB.`);
  //       setToast({ message: `Model ${model.name} deleted successfully!`, type: "success" });
  //     } catch (error) {
  //       console.error('Error deleting model from R2 and MongoDB:', error);
  //       setToast({ message: `Failed to delete model ${model.name} from R2 and MongoDB. Check console for details.`, type: "error" });
  //     }
  //   }

  //   setSelectedModelId(null);
  //   setSelectedLocalId(null);
  //   setSelectedAttrs({});
  //   setSelectedPsets({});
  //   setRawPsets([]);

  //   setUploadedModels([]);
  //   await fetchR2Models(); // Refresh the list after successful deletion
  // };

  const createViewpoint = async (): Promise<OBC.Viewpoint | null> => {
    if (!viewpointsRef.current) return null;

    const vp = viewpointsRef.current.create();
    if (!vp) return null;

    vp.title = `Viewpoint ${storedViews.length + 1}`;
    await vp.updateCamera();

    const snapshotData = getViewpointSnapshotData(vp) || "";

    setStoredViews((prev) => [
      ...prev,
      {
        id: vp.guid,
        title: vp.title || `Viewpoint ${prev.length + 1}`,
        viewpoint: vp,
        snapshot: snapshotData,
      },
    ]);

    setCurrentViewpoint(vp);
    return vp;
  };

  const updateViewpointCamera = async () => {
    if (!currentViewpoint) return;
    await currentViewpoint.updateCamera();
  };

  const setWorldCamera = async () => {
    if (!currentViewpoint || !worldRef.current) return;
    await currentViewpoint.go();
  };

  const getViewpointSnapshotData = (vp: OBC.Viewpoint): string | null => {
    if (!vp || !viewpointsRef.current) return null;

    const data = viewpointsRef.current.snapshots.get(vp.guid);
    if (!data) return null;

    if (data instanceof Uint8Array) {
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    return String(data);
  };

  // const loadCategoriesFromAllModels = async () => {
  //   if (!fragmentsRef.current) return;

  //   const allCats: Set<string> = new Set();

  //   for (const model of fragmentsRef.current.list.values()) {
  //     const cats = await model.getItemsOfCategories([/.*/]);
  //     Object.keys(cats).forEach((c) => allCats.add(c));
  //   }

  //   setCategories(Array.from(allCats).sort());
  // };



  const isolateCategory = async (category: string | null) => {
    if (!category || !fragmentsRef.current) return;

    const fragments = fragmentsRef.current;
    const hider = componentsRef.current?.get(OBC.Hider);
    if (!hider) return;

    const selection: Record<string, Set<number>> = {};

    for (const [, model] of fragments.list) {
      try {
        const categoryItems = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);
        const localIds = Object.values(categoryItems).flat();

        if (localIds.length > 0) {
          selection[model.modelId] = new Set(localIds);
        }
      } catch (err) {
        console.warn(`Failed to get category items for model ${model.modelId}`, err);
      }
    }

    await hider.set(false);
    await hider.set(true, selection);

    fragments.core.update(true);
  };


  // const onCategorySelect = (cat: string | null) => {
  //   setSelectedCategory(cat);

  //   setTimeout(() => {
  //     isolateCategory(cat).catch(console.warn);
  //   }, 100);
  // };

  const handleToggleAddMode = (active: boolean, groupId: string | null) => {
    setIsAddingToGroup(active);
    setActiveAddGroupId(groupId);
    // The highlighter should remain enabled to capture clicks.
    // The logic within onHighlight will handle the mode change.
  };

  const handleColorize = (color?: string) => {
    if (!color) return;
    setSelectedColor(color);
  };

  const handleColorizeToggle = () => {
    setActiveTool(prev => prev === "colorize" ? null : "colorize");
  };

  const handleClearColor = async () => {
    if (!componentsRef.current) return;
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    const styles = highlighter.styles;
    const stylesToClear: string[] = [];
    for (const [styleName] of styles) {
      if (styleName.startsWith("colorize-")) {
        stylesToClear.push(styleName);
      }
    }

    for (const styleName of stylesToClear) {
      await highlighter.clear(styleName);
      styles.delete(styleName);
    }
  };

  const handleSelectFloor = (floor: number) => {
    console.log("Selected floor:", floor);
    // Floor selection logic is temporarily disabled as per user request.
  };

  const resetViewer = () => {
    if (!fragmentsRef.current || !worldRef.current) return;
    
    // 1. 清除 3D 場景中的模型
    for (const [modelId, fragModel] of fragmentsRef.current.list) {
      worldRef.current.scene.three.remove(fragModel.object);
      fragmentsRef.current.core.disposeModel(modelId);
    }

    // 2. 重置所有相關的 React State
    setSelectedModelId(null);
    setSelectedLocalId(null);
    setSelectedAttrs({});
    setSelectedPsets({});
    setRawPsets([]);
    
    // 3. 清空已上傳模型列表 (但不呼叫 API 刪除)
    setUploadedModels([]);
    
    // 如果需要刷新列表顯示
    // await fetchR2Models(); // 登出後通常不需要 fetch，因為使用者已經不在了
  };

  const handleLogout = async () => {
    try {
      await Promise.all([
        fetch('/api/logout', { method: 'POST' }),
        signOut({ redirect: false })
      ]);
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      // deleteAllModels();
      resetViewer();
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    (window as any).handleLogout = handleLogout;
  }, [handleLogout]);

  // open the camera's hls or webrtc page aside
const showCCTVDisplay = async(elementName:string) => {
  const w = window.screen.availWidth/2;
  const h = window.screen.availHeight/2;

  const left = (window.screen.availWidth - w) / 2;
  const top = (window.screen.availHeight - h) / 2;

  const features = [
    `width=${w}`,
    `height=${h}`,
    `left=${left}`,
    `top=${top}`,
    "popup=yes",
    "noopener=yes",
    "noreferrer=yes",
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");

  if (!elementName) {
    setToast({ message: "請先選擇一個攝影機", type: "error" });
    return;
  }

  //開啟新分頁
  window.open(`/CCTV/${elementName}`, `CCTV_${elementName}`, features);

}
// fetch the object id for the routing
const handleIssueForms = async() => {
  // fetch the modelId by the app context
  console.log(selectedFragId);
  console.log(selectedDevice);

  const w = window.screen.availWidth/2;
  const h = window.screen.availHeight/2;

  // 計算置中座標：(螢幕總寬 - 視窗寬) / 2
  const left = (window.screen.availWidth - w) / 2;

  // 設定 Window Features
  // popup=yes 是現代瀏覽器的標準，能讓它看起來更像獨立視窗而非分頁
  const features = [
    `width=${w}`,
    `height=${h}`,
    `left=${left}`,
    `top=${top}`,
    "popup=yes",
    "noopener=yes",
    "noreferrer=yes",
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");

  if (!selectedFragId || !selectedDevice) {
    setToast({ message: "請先選擇一個設備", type: "error" });
    return;
  }
  // 去掉前面的model/
  const cleanFragId = selectedFragId.slice(7);
    console.log(cleanFragId);
  try{
    // 1. 因為 selectedDevice 是數字 (expressID)，我們先去後端查它的 MongoDB _id
    // 這裡調用你分析中提到的 API 雙重支持功能
    const response = await fetch(`/api/elements/${selectedDevice}`);
    const elementData = await response.json();
    
    if (elementData && elementData._id) {
      // 2. 拿到 24 碼的 MongoDB ObjectId
      const mongoId = elementData._id;
      
      const safeFragId = encodeURIComponent(cleanFragId);

      const targetUrl = `/element/${safeFragId}/${mongoId}`;
      console.log(`準備跳轉：模型=${safeFragId}, MongoID=${mongoId}`);

      //開啟新分頁
      window.open(targetUrl, "IssueForm", features);
      console.log(`已在新分頁開啟設備表單：${targetUrl}`);

    } else {
      throw new Error("找不到對應的資料庫記錄");
    }
  }catch(error){
    console.error("獲取 ObjectId 失敗:", error);
    setToast({ message: "無法讀取設備詳細資料", type: "error" });
  }
}

const outlineAllCamera = async() => {
  if (!components || !fragmentsRef.current || !selectedFloor) return;

  try {
    const response = await fetch("/api/cameras");
    let latestCameras = []; 

    if (response.ok) {
        const data = await response.json();
        latestCameras = data;
    }

    const validCameras = latestCameras.filter((cam: any) => cam.elementName && cam.elementName.trim() !== "");

    if (validCameras.length === 0) {
      setToast({ message: `資料庫中未有攝影機 ${selectedFloor}`, type: "warning" });
      return;
    }

    // 只選出該樓層的camera
    const cameraNames = validCameras
    .filter((cam: any) => {
      const camFloor = cam.elementName.split('-')[0];
      return camFloor === selectedFloor;
    })
    .map((cam:any) => cam.elementName);

    if(cameraNames.length === 0){
      setToast({ message: `${selectedFloor}未有監視器資訊`, type: "warning" });
      setIsCCTVOn(false);
      return;
    }
    console.log("目前有的camera",cameraNames);

    const response2 = await fetch('/api/elements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // 1. 將 operator 改為 "in"
        // 2. 將 value 設定為你的陣列變數
        queries: [
          { 
            id: 0, 
            attribute: "Name", 
            operator: "in", 
            value: cameraNames, 
            logic: "AND" 
          }
        ],
        modelIds: Array.from(fragmentsRef.current.list.keys()),
      }),
    });
    
    if (!response.ok) throw new Error('Search request failed');

    const foundElements = await response2.json();

    console.log("抓取到的元素",foundElements);

    if (foundElements.length > 0) {

        markerRef.current?.dispose();
        outlinerRef.current?.clean();

        for (const element of foundElements) {
          const { modelId, attributes } = element;
          const expressID = attributes._localId.value;
          const elementName = attributes.Name.value;

          const singleSelection: OBC.ModelIdMap = { [modelId]: new Set([expressID]) };
          const point = await boxerRef.current?.getCenter(singleSelection);

          if (worldRef.current && point) {
            // 建立專屬於這台相機的 Label
            const markerLabel = createMarkerElement(elementName, {
              color: "#2BC3EC",
              onClick: (name) => {
                if (name) showCCTVDisplay(name);
              }
            });
            // 在場景中建立 Marker
            markerRef.current?.create(worldRef.current, markerLabel, point);
          }
          console.log("正在為以下相機加上輪廓：", singleSelection);
          await outlinerRef.current?.addItems(singleSelection);
        }
        console.log("所有監視器標記完成");
        
      }
  }catch (error) {
      console.error("Failed to fetch cameras:", error);
  }
};

const handleLocateElementByName = useCallback(async (elementName: string) => {
    if (!components || !fragmentsRef.current) return;

    handleSwitchViewMode('floor');

    console.log("選中樓層",selectedFloor);

    try {
      const response = await fetch('/api/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [{ id: 0, attribute: "Name", operator: "equal", value: elementName, logic: "AND" }],
          modelIds: Array.from(fragmentsRef.current.list.keys()),
        }),
      });

      if (!response.ok) throw new Error('Search request failed');
      const foundElements = await response.json();

      if (foundElements.length > 0) {
        const selection: OBC.ModelIdMap = {};
        for (const element of foundElements) {
          const { modelId, attributes } = element;
          const expressID = attributes._localId.value;
          if (!selection[modelId]) selection[modelId] = new Set();
          selection[modelId].add(expressID);
        }
        console.log("選中攝影機",selection);
        console.log("選中攝影機",elementName);

        setIsMonitorOpen(false);

        markerRef.current?.dispose();
        outlinerRef.current?.dispose();

        const markerLabel = createMarkerElement(elementName,{color: "#2BC3EC", 
          onClick: (elementName) => {
              if(elementName) showCCTVDisplay(elementName);
          }}
        );

        await outlinerRef.current?.addItems(selection);

        const point = await boxerRef.current?.getCenter(selection);
        
        if(worldRef.current && point) markerRef.current?.create(worldRef.current,markerLabel,point);
        
        console.log("已經加outline在",selection);




        // const highlighter = components.get(OBCF.Highlighter);
        // await highlighter.clear();
        if (cameraRef.current) {
          await cameraRef.current.fitToItems(selection);
        }
        // await highlighter.highlightByID("select", selection, true, true);
        
        

        setToast({ message: t("locate_success", { name: elementName }), type: "success" });
      } else {
        setToast({ message: t("no_elements_found"), type: "error" });
      }
    } catch (error) {
      console.error("Locate failed:", error);
      setToast({ message: t("search_failed"), type: "error" });
    }
  }, [components, t, setToast]);

  return (
    <div className="flex w-full h-dvh overflow-hidden relative">
      <div className={`absolute z-20 h-dvh ${isSidebarVisible ? '' : 'hidden'}`}>
      </div>
          <GlobalLoader
            isLoadings={isGlobalLoading}
            message={loadingMessage}
            darkMode={darkMode}
          />
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      <div className="relative flex-grow flex transition-all duration-300 min-w-0 overflow-hidden">
        <div className="relative flex-grow min-w-0 h-full overflow-hidden">
            {/* <IFCViewerUI
              darkMode={darkMode}
              viewerRef={viewerRef}
              uploadedModels={uploadedModels}
              viewMode={viewMode}
            /> */}
            {/* Device頁面 */}
            <div className={viewMode === 'device' ? " absolute max-w-[81dvw] h-[84.5dvh] top-25 bottom-10 left-88 right-4 flex gap-2 z-30": "absolute w-full h-full "}>
              {/* 左側 */}
              <div className={viewMode === 'device' ? `h-full flex flex-col gap-2 ${selectedDeviceName ? "w-1/2" : "w-full"}`:""}>
                {/* 左一 */}
                <div className={`w-full min-h-[30px] ${selectedDeviceName? "h-1/3 overflow-auto" : "h-1/15"} flex flex-col gap-2 ${viewMode === 'device' ? "":"hidden"}`}>
                  <div className="hud-panel w-full h-full pl-4 flex justify-between items-center ">
                    <p className="font-bold text-white text-lg tracking-wider">
                      {selectedDeviceName ? `${selectedDeviceName} 設備基本資訊` : "請選擇一個設備"} </p>
                    <ChevronRight size={20} className="text-gray-500 hover:cursor-pointer"/>
                  </div>
                  {/* 左一下 */}
                  <div className={selectedDeviceName ? "flex gap-2 w-full flex-1" : "hidden"}>
                    {/* 效率流量 */}
                    <div className="w-2/9 h-full flex flex-col gap-2">
                      <div className="hud-panel relative 2xl:p-4  flex flex-col items-center justify-center w-full h-1/2">
                        <p className="text-md 2xl:text-xl text-white font-semibold absolute top-2 left-3">效率</p>
                        <p className="text-xl 2xl:text-2xl text-white font-mono mt-[30%]">13.75 <span className="text-sm text-gray-300">kW/RT</span></p>
                      </div>
                      <div className="hud-panel relative 2xl:p-4  flex flex-col items-center justify-center w-full h-1/2">
                        <p className="text-md 2xl:text-xl text-white font-semibold absolute top-2 left-3">流量</p>
                        <p className="text-xl 2xl:text-2xl text-white font-mono mt-4">15 <span className="text-sm text-gray-300">CMH</span></p>
                      </div>
                    </div>
                    {/* 碳排 */}
                    <div className="hud-panel p-2 2xl:p-4 flex flex-col items-center w-2/9 h-full ">
                      <div className="flex max-[1281px]:flex-col  w-full h-2/10">
                        <div className="text-md font-semibold text-white w-full ">
                          碳排放量
                        </div>
                        <span className=" text-sm ml-1 text-gray-300">(KgCo2)</span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-2 h-8/10">
                        <p className="text-3xl max-[1281px]:text-xl text-white font-mono font-bold">12,747</p>
                        <p className="text-gray-300 text-sm">本月累積</p>
                      </div>
                    </div>
                    {/* 其他用電 */}
                    <div className="hud-panel flex flex-col gap-2 p-2 2xl:p-4 w-5/9 h-full">
                      <div className="text-md font-semibold text-white border-b border-gray-600/50 flex items-center">
                        其他用電</div>
                      <div className="flex-1 grid grid-cols-3 gap-y-4 max-[1281px]:gap-y-2 gap-x-2 content-center">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xl text-white font-mono">0.5</p>
                          <p className="text-xs text-gray-300">功率因數</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xl text-white font-mono">20 <span className="text-xs">kW</span></p>
                          <p className="text-xs text-gray-300">有功功率</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xl text-white font-mono">1.1 <span className="text-xs">kVAR</span></p>
                          <p className="text-xs text-gray-300">無功功率</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xl text-white font-mono">1.3 <span className="text-xs">kVA</span></p>
                          <p className="text-xs text-gray-300">視在功率</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xl text-white font-mono">15 <span className="text-xs">Hz</span></p>
                          <p className="text-xs text-gray-300">頻率</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xl text-white font-mono">12820 <span className="text-xs">kWh</span></p>
                          <p className="text-xs text-gray-300">總有功功率</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 左二 3D viewer */}
                <div ref={viewerRef} className={viewMode === 'device' ? ` w-full hud-panel ${selectedDeviceName ? " h-1/3 overflow-hidden":"h-14/15"} ` : "absolute top-0 w-dhw h-dvh"}/>
                {/* 左三 */}
                <div className={viewMode === 'device' ? `w-full h-1/3 flex gap-2 ${selectedDeviceName ? "" : "hidden"}`:"hidden"}>
                  <div className="hud-panel p-4 flex flex-col w-full h-full">
                    <div className="text-white text-medium 2xl:text-xl font-medium border-b border-gray-600/50">環境溫度</div>
                    <div className="flex-1 content-center">
                      <div className="text-2xl 2xl:text-4xl text-white text-center">23<span className="text-gray-300 text-[20px]">°C</span></div>
                    </div>
                    
                  </div>
                  <div className="hud-panel p-4  w-full h-full">
                    <div className="text-white text-medium 2xl:text-xl font-medium mb-2 border-b border-gray-600/50">線電壓</div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300 mb-1"><span>線電壓1:</span> <span className="self-end">300 V</span></div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300 mb-1"><span>線電壓2:</span> <span className="self-end">310 V</span></div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300"><span>線電壓3:</span> <span className="self-end">320 V</span></div>
                  </div>
                  <div className="hud-panel p-4  w-full h-full">
                    <div className="text-white text-medium 2xl:text-xl font-medium mb-2 border-b border-gray-600/50">電流</div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300 mb-1"><span>電流1</span> <span className="bg-orange-500 self-end text-black px-1 rounded">25 A</span></div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300 mb-1"><span>電流2</span> <span className="self-end">42.0 A</span></div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300"><span>電流3</span> <span className="self-end">51.9 A</span></div>
                  </div>
                  <div className="hud-panel p-4  w-full h-full">
                    <div className="text-white text-medium 2xl:text-xl font-medium mb-2 border-b border-gray-600/50">溫度</div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300 mb-1"><span>出水溫度</span> <span className="self-end">23.6°C</span></div>
                    <div className="flex max-[1281px]:flex-col items-start  2xl:justify-between text-xs text-gray-300"><span>入水溫度</span> <span className="self-end">54.6°C</span></div>
                  </div>
                </div>
              </div>
              {/* 右側 */}
              <div className={` ${viewMode === 'device' ? `${selectedDeviceName ? "w-1/2 h-full flex flex-col gap-2": "hidden"}`:"hidden"} `}>
                {/* 右一 :能耗狀況 & 運行狀況 */}
                <div className="w-full h-1/3 overflow-hidden flex gap-2">
                  {/* 能耗狀況 (電池圖) */}
                  <div className="hud-panel w-1/2 h-full flex flex-col items-center px-4 pt-4 pb-2 gap-2">
                    <p className="w-full text-left text-white font-semibold ">能耗狀況</p>
                    <div className="mt-8 h-[60%]">
                      <div className=" relative w-16 h-full border-2 border-green-500 rounded-lg p-1 flex flex-col-reverse items-center gap-1 shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                          {/* 電池頭 */}
                          <div className="absolute -top-3 w-8 h-2 bg-green-500 rounded-t-sm"></div>
                          <span className="absolute -top-10 text-green-400 font-bold text-xl">C4</span>
                          {/* 電量條 */}
                          <div className="w-full h-75/100 bg-gradient-to-t from-green-600 to-green-400 rounded-sm animate-pulse"></div>
                      </div>
                    </div>
                    <p className=" text-white text-sm ">能耗指數</p>
                  </div>
                  <div className="hud-panel w-full h-full flex flex-col items-center relative overflow-hidden p-4">
                    <p className="w-full text-left text-white font-semibold mb-2">運行狀況</p>
                    {/* 液態狀態球 */}
                    <LiquidFillGauge percent={50} size={200}/>
                  </div>
                </div>
                {/* 右二：耗電量 (Bar Chart) */}
                <div className="hud-panel w-full h-1/3 p-4 flex flex-col">
                  <p className="text-white font-semibold mb-2">耗電量 <span className="text-xs text-white">(kWh)</span></p>
                  <div className="flex-1 w-full min-h-0">
                    {viewMode === 'device' && 
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={powerData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                          <XAxis dataKey="time" stroke="white" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="white" fontSize={10} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #444', borderRadius: '4px' }}
                              itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="val" fill="url(#colorGradient)" radius={[2, 2, 0, 0]}>
                        
                          </Bar>
                          <defs>
                              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2BC3EC" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#2BC3EC" stopOpacity={0.2}/>
                              </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>}
                  </div>
                </div>
                {/* 右三：環境溫度 & 溫度 (Line Charts)*/}
                <div className="w-full h-1/3 flex gap-2">
                  {/* 環境溫度 */}
                  <div className="hud-panel w-full h-full p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-white font-semibold">環境溫度</p>
                        <div className="flex items-center gap-1"><span className="w-4 h-2 bg-[#00a8ff]"></span><span className="text-[12px] text-white">環境溫度</span></div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        {viewMode === 'device' && 
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart 
                                data={tempData1}
                                margin={{ top: 10, right: 20, left: -20, bottom: 0 }} // 將 left 設為負值
                              >
                                  <defs>
                                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#00a8ff" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#00a8ff" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <XAxis dataKey="time" stroke="white" fontSize={9} axisLine={false} tickLine={false} />
                                  <YAxis stroke="white" fontSize={9} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                                  <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: 'none' }} itemStyle={{fontSize:'12px'}}/>
                                  <Area type="monotone" dataKey="val" stroke="#00a8ff" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                              </AreaChart>
                          </ResponsiveContainer>}
                    </div>
                  </div>
                  {/* 溫度 (多線) */}
                  <div className="hud-panel w-full h-full p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-white font-semibold">溫度</p>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <span className="w-4 h-2 bg-green-400 "></span>
                              <span className="text-[12px] text-white">出水溫度</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-4 h-2 bg-yellow-500 "></span>
                              <span className="text-[12px] text-white">入水溫度</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        {viewMode === 'device' && 
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart 
                                data={tempData2}
                                margin={{ top: 10, right: 20, left: -20, bottom: 0 }} // 將 left 設為負值
                                >
                                
                                <defs>
                            
                                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                  </linearGradient>
                
                                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis 
                                  dataKey="time" 
                                  stroke="white" 
                                  fontSize={9} 
                                  tickLine={false} 
                                  axisLine={false} 
                                />
                                <YAxis 
                                  stroke="white" 
                                  fontSize={9} 
                                  tickLine={false} 
                                  axisLine={false} 
                                />
                                <RechartsTooltip 
                                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '4px' }} 
                                  itemStyle={{ fontSize: '12px' }} 
                                />

                                <Area
                                  type="monotone"
                                  dataKey="out"
                                  stroke="#4ade80"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorOut)"
                                />
        
                                <Area
                                  type="monotone"
                                  dataKey="in"
                                  stroke="#eab308"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorIn)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          {showDescriptionPanel && (
            <div className="absolute bottom-4 right-4 w-80 z-20">
              <DescriptionPanel darkMode={darkMode} activeTool={activeTool} />
            </div>
          )}
          <div className=" absolute inset-0 max-w-full max-h-full overflow-hidden pointer-events-none [&>*]:pointer-events-auto z-40">
              {/* {componentsRef.current && fragmentsRef.current && worldRef.current && (
                <ViewOrientation
                  components={componentsRef.current}
                  fragments={fragmentsRef.current}
                  world={worldRef.current}
                />
              )} */}
              <div className="hidden absolute z-20 left-1/2 -translate-x-[269px] w-28.1/100 h-1/12 bottom-5">
                <ActionButtons
                  components={components}
                  darkMode={darkMode} 
                  onToggleVisibility={onToggleVisibility}
                  onIsolate={onIsolate}
                  onFocus={onFocus}
                  onShow={onShow}
                  onGhost={handleGhost}
                  isGhost={isGhost}
                  onToggleShadowScene={handleToggleShadowSceneAndOpenSettings}
                  isShadowed={isShadowed}
                  onToggleColorShadows={handleToggleColorShadows}
                  isColorShadowsEnabled={isColorShadowsEnabled}
                  activeTool={activeTool}
                  onSelectTool={(tool) => {
                    const newTool = activeTool === tool ? null : tool;
                    setActiveTool(newTool);

                    if (newTool !== null) {
                      setShowDescriptionPanel(true);
                      setTimeout(() => {
                        setShowDescriptionPanel(false);
                      }, 3000);
                    } else {
                      setShowDescriptionPanel(false);
                    }
                  }}
                  lengthMode={lengthMode}
                  setLengthMode={setLengthMode}
                  areaMode={areaMode}
                  setAreaMode={setAreaMode}
                  onColorize={handleColorize}
                  onClearColor={handleClearColor}
                  // onToggleInfo={handleToggleInfo}
                  // isInfoOpen={isInfoOpen}
                  onToggleMultiSelect={() => {
                    setActiveTool(prev => {
                      const newTool = prev === "multi-select" ? null : "multi-select";
                      setShowDescriptionPanel(newTool === "multi-select");
                      return newTool;
                    });
                  }}
                  isMultiSelectActive={activeTool === "multi-select"}
                />
              </div>
              <LoadingModal darkMode={darkMode} progress={progress} show={showProgressModal} />
          </div>
          
          {isUserManagementPanelOpen && user?.role === 'admin' && (
            <div className={`fixed top-0 left-[72px] h-full w-[calc(100%-64px)] z-45 transform transition-transform duration-300 ${isUserManagementPanelOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'} p-4`}>
              <UserManagementPanel darkMode={darkMode} onClose={handleToggleUserManagementPanel} />
            </div>
          )}
          {showR2HistoryPanel && (
            <div className={`fixed top-0 left-[392px] h-full w-[calc(100%-392px)] z-45 transform transition-transform duration-300 ${showR2HistoryPanel ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'} p-4`}>
              <R2ModelHistoryPanel
                darkMode={darkMode}
                onClose={() => setShowR2HistoryPanel(false)}
                onDeleteModel={async (modelIdToDelete: string) => {
                  const modelToDelete = uploadedModels.find(model => model._id === modelIdToDelete);
                  if (modelToDelete) {
                    await deleteSelectedModel(modelToDelete);
                  } else {
                    console.error(`Model with _id ${modelIdToDelete} not found.`);
                  }
                }}
                onPreviewModel={async (model: R2Model) => {
                  setSelectedItemForPreview(model);
                  setShowPreviewModal(true);
                }}
                onAssignModelToGroup={handleAssignModelToGroup}
                currentModelGroupId={currentModelGroupId}
                refreshTrigger={r2HistoryRefreshCounter}
              />
            </div>
          )}

          {showPreviewModal && selectedItemForPreview && (
            <R2ModelPreviewModal
              darkMode={darkMode}
              onClose={() => setShowPreviewModal(false)}
              model={selectedItemForPreview}
            />
          )}

          {!isUserManagementPanelOpen && !showDescriptionPanel && !showR2HistoryPanel && (
            <>
              {/* 最頂部數據欄 (保持不變) */}
              <TopsideDataPanel darkMode={darkMode} onFocus={onFocus} />

              {/* 模式切換側邊欄 (位於左側最邊緣) */}
              {/* 這裡佔據 left-0 到 left-20 之間的空間，作為模式切換器 */}
              <div className={`${isSidebarVisible ? "w-fit h-fit" : "hidden" }  transform -skew-x-[-40deg] absolute -translate-x-1/2 left-[calc(50%-345px)] top-[22px] z-30 gap-1 flex backdrop-blur-md ${
                darkMode ? "bg-transparent backdrop-blur-2xl border-gray-700" : "bg-white/80 border-gray-200"
              }`}>
                {/* Global 按鈕 */}
                <Tooltip content="全景模式 (Global)" placement="bottom">
                  <button
                    onClick={() => handleSwitchViewMode('global')}
                    className={`p-3 transition-all duration-200 ${
                      viewMode === 'global'
                        ? "bg-[#2EC2EA] text-white scale-110"
                        : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }`}
                  >
                    <Globe size={30} className="transform -skew-x-[40deg]"/>
                  </button>
                </Tooltip> 
                {/* AllFloors 按鈕 */}
                <Tooltip content="分層模式 (All Floors)" placement="bottom">
                  <button
                    onClick={() => handleSwitchViewMode('allfloors')}
                    className={`p-3  transition-all duration-200  ${
                      viewMode === 'allfloors'
                        ? "bg-[#2EC2EA] text-white scale-110"
                        : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }`}
                  >
                    <Layers size={30} className="transform -skew-x-[40deg]"/>
                  </button>
                </Tooltip>

                {/* Floor 按鈕 */}
                <Tooltip content="單層模式 (Floor)" placement="bottom">
                  <button
                    onClick={() => handleSwitchViewMode('floor')}
                    className={`p-3  transition-all duration-200  ${
                      (viewMode === 'floor' || viewMode === 'device')
                        ? "bg-[#2EC2EA] text-white scale-110"
                        : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }`}
                  >
                    <Layers2 size={30} className="transform -skew-x-[40deg]"/>
                  </button>
                </Tooltip>
                
                {/* warning 按鈕 */}
                <Tooltip content="歷史警告表單(Warnings)" placement="bottom">
                  <button
                    onClick={() => setShowWarningModal(!showWarningModal)}
                    className={`p-3  transition-all duration-200  ${
                      showWarningModal
                        ?"bg-[#2EC2EA] text-white scale-110 shadow-[0_0_15px_rgba(46,194,234,0.6)]" // 開啟時發亮
                        :"text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100" 
                    }`}
                  >
                    <TriangleAlert size={30} className="transform -skew-x-[40deg]"/>
                  </button>
                </Tooltip>
              </div>
              {/* 標題下按鈕 */}
              <div className={`${(viewMode === 'floor' || viewMode === 'device')? "absolute ":"hidden"} -translate-x-1/2 left-1/2 top-[50px] z-30 gap-0 flex ${
                darkMode ? "bg-transparent " : "bg-white/80 border-gray-200"}`}> 
                  {/* Device按鈕 */}
                  <Tooltip content={`設備模式 (Device)`} placement="bottom">
                    <Switch
                      isSelected={viewMode === "device"}
                      onValueChange={(isSelected)=>{
                        if (isSelected) {
                          handleSwitchViewMode("device");
                        } else {
                          handleSwitchViewMode("floor");
                        }
                      }}  
                      color="success"
                      size="sm"
                      classNames={{
                        wrapper: `bg-transparent border border-gray-500 `,
                        thumb: `bg-white`,
                      }}
                      className={`px-2 border-l-1 border-r-1 border-[#2EC2EA]`}
                    >
                      <Box size={20} className={`${viewMode === "device" ? "text-white" : "text-gray-500"}`}/>
                    </Switch>
                  </Tooltip>
                  {/* hvac按鈕 */}
                  <Tooltip content={selectedFloor ? "顯示暖通空調 (HVAC)" : `請先選擇一個樓層`} placement="bottom">
                    <button
                      onClick={() => {
                        if(viewMode === 'floor' && selectedFloor){
                          if(isHVACOn){
                            setIsHVACOn(false);
                          }else{
                            setIsHVACOn(true);
                          }
                        }else{
                          if(viewMode === 'floor'){
                            setToast({ message: `請先選擇一個樓層`, type: "error" });
                          }else{
                            setToast({ message: `請切換到單層模式並選擇樓層`, type: "error" });
                          }
                        }
                      }}
                      className={`px-9  py-1 transition-all duration-200 border-r-1 border-[#2EC2EA] ${
                          isHVACOn
                          ? "bg-[#2EC2EA] text-white scale-110"
                          : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                      }`}
                    >
                      <AirVent size={20} className=""/>
                    </button>
                  </Tooltip>
                  {/* cctv按鈕 */}
                  <Tooltip content={selectedFloor ? "顯示監控 (CCTV)" : `請先選擇一個樓層`} placement="bottom">
                    <button
                      onClick={async() => {
                        if(viewMode === 'floor' && selectedFloor){
                          if(isCCTVOn){
                            setIsCCTVOn(false);
                            outlinerRef.current?.dispose();
                            markerRef.current?.dispose();
                          }else{
                            setIsCameraLoading(true);
                            setIsCCTVOn(true);
                            await outlineAllCamera();
                            setIsCameraLoading(false);
                          }
                          // setIsMonitorOpen(true);
                        }else{
                          if(viewMode === 'floor'){
                            setToast({ message: `請先選擇一個樓層`, type: "error" });
                          }else{
                            setToast({ message: `請切換到單層模式並選擇樓層`, type: "error" });
                          }
                        }
                      }}
                      className={`${isCameraLoading ? "opacity-50 cursor-wait px-9 py-1":`
                        px-9 py-1 transition-all duration-200 border-r-1 border-[#2EC2EA] ${
                        isCCTVOn
                          ? "bg-[#2EC2EA] text-white scale-110"
                          : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"}`
                      }`}
                    >
                      <Cctv size={20} className=""/>
                    </button>
                  </Tooltip>
                  {/* 門禁按鈕 */}
                  <Tooltip content={selectedFloor ? "顯示門禁 (EAC)" : "請先選擇一個樓層"} placement="bottom">
                    <button
                      onClick={() => {
                        if(viewMode === 'floor' && selectedFloor){
                          if(isEACOn){
                            setIsEACOn(false);
                          }else{
                            setIsEACOn(true);
                          }
                        }else{
                          if(viewMode === 'floor'){
                            setToast({ message: `請先選擇一個樓層`, type: "error" });
                          }else{
                            setToast({ message: `請切換到單層模式並選擇樓層`, type: "error" });
                          }
                        }
                      }}
                      className={`px-9 py-1 transition-all duration-200 border-r-1 border-[#2EC2EA] ${
                        isEACOn
                          ? "bg-[#2EC2EA] text-white scale-110"
                          : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                      }`}
                    >
                      <DoorClosedLocked size={20} className=""/>
                    </button>
                  </Tooltip>
                  {/* issue forms
                  <Tooltip content="報修表單(Issue Forms)" placement="bottom">
                  <button
                    onClick={() => {
                      handleIssueForms();
                    }}
                    className={`p-3  transition-all duration-200  ${
                      viewMode === 'issueforms'
                        ? "bg-[#2EC2EA] text-white scale-110"
                        : "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }`}
                  >
                    <BookAlert size={30} className="transform -skew-x-[-40deg]"/>
                  </button>
                </Tooltip> */}
              </div>
              {/* 標題右側按鈕 */}
              <div className={`${isSidebarVisible ? "w-fit h-fit" : "hidden" }  transform -skew-x-[40deg] absolute -translate-x-1/2 left-[calc(50%+260px)] top-[22px] z-30 gap-1 flex backdrop-blur-md ${
                darkMode ? "bg-transparent backdrop-blur-2xl border-gray-700" : "bg-white/80 border-gray-200"
              }`}>
                <Tooltip content="聚焦(Focus)" placement="bottom">
                  <button
                    onClick={() =>{
                      if(viewMode === 'global' || viewMode === 'allfloors'){
                        onFocus('isometric');
                      }else if(viewMode === 'floor'){
                        onFocus('top-down')
                      }else{
                        onFocus('tight-fit');
                      }
                    }
                  }
                    className={`p-3 transition-all duration-200 "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"`}
                  >
                    <Focus size={30} className="transform -skew-x-[-40deg]"/>
                  </button>
                </Tooltip>
              </div>
              {/* === Global 模式面板 === */}
              {viewMode === 'global' && (
                <>
                  <LeftsideDataPanel darkMode={darkMode} />
                  <RightsideDataPanel darkMode={darkMode} />
                </>
              )}
              {/* All floors模式面板 */}
              {viewMode === 'allfloors' && components && (
                <>
                  <RightSideDataPanelForAllFloor
                      floor={selectedFloor}
                      loadedModelIds={Array.from(fragmentsRef.current?.list.keys() || [])}
                      components={components}
                      darkMode={darkMode}
                    />
                </>
              )}
              {/* === Floor and device 模式面板 === */}
              {(viewMode === 'floor' || viewMode === 'device') && components && (
                <>
                  {/* 左側：FloorModePanel (注意 left-24 是為了避開剛剛新增的按鈕條) */}
                  <div className={`absolute hud-panel left-4 top-25 bottom-10  w-80 z-10 `}> 
                    <div className={`h-full w-full overflow-hidden }`}>
                      <FloorModePanel
                        components={components}
                        outlinerRef={outlinerRef}
                        markerRef={markerRef}
                        darkMode={darkMode}
                        handleSwitchViewMode={handleSwitchViewMode}
                        onFocus={onFocus}
                        loadedModelIds={Array.from(fragmentsRef.current?.list.keys() || [])}
                        cameraRef={cameraRef}
                        fragmentsRef={fragmentsRef}
                        highlighterRef={highlighterRef}
                      />
                    </div>
                  </div>
                  { viewMode === 'floor' &&
                    <RightSideDataPanelForFloor
                      floor={selectedFloor}
                      darkMode={darkMode}
                      onLocate={handleLocateElementByName}
                    />
                  }
                </>
              )}
            </>
          )}

          {/* 歷史告警彈出視窗 (Overlay) */}
          {showWarningModal && (
            <WarningHistoryModal componentsRef={componentsRef} onClose={()=> setShowWarningModal(false)}/>
          )}
          {isMonitorOpen && (
            <div className={`fixed top-0 left-[72px] h-full w-[calc(100%-72px)] z-45 transform transition-transform duration-300 ${isMonitorOpen ? 'translate-x-0' : '-translate-x-full'} bg-black`}>
              <CameraViewerPanel
                onClose={() => setIsMonitorOpen(false)}
                onLocate={handleLocateElementByName}
              />
            </div>
          )}
          {/* {isLinkedCameraPanelOpen && (
            <div className="fixed top-0 right-0 h-full w-1/2 z-45 bg-black border-l border-zinc-800">
              <LinkedCameraPanel
                cameras={linkedCameras}
                onClose={() => setIsLinkedCameraPanelOpen(false)}
                onLocate={handleLocateElementByName}
                darkMode={darkMode}
              />
            </div>
          )} */}
          {showUploadStatus && (
            <div className="absolute top-2 left-2 bg-gray-800 p-4 rounded-lg shadow-lg w-80 z-20 draggable">
              <h3 className="text-white text-center mb-2">Upload Progress</h3>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              {uploadStatus && (
                <div className="text-center mt-2 text-white">
                  <p>{uploadStatus}</p>
                  {uploadTime && <p>Upload complete in {uploadTime}s</p>}
                  <div className="flex justify-center space-x-4 mt-2">
                    <button onClick={() => {
                      if (workerRef.current) {
                        workerRef.current.postMessage({ type: isUploadPaused ? 'resume' : 'pause' });
                      }
                      setUploadStatus(isUploadPaused ? 'Uploading...' : 'Paused');
                      setIsUploadPaused(!isUploadPaused);
                    }} className="text-yellow-400 hover:text-yellow-300">
                      {isUploadPaused ? <Play size={20} /> : <Pause size={20} />}
                    </button>
                    {uploadStatus === 'Success' && (
                      <button
                        onClick={() => {
                          const lastModel = uploadedModels[uploadedModels.length - 1];
                          if (lastModel?.name) {
                            handleDownloadFromDB(lastModel.name);
                          } else {
                            setToast({ message: "Could not find the name of the last uploaded model.", type: "error" });
                          }
                        }}
                        className="text-green-400 hover:text-green-300"
                        title="Download"
                      >
                        <Download size={20} />
                      </button>
                    )}
                    <button onClick={() => setShowUploadStatus(false)} className="text-sm text-blue-400 hover:underline">Clear</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {showDownloadProgress && (
            <div className="absolute top-32 left-2 bg-gray-800 p-4 rounded-lg shadow-lg w-80 z-20 draggable">
              <h3 className="text-white text-center mb-2">Download Progress</h3>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${downloadProgress}%` }}></div>
              </div>
              {downloadStatus && (
                <div className="text-center mt-2 text-white">
                  <p>{downloadStatus}</p>
                  <button onClick={() => setShowDownloadProgress(false)} className="text-sm text-blue-400 hover:underline mt-2">Clear</button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* <div className={`absolute right-0 top-0 flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isInfoOpen ? 'w-80' : 'w-0'} ${darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'}`}>
          <div className="w-80 h-full p-4 overflow-hidden">
            {components && (
              <IFCInfoPanel
                components={components}
                darkMode={darkMode}
                infoLoading={infoLoading}
                modelId={selectedModelId}
                localId={selectedLocalId}
                attrs={selectedAttrs}
                psets={selectedPsets}
                rawPsets={rawPsets}
                onClose={handleToggleInfo}
                qrCodeData={qrCodeData}
                isMultiSelectActive={activeTool === "multi-select"}
              />
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
}
