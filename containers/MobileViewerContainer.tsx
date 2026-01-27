"use client";

import React, { useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import { ThemeSwitch } from "@/components/theme-switch";
import { useAppContext } from "@/contexts/AppContext";
import { PerspectiveCamera, OrthographicCamera, Color, Mesh, MeshLambertMaterial, DoubleSide, EquirectangularReflectionMapping, Scene } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import Image from "next/image";
import { Avatar } from "@heroui/react";
import UserPanel from "@/components/IFCViewer/UserPanel";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { signOut } from "next-auth/react";
import MobileActionButtons from "@/components/IFCViewer/MobileActionButtons";
import LoadingModal from "@/components/IFCViewer/LoadingModal";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import MobileSidePanelToggle from "@/components/IFCViewer/MobileSidePanelToggle";
import IFCInfoPanel from "@/components/IFCViewer/InfoPanel";
import HomePanel, { HomePanelRef } from "@/components/IFCViewer/HomePanel";
import FloorPlan from "@/components/IFCViewer/FloorPlan";
import AssetsPanel from "@/components/IFCViewer/AssetsPanel";
import ShadowScenePanel from "@/components/IFCViewer/ShadowScenePanel";
import MobileSearchPanel from "@/components/IFCViewer/MobileSearchPanel";

type ItemProps = Record<string, any>;
type PsetDict = Record<string, Record<string, any>>;

const MobileViewerContainer = () => {
  const { uploadedModels, setUploadedModels, viewerApi, darkMode, toggleTheme, user, setUser, isLoggedIn, setIsLoggedIn, setToast } = useAppContext();
  const viewerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const cameraRef = useRef<OBC.OrthoPerspectiveCamera | null>(null);
  const searchElementRef = useRef<HomePanelRef>(null);

  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [components, setComponents] = useState<OBC.Components | null>(null);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [selectedAttrs, setSelectedAttrs] = useState<ItemProps>({});
  const [selectedPsets, setSelectedPsets] = useState<PsetDict>({});
  const [rawPsets, setRawPsets] = useState<any[]>([]);
  const [qrCodeData, setQrCodeData] = useState<{ url: string; name: string; modelId: string; expressId: number }[]>([]);

  // States and Refs for tools from IFCViewerContainer
  const clipperRef = useRef<OBC.Clipper | null>(null);
  const measurerRef = useRef<OBCF.LengthMeasurement | null>(null);
  const areaMeasurerRef = useRef<OBCF.AreaMeasurement | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const restListener = useRef<(() => Promise<void>) | null>(null);
  const isAddingToGroupRef = useRef(false);
  const activeAddGroupIdRef = useRef<string | null>(null);
  const activeToolRef = useRef<"clipper" | "length" | "area" | "multi-select" | "search" | null>(null);

  const [activeTool, setActiveTool] = useState<"clipper" | "length" | "area" | "multi-select" | "search" | null>(null);
  const [isGhost, setIsGhost] = useState(false);
  const [isShadowed, setIsShadowed] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isShadowPanelOpen, setIsShadowPanelOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedLocalId, setSelectedLocalId] = useState<number | null>(null);
  const [lengthMode, setLengthMode] = useState<"free" | "edge">("free");
  const [areaMode, setAreaMode] = useState<"free" | "square">("free");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [activeAddGroupId, setActiveAddGroupId] = useState<string | null>(null);
  const [currentModelGroupId, setCurrentModelGroupId] = useState<string | null>(null);
  const [mainDisplayGroupId, setMainDisplayGroupId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mainDisplayGroupId') || null;
    }
    return null;
  });
  const [r2HistoryRefreshCounter, setR2HistoryRefreshCounter] = useState(0);
  const [hasAutoLoadedModels, setHasAutoLoadedModels] = useState(true );

  useEffect(() => {
    isAddingToGroupRef.current = isAddingToGroup;
    activeAddGroupIdRef.current = activeAddGroupId;
  }, [isAddingToGroup, activeAddGroupId]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // States for Side Panel
  type PanelType = 'home' | 'search' | 'floor' | 'assets';
  const [selectedSidePanel, setSelectedSidePanel] = useState<PanelType>('home');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);

  const fetchR2Models = React.useCallback(async () => {
    try {
      const response = await fetch('/api/models/r2-upload/list');
      if (!response.ok) {
        throw new Error(`Failed to fetch R2 models: ${response.statusText}`);
      }
      const r2Models = await response.json();
      setUploadedModels((prevModels) => {
        const r2ModelsFromApi = r2Models;
        const updatedModels = prevModels.map((prevModel) => {
          const matchingR2Model = r2ModelsFromApi.find(
            (r2Model: any) => r2Model._id === prevModel._id
          );
          return matchingR2Model ? { ...prevModel, groupIds: matchingR2Model.groupIds } : prevModel;
        });

        r2ModelsFromApi.forEach((newR2Model: any) => {
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

  const handleAssignModelToGroup = React.useCallback(async (modelId: string, groupIds: string[]) => {
    try {
      const response = await fetch('/api/models/assign-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, groupIds }),
      });
      if (!response.ok) {
        throw new Error(`Failed to assign model to group: ${response.statusText}`);
      }
      await fetchR2Models();
      setToast({ message: `Model ${modelId} assigned to groups ${groupIds.join(', ') || 'ungrouped'} successfully!`, type: "success" });
      setR2HistoryRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error assigning model to group:', error);
      setToast({ message: `Failed to assign model ${modelId} to group. Check console for details.`, type: "error" });
    }
  }, [fetchR2Models, setToast]);

  const sendRemoteLog = React.useCallback(async (level: string, message: string, data?: any) => {
    try {
      // 處理 Error 物件以確保能被 JSON 序列化
      let serializedData = data;
      if (data instanceof Error) {
        serializedData = {
          message: data.message,
          stack: data.stack,
          name: data.name
        };
      } else if (data && typeof data === 'object') {
        // 遞迴檢查是否有 Error 物件
        serializedData = JSON.parse(JSON.stringify(data, Object.getOwnPropertyNames(data)));
      }

      await fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, data: serializedData }),
      });
    } catch (e) {
      console.warn("Failed to send remote log", e);
    }
  }, []);

  const loadR2ModelIntoViewer = React.useCallback(async (r2FileName: string, onProgress: (progress: number) => void) => {
    if (!fragmentsRef.current || !worldRef.current) {
      const msg = "Viewer components not initialized: fragmentsRef or worldRef is null";
      console.error(msg);
      sendRemoteLog("ERROR", msg);
      return;
    }

    try {
      const startMsg = `[DEBUG] Starting loadR2ModelIntoViewer for: ${r2FileName}`;
      console.log(startMsg);
      sendRemoteLog("INFO", startMsg);

      const downloadResponse = await fetch('/api/models/r2-upload/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: r2FileName }),
      });

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        const errMsg = `[DEBUG] API Error (${downloadResponse.status}): ${errorText}`;
        console.error(errMsg);
        sendRemoteLog("ERROR", errMsg);
        throw new Error(`Failed to get signed URL for ${r2FileName}: ${downloadResponse.statusText}`);
      }

      const { signedUrl } = await downloadResponse.json();
      const urlObj = new URL(signedUrl);
      sendRemoteLog("INFO", `[DEBUG] Successfully obtained signed URL. Host: ${urlObj.host}, Protocol: ${urlObj.protocol}`);
      
      console.log(`[DEBUG] Fetching model data from R2...`);
      const modelResponse = await fetch(signedUrl).catch(err => {
        const errMsg = `[DEBUG] Network error during R2 fetch: ${err.message}`;
        console.error(errMsg, err);
        sendRemoteLog("ERROR", errMsg, { stack: err.stack });
        throw err;
      });

      if (!modelResponse.ok) {
        const errMsg = `[DEBUG] R2 Download Error (${modelResponse.status}): ${modelResponse.statusText}`;
        console.error(errMsg);
        sendRemoteLog("ERROR", errMsg);
        throw new Error(`Failed to download model ${r2FileName} from R2: ${modelResponse.statusText}`);
      }

      sendRemoteLog("INFO", `[DEBUG] R2 Response OK. Status: ${modelResponse.status}`);
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
          onProgress((loaded / total) * 100);
        }
      }

      const arrayBuffer = await new Blob(chunks as BlobPart[]).arrayBuffer();
      const modelId = `${r2FileName}`;

      if (fragmentsRef.current.list.has(modelId)) {
        sendRemoteLog("INFO", `[DEBUG] Disposing existing model with ID: ${modelId}`);
        fragmentsRef.current.core.disposeModel(modelId);
      }

      const loadMsg = `[DEBUG] Loading arrayBuffer into fragments engine... Size: ${arrayBuffer.byteLength} bytes`;
      console.log(loadMsg);
      sendRemoteLog("INFO", loadMsg);

      const fragModel = await fragmentsRef.current.core.load(arrayBuffer, { modelId }).catch(err => {
        const errMsg = `[DEBUG] Fragments engine load error: ${err.message}`;
        console.error(errMsg, err);
        sendRemoteLog("ERROR", errMsg, { stack: err.stack });
        throw err;
      });
      
      fragmentsRef.current.list.set(modelId, fragModel);

      sendRemoteLog("INFO", `[DEBUG] Model loaded. Setting up camera and scene...`);
      const cam = worldRef.current.camera.three as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      fragModel.useCamera(cam);
      worldRef.current.scene.three.add(fragModel.object);
      fragmentsRef.current.core.update(true);

      const successMsg = `[DEBUG] Model ${r2FileName} successfully integrated into viewer.`;
      console.log(successMsg);
      sendRemoteLog("INFO", successMsg);
      setUploadedModels((prev) => {
        const existingModelIndex = prev.findIndex(m => m.r2FileName === r2FileName);
        if (existingModelIndex > -1) {
          const updated = [...prev];
          updated[existingModelIndex] = { ...updated[existingModelIndex], id: modelId, data: arrayBuffer };
          return updated;
        }
        return [...prev, { id: modelId, name: r2FileName, type: "frag", data: arrayBuffer, r2FileName }];
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const finalMsg = `[DEBUG] Final Catch - Failed to load model ${r2FileName}: ${errorMessage}`;
      console.error(finalMsg, error);
      sendRemoteLog("ERROR", finalMsg, { stack: (error as any)?.stack });
      setToast({ message: `Failed to load model ${r2FileName}: ${errorMessage}`, type: "error" });
    }
  }, [fragmentsRef, worldRef, setUploadedModels, setToast]);

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
  
      const batchSize = 100;
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
  
        if (elementsToSave.length > 0) {
          const response = await fetch('/api/elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(elementsToSave),
          });
  
          if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API request failed for batch starting at index ${i}: ${errorBody}`);
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

  const loadCategoriesFromAllModels = async () => {
    if (!fragmentsRef.current) return;

    const allCats: Set<string> = new Set();

    for (const model of fragmentsRef.current.list.values()) {
      const cats = await model.getItemsOfCategories([/.*/]);
      Object.keys(cats).forEach((c) => allCats.add(c));
    }

    setCategories(Array.from(allCats).sort());
  };

  const handleToggleAddMode = (active: boolean, groupId: string | null) => {
    setIsAddingToGroup(active);
    setActiveAddGroupId(groupId);
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
      setUser(null);
      setIsLoggedIn(false);
      setIsUserPanelOpen(false);
    }
  };

  useEffect(() => {
    // 嘗試從 localStorage 恢復登入狀態與使用者資訊
    const savedLogin = localStorage.getItem("isLoggedIn") === "true";
    const savedUser = localStorage.getItem("user_data");
    
    if (!isLoggedIn && savedLogin) {
      setIsLoggedIn(true);
      if (savedUser && !user) {
        setUser(JSON.parse(savedUser));
      }
    }

    if (!isLoggedIn && !savedLogin) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
      if (isLoggedIn) {
        localStorage.setItem("isLoggedIn", "true");
        if (user) localStorage.setItem("user_data", JSON.stringify(user));
      }
    }
  }, [isLoggedIn, setIsLoggedIn, user, setUser]);

  useEffect(() => {
    // Trigger selectAll and loadSelectedModels when HomePanel is opened, but only once
    if (isLoggedIn && isSidePanelOpen && selectedSidePanel === "home" && searchElementRef.current && !hasAutoLoadedModels) {
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
  }, [isLoggedIn, isSidePanelOpen, selectedSidePanel, searchElementRef.current, hasAutoLoadedModels]);

  useEffect(() => {
    // Prevent scrolling on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      // Revert styles when component unmounts
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = `[GLOBAL ERROR] ${event.message}`;
      console.error(msg, event.error);
      sendRemoteLog("ERROR", msg, {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      setToast({ message: `Global Error: ${event.message}`, type: "error" });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = `[UNHANDLED REJECTION] ${event.reason}`;
      console.error(msg, event.reason);
      sendRemoteLog("ERROR", msg, {
        reason: String(event.reason),
        stack: event.reason?.stack
      });
      setToast({ message: `Unhandled Rejection: ${event.reason}`, type: "error" });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // 監聽 WebGL 崩潰 (Context Lost)
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      const msg = "[WEBGL ERROR] WebGL Context Lost! The device might be out of memory.";
      console.error(msg);
      sendRemoteLog("ERROR", msg);
      setToast({ message: "3D 引擎崩潰，可能是手機記憶體不足，正在嘗試恢復...", type: "error" });
    };

    const canvas = viewerRef.current?.querySelector('canvas');
    canvas?.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      canvas?.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [setToast, sendRemoteLog]);

  useEffect(() => {
    // 檢查是否有上次崩潰前的麵包屑
    const lastBreadcrumb = localStorage.getItem("crash_breadcrumb");
    if (lastBreadcrumb) {
      sendRemoteLog("WARN", "App recovered from a potential crash/reload", { lastAction: lastBreadcrumb });
      localStorage.removeItem("crash_breadcrumb");
    }

    // 測試遠端日誌連線
    sendRemoteLog("INFO", "Mobile Viewer Client Connected", {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: `${window.screen.width}x${window.screen.height}`
    });
  }, [sendRemoteLog]);

  // 麵包屑記錄器
  const setBreadcrumb = (action: string) => {
    localStorage.setItem("crash_breadcrumb", `${new Date().toISOString()}: ${action}`);
  };

  useEffect(() => {
    if (!viewerRef.current) return;

    let components: OBC.Components;
    let resizeObserver: ResizeObserver;

    const initViewer = async () => {
      components = new OBC.Components();
      setComponents(components);

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
          (world.scene.three as Scene).environment = texture;
        },
      );

      // 在手機版改用 SimpleRenderer 並強制解析度為 1x 以節省顯存
      const renderer = new OBC.SimpleRenderer(components, viewerRef.current!);
      world.renderer = renderer;

      const camera = new OBC.OrthoPerspectiveCamera(components);
      world.camera = camera;
      await camera.controls.setLookAt(3, 3, 3, 0, 0, 0);
      camera.updateAspect();
      cameraRef.current = camera;

      components.init();

      const grids = components.get(OBC.Grids);

      const casters = components.get(OBC.Raycasters);
      casters.get(world);

      const viewpoints = components.get(OBC.Viewpoints);
      viewpoints.world = world;


      // Initialize tools
      const highlighter = components.get(OBCF.Highlighter);
      highlighter.setup({ world });
      highlighter.zoomToSelection = true;
      highlighterRef.current = highlighter;

      highlighter.events.select.onHighlight.add(async (selection) => {
        if (!Object.keys(selection).length) {
          setIsInfoOpen(false);
          setSelectedModelId(null);
          setSelectedLocalId(null);
          setSelectedAttrs({});
          setSelectedPsets({});
          setRawPsets([]);
          setQrCodeData([]);
          return;
        }

        if (isAddingToGroupRef.current && activeAddGroupIdRef.current !== null) {
          for (const fragmentId in selection) {
            const model = fragmentsRef.current?.list.get(fragmentId);
            if (!model) continue;
            for (const expressId of selection[fragmentId]) {
              const [attrs] = await model.getItemsData([expressId], { attributesDefault: true });
              let name = `Element ${expressId}`;
              const nameAttribute = attrs?.Name as OBC.IDSAttribute;
              if (nameAttribute && typeof nameAttribute.value === 'string') {
                name = nameAttribute.value;
              }
              const newItem = {
                id: `${fragmentId}-${expressId}`,
                name: name,
                expressID: expressId,
                fragmentId: fragmentId,
              };
              searchElementRef.current?.addItemToGroup(String(activeAddGroupIdRef.current), newItem);
            }
          }
          await highlighter.clear("select");
        } else {
          // setIsInfoOpen(true);
          setInfoLoading(true);

          // For simplicity on mobile, we'll only show info for the first selected item
          const fragmentId = Object.keys(selection)[0];
          const expressId = Array.from(selection[fragmentId])[0];
          
          const model = fragmentsRef.current?.list.get(fragmentId);
          if (!model) {
              setInfoLoading(false);
              return;
          };

          const [attrs] = await model.getItemsData([expressId], { attributesDefault: true });
          const psetsRaw = await getItemPsets(model, expressId);
          const psets = formatItemPsets(psetsRaw);

          let name = `Element ${expressId}`;
          const nameAttribute = attrs?.Name as OBC.IDSAttribute;
          if (nameAttribute && typeof nameAttribute.value === 'string') {
            name = nameAttribute.value;
          }

          let qrCodeUrl = '';
          try {
            const response = await fetch(`/api/elements/${expressId}`);
            if (response.ok) {
              const elementData = await response.json();
              if (elementData && elementData._id) {
                qrCodeUrl = `${window.location.origin}/element/${fragmentId}/${elementData._id}`;
              }
            }
          } catch (error) {
            console.error('Error fetching element data for QR code:', error);
          }

          setSelectedModelId(fragmentId);
          setSelectedLocalId(expressId);
          setSelectedAttrs(attrs ?? {});
          setSelectedPsets(psets);
          setRawPsets(psetsRaw);
          setQrCodeData([{ url: qrCodeUrl, name, modelId: fragmentId, expressId }]);
          setInfoLoading(false);
        }
      });

      const clipper = components.get(OBC.Clipper);
      clipper.enabled = false;
      clipperRef.current = clipper;

      components.get(OBC.Hider); // Initialize Hider
      components.get(OBC.ItemsFinder);

      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      console.log(`[DEBUG] Fetching fragments worker from: ${githubUrl}`);
      const fetchedUrl = await fetch(githubUrl).catch(err => {
        console.error("[DEBUG] Failed to fetch worker script:", err);
        throw err;
      });
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
      const workerUrl = URL.createObjectURL(workerFile);
      console.log(`[DEBUG] Worker URL created: ${workerUrl}`);

      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);
      fragmentsRef.current = fragments;

      // 限制更新頻率以節省記憶體與 CPU
      let updateTimeout: NodeJS.Timeout | null = null;
      camera.controls.addEventListener("update", () => {
        if (updateTimeout) return;
        setBreadcrumb("Camera Update / Zooming");
        updateTimeout = setTimeout(() => {
          fragments.core.update(true);
          updateTimeout = null;
        }, 100); // 每 100ms 最多更新一次
      });

      fragments.list.onItemSet.add(({ value: model }) => {
        const cam = world.camera.three as PerspectiveCamera | OrthographicCamera;
        model.useCamera(cam);
        world.scene.three.add(model.object);
        fragments.core.update(true);
        setTimeout(() => {
          if (worldRef.current?.camera) {
            (worldRef.current.camera as OBC.OrthoPerspectiveCamera).fitToItems();
          }
        }, 1500);
      });

      resizeObserver = new ResizeObserver(() => {
        renderer.resize();
        camera.updateAspect();
      });
      resizeObserver.observe(viewerRef.current!);
    };

    initViewer();

    return () => {
      if (resizeObserver && viewerRef.current) {
        resizeObserver.unobserve(viewerRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (components) {
        components.dispose();
      }
    };
  }, []);

  useEffect(() => {
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

      console.log("Loading model from R2...");
      try {
        // 1. Get signed URL from our new API endpoint
        const downloadResponse = await fetch('/api/models/r2-upload/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: '2024.04.18合併簡化-1V2.frag' }),
        });

        if (!downloadResponse.ok) {
          throw new Error('Failed to get signed URL for R2 download.');
        }

        const { signedUrl } = await downloadResponse.json();

        // 2. Fetch the model from R2 using the signed URL
        const modelResponse = await fetch(signedUrl);
        if (!modelResponse.ok) {
          throw new Error(`Failed to download model from R2: ${modelResponse.statusText}`);
        }
        const arrayBuffer = await modelResponse.arrayBuffer();
        const modelId = `default-db-model`;

        // 3. Load the model into the viewer
        for (const [id] of fragmentsRef.current.list) {
          fragmentsRef.current.core.disposeModel(id);
        }
        const model = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
        fragmentsRef.current.list.set(modelId, model);
        setUploadedModels([{ id: modelId, name: "Model from R2", type: "frag", data: arrayBuffer }]);
        
      } catch (error) {
        console.error('Failed to load model from R2:', error);
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => setShowProgressModal(false), 500);
      }
    };

    const initModels = async () => {
      if (componentsRef.current && isLoggedIn && fragmentsRef.current) {
        // loadModelFromR2(); // Commented out to avoid loading default model if we want auto-load from HomePanel
        await fetchR2Models();
      }
    };
    initModels();
  }, [components, isLoggedIn, fetchR2Models]);

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

  // Tool handlers from IFCViewerContainer
  const onToggleVisibility = async () => {
    if (!components) return;
    const highlighter = highlighterRef.current;
    const hider = components.get(OBC.Hider);
    if (!highlighter || !hider) return;

    const selection = highlighter.selection.select;
    if (!selection || Object.keys(selection).length === 0) return;

    for (const modelId in selection) {
      const localIds = Array.from(selection[modelId]);
      if (localIds.length === 0) continue;

      const fragments = components.get(OBC.FragmentsManager);
      const model = fragments?.list.get(modelId);
      if (!model) continue;

      const visibility = await model.getVisible(localIds);
      const isAllVisible = visibility.every((v) => v);

      const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set(localIds) };
      await hider.set(!isAllVisible, modelIdMap);
    }
  };

  const onIsolate = async () => {
    if (!components) return;
    const highlighter = highlighterRef.current;
    const hider = components.get(OBC.Hider);
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
  };

  const originalColors = useRef(new Map<
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
          color = (material as any).lodColor.getHex();
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
      else (material as any).lodColor.setRGB(0.5, 0.5, 0.5);
    }
  };

  const restoreModelMaterials = () => {
    for (const [material, data] of originalColors.current) {
      material.transparent = data.transparent;
      material.opacity = data.opacity;
      if ('color' in material) material.color.setHex(data.color);
      else (material as any).lodColor.setHex(data.color);
      material.needsUpdate = true;
    }
    originalColors.current.clear();
  };

  const handleGhost = (enable?: boolean) => {
    if (!components) return;

    const shouldEnable = enable !== undefined ? enable : !isGhost;

    if (shouldEnable) {
      if (!isGhost) {
        setModelTransparent(components);
        setIsGhost(true);
      }
    } else {
      if (isGhost) {
        restoreModelMaterials();
        setIsGhost(false);
      }
    }
  };

  const toggleShadowScene = async () => {
    if (!worldRef.current || !components) return;
    const world = worldRef.current;
    const isCurrentlyShadowed = world.scene instanceof OBC.ShadowedScene;
    setIsShadowed(!isCurrentlyShadowed);
    setIsShadowPanelOpen(!isCurrentlyShadowed); // Toggle panel based on new state
    const fragments = components.get(OBC.FragmentsManager);
    const models = Array.from(fragments.list.values());
    const grids = components.get(OBC.Grids);
    const grid = grids.list.get("default");

    if (restListener.current && world.camera.controls) {
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
      if (world.renderer) {
        (world.renderer as OBCF.PostproductionRenderer).three.shadowMap.enabled = false;
      }
      if (grid) {
        newScene.three.add(grid.three);
      }
    } else {
      const newScene = new OBC.ShadowedScene(components);
      world.scene = newScene;
      newScene.setup();
      
      if (world.renderer) {
        const renderer = world.renderer as OBCF.PostproductionRenderer;
        renderer.three.shadowMap.enabled = true;
        renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;
      }

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
        world.update();
      }

      restListener.current = async () => {
        if (world.scene instanceof OBC.ShadowedScene) {
            await newScene.updateShadows();
        }
      };
      
      if (world.camera.controls) {
        world.camera.controls.addEventListener("rest", restListener.current);
      }
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
    
    if (world.scene.three instanceof THREE.Scene) {
      world.scene.three.background = null;
    }
    if (cameraRef.current) {
      cameraRef.current.updateAspect();
    }
  };

  const handleToggleMultiSelect = () => {
    if (!highlighterRef.current) return;
    const isMulti = activeTool === "multi-select";
    setActiveTool(isMulti ? null : "multi-select");
    highlighterRef.current.zoomToSelection = isMulti;
  };

  useEffect(() => {
    if (!components || !worldRef.current) return;

    // This part is the "setup" for the current activeTool
    if (activeTool === "clipper") {
        if (clipperRef.current) clipperRef.current.enabled = true;
        if (highlighterRef.current) highlighterRef.current.enabled = false;
    } else if (activeTool === "length") {
        if (!measurerRef.current) {
            const length = components.get(OBCF.LengthMeasurement);
            length.world = worldRef.current;
            length.color = new Color("#494cb6");
            measurerRef.current = length;
        }
        measurerRef.current.enabled = true;
        if (highlighterRef.current) highlighterRef.current.enabled = false;
    } else if (activeTool === "area") {
        if (!areaMeasurerRef.current) {
            const area = components.get(OBCF.AreaMeasurement);
            area.world = worldRef.current;
            area.color = new Color("#494cb6");
            areaMeasurerRef.current = area;
        }
        areaMeasurerRef.current.enabled = true;
        if (highlighterRef.current) highlighterRef.current.enabled = false;
    } else if (activeTool === "multi-select") {
        if (highlighterRef.current) highlighterRef.current.zoomToSelection = false;
    } else {
        // No tool is active
        if (highlighterRef.current) highlighterRef.current.zoomToSelection = true;
    }

    // This is the cleanup function. It will run when activeTool changes again,
    // or when the component unmounts. It captures the value of `activeTool` from its render.
    return () => {
        if (activeTool === "clipper" && clipperRef.current) {
            clipperRef.current.enabled = false;
            clipperRef.current.list.clear();
        } else if (activeTool === "length" && measurerRef.current) {
            measurerRef.current.create();
            measurerRef.current.list.clear();
            measurerRef.current.enabled = false;
        } else if (activeTool === "area" && areaMeasurerRef.current) {
            areaMeasurerRef.current.endCreation();
            areaMeasurerRef.current.list.clear();
            areaMeasurerRef.current.enabled = false;
        }
        // When any tool is deactivated, we should restore the highlighter
        if (highlighterRef.current) {
            highlighterRef.current.enabled = true;
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

  const handleMeasurementCreate = () => {
    if (activeTool === "length" && measurerRef.current?.enabled) {
      measurerRef.current.create();
    } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
      areaMeasurerRef.current.endCreation();
    }
  };

  const handleMeasurementDelete = () => {
    if (activeTool === "length" && measurerRef.current?.enabled) {
      measurerRef.current.delete();
    } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
      areaMeasurerRef.current.delete();
    }
  };


  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !worldRef.current) return;

    const handleDblClick = () => {
      if (activeTool === "clipper" && clipperRef.current?.enabled) {
        if (worldRef.current) {
          clipperRef.current.create(worldRef.current);
        }
      } else if (activeTool === "length" && measurerRef.current?.enabled) {
        measurerRef.current.create();
      } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
        areaMeasurerRef.current.create();
      }
    };

    viewer.addEventListener("dblclick", handleDblClick);

    const handlePointerDown = (event: PointerEvent) => {
      if (activeTool !== "clipper" || !clipperRef.current || !worldRef.current) return;
      startPosition.current = { x: event.clientX, y: event.clientY };

      longPressTimeout.current = setTimeout(() => {
        // If a long press is detected and the clipper is active, delete the plane.
        if (clipperRef.current && clipperRef.current.list.size > 0 && worldRef.current) {
          clipperRef.current.delete(worldRef.current);
        }
        longPressTimeout.current = null;
      }, 500);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (longPressTimeout.current && startPosition.current) {
        const dx = Math.abs(event.clientX - startPosition.current.x);
        const dy = Math.abs(event.clientY - startPosition.current.y);
        if (dx > 10 || dy > 10) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }
      }
    };

    const handlePointerUp = () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    viewer.addEventListener("pointerdown", handlePointerDown);
    viewer.addEventListener("pointermove", handlePointerMove);
    viewer.addEventListener("pointerup", handlePointerUp);
    viewer.addEventListener("contextmenu", handleContextMenu);

    return () => {
      viewer.removeEventListener("dblclick", handleDblClick);
      viewer.removeEventListener("pointerdown", handlePointerDown);
      viewer.removeEventListener("pointermove", handlePointerMove);
      viewer.removeEventListener("pointerup", handlePointerUp);
      viewer.removeEventListener("contextmenu", handleContextMenu);
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
    };
  }, [activeTool]);

  return (
    <div className={`relative h-dvh w-screen overflow-hidden ${darkMode ? 'bg-custom-zinc-900 bg-main-gradient text-white' : 'bg-white text-gray-800'}`}>
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-2 ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`}>
        <button onClick={() => setIsUserPanelOpen(!isUserPanelOpen)} className="p-1 rounded-full">
          {user?.avatar ? (
            <Image src={user.avatar} alt="User Avatar" width={48} height={48} className="rounded-full" />
          ) : (
            <Avatar isBordered color="danger" src="" />
          )}
        </button>
        <div className="p-1 flex justify-center">
          <Image src="/Type=Full.svg" alt="Type Full" width={153.7} height={48} className={darkMode ? "brightness-0 invert" : ""} />
        </div>
        <ThemeSwitch darkMode={darkMode} toggleTheme={toggleTheme} />
      </div>

      {/* User Panel */}
      <div className={`absolute top-0 left-0 h-full w-80 z-30 transition-transform duration-300 ${isUserPanelOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? "bg-gray-800" : "bg-zinc-200"}`}>
        {isUserPanelOpen && (
          <UserPanel
            languageSwitcher={<LanguageSwitch />}
            handleLogout={handleLogout}
            setShowLoginModal={setShowLoginModal}
            onClose={() => setIsUserPanelOpen(false)}
          />
        )}
      </div>
      {isUserPanelOpen && <div onClick={() => setIsUserPanelOpen(false)} className="absolute inset-0 bg-black/50 z-20" />}

      {/* Viewer */}
      <div
        ref={viewerRef}
        className="h-full w-full"
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none'
        }}
      />

      {/* Side Panel Toggle */}
      <MobileSidePanelToggle
        selectedPanel={selectedSidePanel}
        onPanelSelect={setSelectedSidePanel}
        onTogglePanel={() => setIsSidePanelOpen(!isSidePanelOpen)}
        isPanelOpen={isSidePanelOpen}
      />

      {/* Side Panel Content */}
      <div className={`absolute top-0 right-0 w-80 z-10 transition-transform duration-300 ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'} ${darkMode ? "bg-gray-800/80" : "bg-zinc-200/80"} backdrop-blur-sm p-4 overflow-y-auto`} style={{ paddingTop: '72px', height: 'calc(100% - 3rem)' }}>
        {selectedSidePanel === 'home' && components &&
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
              mainDisplayGroupId={mainDisplayGroupId}
              setMainDisplayGroupId={setMainDisplayGroupId}
            />}
        {selectedSidePanel === 'search' && components &&
          <MobileSearchPanel
            components={components}
            isGhost={isGhost}
            onGhostChange={handleGhost}
            darkMode={darkMode}
            loadedModelIds={Array.from(fragmentsRef.current?.list.keys() || [])}
          />}
        {selectedSidePanel === 'floor' && components &&
          <FloorPlan
            onSelectFloor={(floor) => console.log("Selected floor:", floor)}
          />}
        {selectedSidePanel === 'assets' && components && <AssetsPanel />}
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {components && (
          <MobileActionButtons
            components={components}
            darkMode={darkMode}
            onToggleVisibility={onToggleVisibility}
            onIsolate={onIsolate}
            onFocus={onFocus}
            onShow={onShow}
            onGhost={handleGhost}
            isGhost={isGhost}
            onToggleShadowScene={toggleShadowScene}
            isShadowed={isShadowed}
            activeTool={activeTool}
            onSelectTool={(tool) => {
              setActiveTool(prevTool => (prevTool === tool ? null : tool));
            }}
            onToggleInfo={() => setIsInfoOpen(!isInfoOpen)}
            isInfoOpen={isInfoOpen}
            isMultiSelectActive={activeTool === "multi-select"}
            lengthMode={lengthMode}
            setLengthMode={setLengthMode}
            areaMode={areaMode}
            setAreaMode={setAreaMode}
            onMeasurementCreate={handleMeasurementCreate}
            onMeasurementDelete={handleMeasurementDelete}
          />
        )}
        {/* Footer */}
        <footer className={`p-1 flex justify-center items-center text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          <span>v1.2.4 | © 2025 Gomore</span>
        </footer>
      </div>

      {/* Info Panel */}
      {components && (
        <div className={`absolute bottom-0 left-0 right-0 h-[50%] z-20 transform transition-transform duration-300 ${isInfoOpen ? 'translate-y-0' : 'translate-y-full'} ${darkMode ? 'bg-gray-800/90 border-t border-gray-700' : 'bg-white/90 border-t border-gray-200'} backdrop-blur-sm rounded-t-lg shadow-lg overflow-hidden`}>
          <IFCInfoPanel
            components={components}
            darkMode={darkMode}
            infoLoading={infoLoading}
            modelId={selectedModelId}
            localId={selectedLocalId}
            attrs={selectedAttrs}
            psets={selectedPsets}
            rawPsets={rawPsets}
            onClose={() => setIsInfoOpen(false)}
            qrCodeData={qrCodeData}
            isMultiSelectActive={activeTool === "multi-select"}
          />
        </div>
      )}

      {/* Shadow Scene Panel */}
      {components && (
        <div className={`absolute bottom-0 left-0 right-0 h-[50%] z-20 transform transition-transform duration-300 ${isShadowPanelOpen ? 'translate-y-0' : 'translate-y-full'} ${darkMode ? 'bg-gray-800/90 border-t border-gray-700' : 'bg-white/90 border-t border-gray-200'} backdrop-blur-sm rounded-t-lg shadow-lg overflow-hidden p-4`}>
          <ShadowScenePanel components={components} onClose={() => setIsShadowPanelOpen(false)} />
        </div>
      )}

      <LoadingModal darkMode={darkMode} progress={progress} show={showProgressModal} />

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
    </div>
  );
};

export default MobileViewerContainer;