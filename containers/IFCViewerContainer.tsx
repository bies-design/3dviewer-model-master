"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { PerspectiveCamera, OrthographicCamera, Vector2, Object3D, Mesh, Color, Vector3, BufferGeometry, BufferAttribute, MeshLambertMaterial, DoubleSide, EquirectangularReflectionMapping } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import IFCViewerUI from "@/components/IFCViewer/ViewerUI";
import IFCInfoPanel from "@/components/IFCViewer/InfoPanel";
import ModelManager from "@/components/IFCViewer/ModelManager";
import LoadingModal from "@/components/IFCViewer/LoadingModal";
import ActionButtons from "@/components/IFCViewer/ActionButtons";
import R2ModelHistoryPanel from "@/components/IFCViewer/R2ModelHistoryPanel";
import { R2Model } from "@/components/IFCViewer/R2ModelHistoryPanel";
import CameraControls from "@/components/IFCViewer/CameraControls";
import Viewpoints from "@/components/IFCViewer/Viewpoints";
import ViewOrientation from "@/components/IFCViewer/ViewOrientation";
import BCFTopics from "@/components/IFCViewer/BCFTopics";
import CollisionDetector from "@/components/IFCViewer/CollisionDetector";
import HomePanel, { HomePanelRef } from "@/components/IFCViewer/HomePanel";
import SearchPanel from "@/components/IFCViewer/SearchPanel";
import SideBar from "@/components/IFCViewer/SideBar";
import SideBarTab from "@/components/IFCViewer/SideBarTab";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import Link from "next/link";
import { LogIn, LogOut, User as UserIcon, Pause, Play, Download } from "lucide-react";
import { Tooltip } from "@heroui/react";
import DescriptionPanel from "@/components/IFCViewer/DescriptionPanel";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import ProjectsPanel from "@/components/IFCViewer/ProjectsPanel";
import AIPanel from "@/components/IFCViewer/AIPanel";
import { useAppContext } from "@/contexts/AppContext";
import DataPanel from "@/components/IFCViewer/DataPanel";
import FloorPlan from "@/components/IFCViewer/FloorPlan";
import AssetsPanel from "@/components/IFCViewer/AssetsPanel";
import ShadowScenePanel from "@/components/IFCViewer/ShadowScenePanel";
import PreferenceSettings from "@/components/IFCViewer/PreferenceSettings";
import UserPanel from "@/components/IFCViewer/UserPanel";
import UserManagementPanel from "@/components/IFCViewer/UserManagementPanel";
import UploadLinkDataPanel from "@/components/IFCViewer/UploadLinkDataPanel";
import { signOut } from "next-auth/react";
import Image from "next/image";
import R2ModelPreviewModal from "@/components/IFCViewer/R2ModelPreviewModal";

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
  const {
    darkMode, toggleTheme, uploadedModels, setUploadedModels, viewerApi, selectedModelUrl, isLoggedIn, setIsLoggedIn, user, setUser,
    uploadProgress, uploadTime, uploadStatus, showUploadStatus, setShowUploadStatus, setUploadStatus,
    isUploadPaused, setIsUploadPaused,
    downloadProgress, setDownloadProgress, downloadStatus, setDownloadStatus, showDownloadProgress, setShowDownloadProgress,
    showProgressModal, setShowProgressModal, progress, setProgress, setToast
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
  const colorizeRef = useRef<{ enabled: boolean }>({ enabled: false });
  const coloredElements = useRef<Record<string, Set<number>>>({});
  const searchElementRef = useRef<HomePanelRef>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isUserManagementPanelOpen, setIsUserManagementPanelOpen] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedLocalId, setSelectedLocalId] = useState<number | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<ItemProps>({}); // Changed to empty object
  const [selectedPsets, setSelectedPsets] = useState<PsetDict>({}); // Changed to empty object
  const [rawPsets, setRawPsets] = useState<any[]>([]);
  const [projection, setProjection] = useState<"Perspective" | "Orthographic">("Perspective");
  const [navigation, setNavigation] = useState<"Orbit" | "FirstPerson" | "Plan">("Orbit");
  const [isGhost, setIsGhost] = useState(false);
  const [isShadowed, setIsShadowed] = useState(false);
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
  const [showVisitors, setShowVisitors] = useState(true);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [selectedColor, setSelectedColor] = useState<string>("#ffa500");
  const selectedColorRef = useRef(selectedColor);

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
          updated[existingModelIndex] = { ...updated[existingModelIndex], id: modelId, data: arrayBuffer };
          return updated;
        }
        return [...prev, { id: modelId, name: r2FileName, type: "frag", data: arrayBuffer, r2FileName }];
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

      await loadCategoriesFromAllModels();

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
      }, 3000);

    } catch (error) {
      console.error('Failed to download file:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setDownloadStatus(`Failed: ${message}`);
      setToast({ message: `Failed to download file. ${message}`, type: "error" });
    }
  };

  const handleToggleInfo = () => {
    setIsInfoOpen((prev) => !prev);
    setIsUserManagementPanelOpen(false); // Close UserManagementPanel when Info panel is opened/closed
    setShowR2HistoryPanel(false); // Close R2 history panel when Info panel is opened/closed
    // Close QR Code panel when Info panel is opened/closed
  };
 
  const handleToggleUserManagementPanel = () => {
    setIsUserManagementPanelOpen((prev) => !prev);
    setIsInfoOpen(false); // Close InfoPanel when UserManagementPanel is opened/closed
    setShowR2HistoryPanel(false); // Close R2 history panel when UserManagementPanel is opened/closed
  };
 
  const handleOpenR2History = () => {
    setShowR2HistoryPanel(prev => !prev); // Toggle the state
    setIsInfoOpen(false); // Close info panel when R2 history panel is opened
    setIsUserManagementPanelOpen(false); // Close user management panel when R2 history panel is opened
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
      // Automatically open HomePanel and set active tab to Home after login
      setIsSidebarOpen(true);
      setActiveSidebarTab("Home");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Trigger selectAll and loadSelectedModels when HomePanel is opened, but only once
    if (isLoggedIn && isSidebarOpen && activeSidebarTab === "Home" && searchElementRef.current && !hasAutoLoadedModels) {
      // Ensure the HomePanel is fully rendered and its ref is available
      const timer = setTimeout(async () => {
        if (searchElementRef.current) {
          const selectedModels = await searchElementRef.current.handleSelectAllModels(); // Wait for selectAll to complete and get selected models
          await searchElementRef.current.handleLoadSelectedR2Models(selectedModels); // Pass selected models
          setHasAutoLoadedModels(true); // Mark as loaded
        }
      }, 500); // A small delay to ensure rendering and model availability
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, isSidebarOpen, activeSidebarTab, searchElementRef.current, hasAutoLoadedModels]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (mainDisplayGroupId) {
        localStorage.setItem('mainDisplayGroupId', mainDisplayGroupId);
      } else {
        localStorage.removeItem('mainDisplayGroupId');
      }
    }
  }, [mainDisplayGroupId]);

  useEffect(() => {
    // Resize the viewer after the sidebar transition is complete
    setTimeout(() => {
      if (worldRef.current?.renderer && cameraRef.current) {
        worldRef.current.renderer.resize();
        cameraRef.current.updateAspect();
      }
    }, 300);
  }, [isSidebarOpen]);

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
      await camera.controls.setLookAt(3, 3, 3, 0, 0, 0);
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
        wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
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
        if (worldRef.current?.camera) {
          worldRef.current.camera.fitToItems();
        }
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
      highlighter.zoomToSelection = true;
      highlighterRef.current = highlighter;

      highlighter.events.select.onHighlight.add(async (selection) => {
        console.log('Highlight selection (IDs only):', selection);

        // --- Start: Log detailed properties on click ---
        for (const fragmentId in selection) {
          const model = fragmentsRef.current?.list.get(fragmentId);
          if (!model) continue;
          const ids = Array.from(selection[fragmentId]);
          const properties = await model.getItemsData(ids, {
            attributesDefault: true,
            relations: { IsDefinedBy: { attributes: true, relations: true } },
          });
          console.log(`Detailed properties for ${ids.length} element(s) in model ${fragmentId}:`, properties);
        }
        // --- End: Log detailed properties on click ---

        if (activeToolRef.current === "colorize") {
          const highlighter = highlighterRef.current;
          if (!highlighter) return;
          const color = selectedColorRef.current;
          const styleID = `colorize-${color}`;
          if (!highlighter.styles.has(styleID)) {
            highlighter.styles.set(styleID, {
              color: new Color(color),
              opacity: 1,
              transparent: false,
              renderedFaces: FRAGS.RenderedFaces.ONE,
            });
          }
          await highlighter.highlightByID(styleID, selection, false);
          await highlighter.clear("select");
          return;
        }

        if (!Object.keys(selection).length) {
          if (!isAddingToGroupRef.current) {
            setIsInfoOpen(false);
            setSelectedModelId(null);
            setSelectedLocalId(null);
            setSelectedAttrs({}); // Clear attrs to empty object
            setSelectedPsets({}); // Clear psets to empty object
            setRawPsets([]);
          }
          setQrCodeData([]); // Clear QR code data
          return;
        }

        const selectedElementsData: { modelId: string; expressId: number; attrs: ItemProps; psets: PsetDict; name: string; qrCodeUrl: string }[] = [];
        const allAttrs: ItemProps[] = [];
        const allPsets: PsetDict[] = [];
        const allRawPsets: any[] = [];

        for (const fragmentId in selection) {
          const model = fragmentsRef.current?.list.get(fragmentId);
          if (!model) continue;

          for (const expressId of selection[fragmentId]) {
            const [attrs] = await model.getItemsData([expressId], { attributesDefault: true });
            const psetsRaw = await getItemPsets(model, expressId);
            const psets = formatItemPsets(psetsRaw);

            let name = `Element ${expressId}`;
            const nameAttribute = attrs?.Name as OBC.IDSAttribute;
            if (nameAttribute && typeof nameAttribute.value === 'string') {
              name = nameAttribute.value;
            }

            // Fetch MongoDB _id for QR Code URL
            let qrCodeUrl = '';
            try {
              const response = await fetch(`/api/elements/${expressId}`);
              if (response.ok) {
                const elementData = await response.json();
                if (elementData && elementData._id) {
                  const cleanedFragmentId = fragmentId.replace('models/', '');
                  qrCodeUrl = `${window.location.origin}/element/${cleanedFragmentId}/${elementData._id}`;
                }
              }
            } catch (error) {
              console.error('Error fetching element data for QR code:', error);
            }

            selectedElementsData.push({ modelId: fragmentId, expressId, attrs: attrs ?? {}, psets, name, qrCodeUrl });
            allAttrs.push(attrs ?? {});
            allPsets.push(psets);
            allRawPsets.push(psetsRaw);
          }
        }

        if (isAddingToGroupRef.current && activeAddGroupIdRef.current !== null) {
          // Handle adding to group for multi-select
          for (const elementData of selectedElementsData) {
            const newItem = {
              id: `${elementData.modelId}-${elementData.expressId}`,
              name: elementData.name,
              expressID: elementData.expressId,
              fragmentId: elementData.modelId,
            };
            searchElementRef.current?.addItemToGroup(String(activeAddGroupIdRef.current), newItem);
          }
          await highlighter.clear("select");
        } else {
          // Handle info panel for multi-select
          if (selectedElementsData.length > 0) {
            setIsInfoOpen(true);
            setInfoLoading(true);

            // Aggregate attributes
            const aggregatedAttrs: ItemProps = {};
            if (allAttrs.length > 0) {
              const firstAttrs = allAttrs[0];
              for (const key in firstAttrs) {
                const allValuesForKey = allAttrs.map(attrs => attrs[key]?.value);
                const allValuesAreSame = allValuesForKey.every((val, i, arr) => val === arr[0]);
                if (allValuesAreSame) {
                  aggregatedAttrs[key] = firstAttrs[key];
                } else {
                  aggregatedAttrs[key] = { value: "multi", type: "text" };
                }
              }
            }

            // Aggregate psets (simplified for now, just showing "multi" if any pset differs)
            const aggregatedPsets: PsetDict = {};
            if (allPsets.length > 0) {
              const firstPsets = allPsets[0];
              for (const psetName in firstPsets) {
                const allPsetValuesForKey = allPsets.map(psets => psets[psetName]);
                const allPsetValuesAreSame = allPsetValuesForKey.every((val, i, arr) => JSON.stringify(val) === JSON.stringify(arr[0]));
                if (allPsetValuesAreSame) {
                  aggregatedPsets[psetName] = firstPsets[psetName];
                } else {
                  aggregatedPsets[psetName] = { value: "multi", type: "text" };
                }
              }
            }

            setSelectedModelId(selectedElementsData[0].modelId); // Still show first modelId
            setSelectedLocalId(selectedElementsData[0].expressId); // Still show first expressId
            setSelectedAttrs(aggregatedAttrs);
            setSelectedPsets(aggregatedPsets);
            setRawPsets(allRawPsets);

            setQrCodeData(selectedElementsData.map(data => ({ url: data.qrCodeUrl, name: data.name, modelId: data.modelId, expressId: data.expressId })));
            setInfoLoading(false);
          } else {
            setIsInfoOpen(false);
            setSelectedModelId(null);
            setSelectedLocalId(null);
            setSelectedAttrs({}); // Clear attrs to empty object
            setSelectedPsets({}); // Clear psets to empty object
            setRawPsets([]);
            setQrCodeData([]);
          }
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

      return () => {
        resizeObserver.disconnect();
        if (world.camera.controls) {
          world.camera.controls.removeEventListener("update", updateIfManualMode);
        }
        if (world.renderer) {
          world.renderer.onResize.remove(updateIfManualMode);
        }
        components.dispose();
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

    const loadModelFromR2 = async () => {
      if (!fragmentsRef.current) return;
      setShowProgressModal(true);
      setProgress(0);

      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 8;
        if (simulatedProgress >= 98) simulatedProgress = 98;
        setProgress(Math.floor(simulatedProgress));
      }, 180);

      try {
        console.log("Loading model from R2...");
        const downloadResponse = await fetch('/api/models/r2-upload/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: '2024.04.18合併簡化-1V2.frag' }),
        });

        if (!downloadResponse.ok) {
          throw new Error(`Failed to get signed URL: ${downloadResponse.statusText}`);
        }

        const { signedUrl } = await downloadResponse.json();
        const modelResponse = await fetch(signedUrl);

        if (!modelResponse.ok) {
          throw new Error(`Failed to download model from R2: ${modelResponse.statusText}`);
        }

        const arrayBuffer = await modelResponse.arrayBuffer();
        const modelId = `default-db-model`;

        for (const [id] of fragmentsRef.current.list) {
          fragmentsRef.current.core.disposeModel(id);
        }

        const model = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
        fragmentsRef.current.list.set(modelId, model);

        setUploadedModels([{ id: modelId, name: "Default Model from R2", type: "frag", data: arrayBuffer }]);
        await loadCategoriesFromAllModels();

      } catch (error) {
        console.error('Failed to load model from R2:', error);
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => setShowProgressModal(false), 500);
      }
    };

    // We only load the model from the DB once the viewer components are ready
    // AND the user is logged in.
    const initModels = async () => {
      if (componentsRef.current && isLoggedIn && fragmentsRef.current) {
        // loadModelFromDB(); // Keep commented out as per previous instructions
        // await loadModelFromR2(); // Load the default model first
        await fetchR2Models(); // Then fetch and merge R2 models
      }
    };
    initModels();
  }, [componentsRef.current, isLoggedIn, fetchR2Models]);

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
            highlighter.zoomToSelection = true;
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

  const IfcUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !ifcLoaderRef.current || !fragmentsRef.current || !worldRef.current) return;

    try {
      setProgress(0);
      setShowProgressModal(true);

      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 5;
        if (simulatedProgress >= 98) simulatedProgress = 98;
        setProgress(Math.floor(simulatedProgress));
      }, 180);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const cleanedFileName = file.name.replace(/[^a-zA-Z0-9-_.]/g, '_');
      const modelId = `${cleanedFileName}_${Date.now()}`;

      const fragModel = await ifcLoaderRef.current.load(uint8Array, true, modelId, {
        instanceCallback: (importer: any) => console.log("IfcImporter ready", importer),
        userData: {},
      });

      fragmentsRef.current.list.set(modelId, fragModel);

      worldRef.current.scene.three.add(fragModel.object);
      await fragmentsRef.current.core.update(true);
      fragModel.useCamera(worldRef.current.camera.three);

      setUploadedModels((prev) => [...prev, { id: modelId, name: file.name, type: "ifc", data: arrayBuffer }]);

      clearInterval(progressInterval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 300));

      await loadCategoriesFromAllModels();
    } catch (err) {
      console.error("Failed to load IFC:", err);
    } finally {
      setShowProgressModal(false);
      event.target.value = "";
    }
  };
  
  const handleFragmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fragmentsRef.current || !worldRef.current) return;

    try {
      setProgress(0);
      setShowProgressModal(true);

      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 5;
        if (simulatedProgress >= 98) simulatedProgress = 98;
        setProgress(Math.floor(simulatedProgress));
      }, 180);

      const arrayBuffer = await file.arrayBuffer();
      const modelId = `frag_uploaded_${Date.now()}`;

      const fragModel = await fragmentsRef.current.core.load(arrayBuffer, { modelId });

      clearInterval(progressInterval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));

      fragModel.useCamera(worldRef.current.camera.three);
      worldRef.current.scene.three.add(fragModel.object);
      fragmentsRef.current.core.update(true);

      setUploadedModels((prev) => [...prev, { id: modelId, name: file.name, type: "frag", data: arrayBuffer }]);
    } finally {
      setShowProgressModal(false);
      event.target.value = "";
    }
  };
  
  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProgress(0);
      setShowProgressModal(true);

      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 5;
        if (simulatedProgress >= 98) simulatedProgress = 98;
        setProgress(Math.floor(simulatedProgress));
      }, 180);

      const text = await file.text();
      const data = JSON.parse(text);
      const modelId = `json_uploaded_${Date.now()}`;

      clearInterval(progressInterval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 700));

      console.log("Loaded JSON:", data);

      setUploadedModels((prev) => [...prev, { id: modelId, name: file.name, type: "json" }]);
    } finally {
      setShowProgressModal(false);
      event.target.value = "";
    }
  };
  
  const handleDownloadIFC = (model: UploadedModel) => {
    if (!model.data) return;
    const blob = new Blob([model.data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = model.name;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const downloadFragments = async () => {
    for (const [, model] of fragmentsRef.current!.list) {
      const fragsBuffer = await model.getBuffer(false);
      const file = new File([fragsBuffer], `${model.modelId}.frag`);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };
  
  const handleDownloadJSON = (model: UploadedModel) => {
    const json = { id: model.id, name: model.name, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getItemPsets = async (model: any, localId: number) => {
    const [data] = await model.getItemsData([localId], {
      attributesDefault: false,
      attributes: ["Name", "NominalValue"],
      relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: false, relations: false },
      },
    });
    return (data?.IsDefinedBy as FRAGS.ItemData[]) ?? [];
  };

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

  const onFocus = async () => {
    if (!cameraRef.current || !highlighterRef.current) return;
    const selection = highlighterRef.current.selection.select;

    let hasSelection = false;
    if (selection) {
      for (const modelId in selection) {
        if (selection[modelId] instanceof Set && selection[modelId].size > 0) {
          hasSelection = true;
          break;
        }
      }
    }

    if (hasSelection) {
      await cameraRef.current.fitToItems(selection);
    } else {
      await cameraRef.current.fitToItems();
    }
  };
  
  const onShow = async () => {
    await viewerApi.showAllElements();
    setIsInfoOpen(false);
    setSelectedModelId(null);
    setSelectedLocalId(null);
    setSelectedAttrs({});
    setSelectedPsets({});
    setRawPsets([]);
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

  const deleteAllModels = async () => {
    if (!fragmentsRef.current || !worldRef.current) return;
    
    for (const [modelId, fragModel] of fragmentsRef.current.list) {
      worldRef.current.scene.three.remove(fragModel.object);
      fragmentsRef.current.core.disposeModel(modelId);
    }

    // Delete all R2 models from R2 and MongoDB
    const r2ModelsToDelete = uploadedModels.filter(m => m.r2FileName && m._id); // Ensure _id exists
    for (const model of r2ModelsToDelete) {
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
      } catch (error) {
        console.error('Error deleting model from R2 and MongoDB:', error);
        setToast({ message: `Failed to delete model ${model.name} from R2 and MongoDB. Check console for details.`, type: "error" });
      }
    }

    setSelectedModelId(null);
    setSelectedLocalId(null);
    setSelectedAttrs({});
    setSelectedPsets({});
    setRawPsets([]);

    setUploadedModels([]);
    await fetchR2Models(); // Refresh the list after successful deletion
  };

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

  const loadCategoriesFromAllModels = async () => {
    if (!fragmentsRef.current) return;

    const allCats: Set<string> = new Set();

    for (const model of fragmentsRef.current.list.values()) {
      const cats = await model.getItemsOfCategories([/.*/]);
      Object.keys(cats).forEach((c) => allCats.add(c));
    }

    setCategories(Array.from(allCats).sort());
  };



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

  const onCategorySelect = (cat: string | null) => {
    setSelectedCategory(cat);

    setTimeout(() => {
      isolateCategory(cat).catch(console.warn);
    }, 100);
  };

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

  const handleLogout = async () => {
    try {
      await Promise.all([
        fetch('/api/logout', { method: 'POST' }),
        signOut({ redirect: false })
      ]);
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      deleteAllModels();
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    (window as any).handleLogout = handleLogout;
  }, [handleLogout]);

  const goToTopicViewpoint = async (topic: OBC.Topic) => {
    if (!componentsRef.current || !topic.viewpoints.size) return;

    const viewpoints = componentsRef.current.get(OBC.Viewpoints);
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    const fragments = componentsRef.current.get(OBC.FragmentsManager);

    if (!viewpoints || !highlighter || !fragments) return;

    const firstViewpointGuid = topic.viewpoints.values().next().value;

    if (firstViewpointGuid) {
      const viewpoint = viewpoints.list.get(firstViewpointGuid);
      if (viewpoint) {
        await viewpoint.go();

        await highlighter.clear();

        if (viewpoint.selectionComponents.size > 0) {
          const guidArray = Array.from(viewpoint.selectionComponents);
          const selection = await fragments.guidsToModelIdMap(guidArray);
          highlighter.selection.select = selection;
          await highlighter.highlight("select");
        }
      }
    }
  };

  return (
    <div className="flex w-full h-dvh overflow-hidden">
      <SideBar
        darkMode={darkMode}
        isOpen={isSidebarOpen}
        activeTab={activeSidebarTab}
        setActiveTab={setActiveSidebarTab}
        onToggle={(isOpen) => {
          setIsSidebarOpen(isOpen);
          if (isOpen) {
            setIsUserManagementPanelOpen(false);
          }
        }}
        onToggleDescription={() => setShowDescriptionPanel(!showDescriptionPanel)}
        isDescriptionOpen={showDescriptionPanel}
        themeSwitcher={<ThemeSwitch darkMode={darkMode} toggleTheme={toggleTheme} />}
        onToggleUserManagementPanel={handleToggleUserManagementPanel}
      >
        <SideBarTab name="Home">
          {components && (
            <HomePanel
              ref={searchElementRef}
              components={components!}
              darkMode={darkMode}
              onClose={() => {
                setIsSearchOpen(false);
                setActiveTool(null);
                setIsAddingToGroup(false);
                setActiveAddGroupId(null);
              }}
              onToggleAddMode={handleToggleAddMode}
              uploadedModels={uploadedModels}
              setUploadedModels={setUploadedModels}
              handleAssignModelToGroup={handleAssignModelToGroup}
              onModelGroupFilterChange={setCurrentModelGroupId}
              fetchR2Models={fetchR2Models}
              loadR2ModelIntoViewer={loadR2ModelIntoViewer}
              fragmentsRef={fragmentsRef}
              worldRef={worldRef}
              mainDisplayGroupId={mainDisplayGroupId} // Pass mainDisplayGroupId
              setMainDisplayGroupId={setMainDisplayGroupId} // Pass setMainDisplayGroupId
            />
          )}
        </SideBarTab>
        <SideBarTab name="Search">
          {components && (
            <SearchPanel
                components={components}
                darkMode={darkMode}
                loadedModelIds={Array.from(fragmentsRef.current?.list.keys() || [])}
            />
          )}
        </SideBarTab>
        <SideBarTab name="Models">
          <ModelManager
            darkMode={darkMode}
            uploadedModels={uploadedModels}
            setUploadedModels={setUploadedModels}
            // IfcUpload={IfcUpload} // Commented out as per user request
            handleFragmentUpload={handleFragmentUpload}
            handleJSONUpload={handleJSONUpload}
            handleDownloadIFC={handleDownloadIFC}
            downloadFragments={downloadFragments}
            handleDownloadJSON={handleDownloadJSON}
            deleteAllModels={deleteAllModels}
            deleteSelectedModel={deleteSelectedModel}
            fragmentsRef={fragmentsRef}
            worldRef={worldRef}
            components={components!} // Pass the components instance
            fetchR2Models={fetchR2Models}
            onOpenR2History={handleOpenR2History} // Pass the new handler
            handleAssignModelToGroup={handleAssignModelToGroup} // Pass the new handler
            onModelGroupFilterChange={setCurrentModelGroupId} // Pass the new handler to update currentModelGroupId
            setR2HistoryRefreshCounter={setR2HistoryRefreshCounter} // Pass the refresh counter setter
            isR2HistoryPanelOpen={showR2HistoryPanel} // Pass the state of R2 history panel
            mainDisplayGroupId={mainDisplayGroupId} // Pass mainDisplayGroupId
            setMainDisplayGroupId={setMainDisplayGroupId} // Pass setMainDisplayGroupId
          />
        </SideBarTab>
        <SideBarTab name="Element Manager">
          <UploadLinkDataPanel darkMode={darkMode} />
        </SideBarTab>
          {/* <SideBarTab name="Floors">
            <FloorPlan onSelectFloor={handleSelectFloor} />
          </SideBarTab>
          <SideBarTab name="Assets">
            <AssetsPanel />
          </SideBarTab> */}
          <SideBarTab name="Settings">
            <PreferenceSettings
              darkMode={darkMode}
              projection={projection}
              navigation={navigation}
              setProjection={setProjection}
              setNavigation={setNavigation}
              worldRef={worldRef}
              components={components}
              showGauges={showGauges}
              setShowGauges={setShowGauges}
              showVisitors={showVisitors}
              setShowVisitors={setShowVisitors}
              intervalMs={intervalMs}
              setIntervalMs={setIntervalMs}
              activeTab={activeSettingsTab}
              setActiveTab={setActiveSettingsTab}
            />
          </SideBarTab>
          <SideBarTab name="User" icon={
            user?.avatar ? (
              <Image src={user.avatar} alt="User Avatar" width={24} height={24} className="rounded-full" />
            ) : (
              <UserIcon />
            )
          }>
            <UserPanel
              languageSwitcher={<LanguageSwitch />}
              handleLogout={handleLogout}
              setShowLoginModal={setShowLoginModal}
            />
          </SideBarTab>
          {/* UserManagementPanel is rendered outside SideBar for full-page expansion */}
      </SideBar>


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
        <div className="relative flex-grow min-w-0 h-full">
          <IFCViewerUI
            darkMode={darkMode}
            viewerRef={viewerRef}
            uploadedModels={uploadedModels}
          />
          {showDescriptionPanel && (
            <div className="absolute bottom-4 right-4 w-80 z-20">
              <DescriptionPanel darkMode={darkMode} activeTool={activeTool} />
            </div>
          )}
          <div className="absolute inset-0 max-w-full max-h-full overflow-hidden pointer-events-none [&>*]:pointer-events-auto z-40">
              {/* {componentsRef.current && fragmentsRef.current && worldRef.current && (
                <ViewOrientation
                  components={componentsRef.current}
                  fragments={fragmentsRef.current}
                  world={worldRef.current}
                />
              )} */}

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
                onToggleInfo={handleToggleInfo}
                isInfoOpen={isInfoOpen}
                onToggleMultiSelect={() => {
                  setActiveTool(prev => {
                    const newTool = prev === "multi-select" ? null : "multi-select";
                    setShowDescriptionPanel(newTool === "multi-select");
                    return newTool;
                  });
                }}
                isMultiSelectActive={activeTool === "multi-select"}
              />

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

          {!isInfoOpen && !isUserManagementPanelOpen && !showDescriptionPanel && !showR2HistoryPanel && (
            <DataPanel
              darkMode={darkMode}
              showGauges={showGauges}
              showVisitors={showVisitors}
              intervalMs={intervalMs}
            />
          )}
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
        
        <div className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isInfoOpen ? 'w-80' : 'w-0'} ${darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'}`}>
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
        </div>
      </div>
    </div>
  );
}
