"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import { useAppContext } from "@/contexts/AppContext";
import { PerspectiveCamera, OrthographicCamera, Mesh, MeshLambertMaterial, DoubleSide, EquirectangularReflectionMapping, Scene, Color } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { ArrowLeft, Search, ArrowRight, BookAlert } from "lucide-react";
import MobileActionButtons from "@/components/IFCViewer/MobileActionButtons";
import LoadingModal from "@/components/IFCViewer/LoadingModal";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import HomePanel, { HomePanelRef } from "@/components/IFCViewer/HomePanel";
import FloorPlan from "@/components/IFCViewer/FloorPlan";
import AssetsPanel from "@/components/IFCViewer/AssetsPanel";
import MobileSearchPanel from "@/components/IFCViewer/MobileSearchPanel";
import Viewpoints, { StoredViewpoint } from "@/components/IFCViewer/Viewpoints";
import TopsideDataPanel from "@/components/IFCViewer/datapanel/TopsideDataPanel";
import QRScannerModal from "@/components/IFCViewer/QRScannerModal";

type ItemProps = Record<string, any>;
type PsetDict = Record<string, Record<string, any>>;

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

const MobileViewerContainer = () => {
  const { 
    selectedDevice, setSelectedDevice, selectedFragId, setSelectedFragId, selectedDeviceName, setSelectedDeviceName, 
    isHVACOn, setIsHVACOn, isCCTVOn, setIsCCTVOn, isEACOn, setIsEACOn, 
    isGlobalLoading, setIsGlobalLoading, loadingMessage, setLoadingMessage, 
    viewMode, setViewMode, selectedFloor, setSelectedFloor, 
    uploadedModels, setUploadedModels, viewerApi, darkMode, toggleTheme, user, setUser, isLoggedIn, setIsLoggedIn, setToast 
  } = useAppContext();

  const viewerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const cameraRef = useRef<OBC.OrthoPerspectiveCamera | null>(null);
  const searchElementRef = useRef<HomePanelRef>(null);
  const outlinerRef = useRef<OBCF.Outliner | null>(null);
  const markerRef = useRef<OBCF.Marker | null>(null);
  const boxerRef = useRef<OBC.BoundingBoxer | null>(null); 
  const viewpointsRef = useRef<OBC.Viewpoints | null>(null);
  const pathMeshRef = useRef<THREE.Mesh | null>(null);

  const globalCenterRef = useRef<THREE.Vector3 | null>(null);
  const globalBox3Ref = useRef<THREE.Box3 | null>(null);

  const originalColors = useRef(new Map<
    FRAGS.BIMMaterial, 
    { 
      color: number; 
      transparent: boolean; 
      opacity: number;
      vertexColors: boolean;
      depthWrite: boolean;
    }
  >());

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
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  const [elementSearchTerm, setElementSearchTerm] = useState("");
  const [issueIdSearchTerm, setIssueIdSearchTerm] = useState("");
  const [SearchResultMode, setSearchResultMode] = useState(false);
  const [storedViews, setStoredViews] = useState<StoredViewpoint[]>([]);
  const [currentViewpoint, setCurrentViewpoint] = useState<OBC.Viewpoint | null>(null);
  
  // QR & Repair Menu State
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [showRepairButton, setShowRepairButton] = useState(false);

  const clipperRef = useRef<OBC.Clipper | null>(null);
  const measurerRef = useRef<OBCF.LengthMeasurement | null>(null);
  const areaMeasurerRef = useRef<OBCF.AreaMeasurement | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const isAddingToGroupRef = useRef(false);
  const activeAddGroupIdRef = useRef<string | null>(null);
  const activeToolRef = useRef<"clipper" | "length" | "area" | "multi-select" | "search" | null>(null);
  const viewModeRef = useRef(viewMode);
  const setViewModeRef = useRef(setViewMode);
  const setSelectedFloorRef = useRef(setSelectedFloor);

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
  const [activeSearchMode, setActiveSearchMode] = useState<"element" | "issue" | null>("element");

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
  
  const [hasAutoLoadedModels, setHasAutoLoadedModels] = useState(false);
  const [isViewerReady, setIsViewerReady] = useState(false); 
  const [selectedSidePanel, setSelectedSidePanel] = useState<'home' | 'search' | 'floor' | 'assets'>('home');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  useEffect(() => { isAddingToGroupRef.current = isAddingToGroup; activeAddGroupIdRef.current = activeAddGroupId; }, [isAddingToGroup, activeAddGroupId]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]); 

  // --- Helper Functions ---
  const loadCategoriesFromAllModels = async () => {
    if (!fragmentsRef.current) return;
    const allCats: Set<string> = new Set();
    for (const model of fragmentsRef.current.list.values()) {
      const cats = await model.getItemsOfCategories([/.*/]);
      Object.keys(cats).forEach((c) => allCats.add(c));
    }
    setCategories(Array.from(allCats).sort());
  };

  const getAllCenterAndBox3 = async () => {
    const boxer = boxerRef.current;
    const fragments = fragmentsRef.current;

    if(!boxer || !fragments) {
        console.warn("Boxer or Fragments not ready");
        return;
    }

    const overallBox = new THREE.Box3();
    overallBox.makeEmpty();
    let foundGeometry = false;

    try {
        for (const [, model] of fragments.list) {
            if (model.object) {
              model.object.updateMatrixWorld(true);
              const modelBox = new THREE.Box3().setFromObject(model.object);
              if (!modelBox.isEmpty() && isFinite(modelBox.min.x)) {
                overallBox.union(modelBox);
                foundGeometry = true;
              }
            }
        }
    } catch (e) {
      console.error("Error calculating BBox:", e);
    }

    if (!foundGeometry) return;

    const center = new THREE.Vector3();
    overallBox.getCenter(center);

    globalBox3Ref.current = overallBox;
    globalCenterRef.current = center;
  };

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
          vertexColors: material.vertexColors,
          depthWrite: material.depthWrite,
        });
      }

      material.transparent = true;
      material.opacity = 0.1;
      material.vertexColors = false;
      material.depthWrite = false;
      material.needsUpdate = true;

      if ('color' in material) material.color.setRGB(0.2, 0.2, 0.2);
      else material.lodColor.setRGB(0.2, 0.2, 0.2);
    }
  };

  const restoreModelMaterials = () => {
    for (const [material, data] of originalColors.current) {
      material.transparent = data.transparent;
      material.opacity = data.opacity;
      material.vertexColors = data.vertexColors;
      material.depthWrite = data.depthWrite;
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

  const onFocus = useCallback(async (mode: 'top-down' | 'isometric' | 'tight-fit' = 'tight-fit') => {
    if (!cameraRef.current || !boxerRef.current || !highlighterRef.current) return;

    setIsGlobalLoading(true); 
    setLoadingMessage("正在聚焦中");

    const world = worldRef.current;
    const camera = world?.camera as OBC.OrthoPerspectiveCamera;
    const fragments = fragmentsRef.current as OBC.FragmentsManager;
    const boxer = boxerRef.current;

    boxer.list.clear();
    const visibleMap: OBC.ModelIdMap = {};
    
    for (const [modelId, model] of fragments.list) {
        const expressIds = await model.getItemsByVisibility(true);
        if (expressIds.length > 0) {
            visibleMap[modelId] = new Set(expressIds);
        }
    }

    const modelIdCount = Object.keys(visibleMap).length;
    
    if(modelIdCount > 1 && globalBox3Ref.current && globalCenterRef.current) {
        switch (mode) {
            case 'top-down':
                await camera.controls.setLookAt(
                    globalCenterRef.current.x + 40, globalCenterRef.current.y + 60, globalCenterRef.current.z + 80,
                    globalCenterRef.current.x + 40, globalCenterRef.current.y, globalCenterRef.current.z,
                    true
                );
                break;
            case 'isometric':
                await camera.controls.setLookAt(125, -20, 100, 0, 0, 0, true);
                break;
            case 'tight-fit':
                await camera.controls.fitToBox(globalBox3Ref.current, true, {
                    paddingLeft: 0.1, paddingRight: 0.1, paddingTop: 0.1, paddingBottom: 0.1
                });
                break;
        }
    } else {
        await boxer.addFromModelIdMap(visibleMap);
        const box3 = boxer.get();

        if (box3.isEmpty()) {
            setIsGlobalLoading(false);
            return;
        }

        const center = new THREE.Vector3();
        box3.getCenter(center);

        switch (mode) {
            case 'top-down':
                await camera.controls.setLookAt(
                    center.x, center.y + 50, center.z + 80,
                    center.x, center.y, center.z,
                    true
                );
                break;
            case 'isometric':
                await camera.controls.setLookAt(125, -20, 100, 0, 0, 0, true);
                break;
            case 'tight-fit':
                await camera.controls.fitToBox(box3, true, {
                    paddingLeft: 0.1, paddingRight: 0.1, paddingTop: 0.1, paddingBottom: 0.1
                });
                break;
        }
    }
    setIsGlobalLoading(false);
  }, [worldRef, boxerRef, highlighterRef]);

  // --- Fetching Logic ---
  const fetchR2Models = React.useCallback(async () => {
    try {
        const response = await fetch('/api/models/r2-upload/list');
        if (!response.ok) throw new Error("Failed to fetch models");
        const r2Models = await response.json();
        setUploadedModels(prev => r2Models); 
        return r2Models;
    } catch(e) { 
        console.error(e); 
        return [];
    }
  }, [setUploadedModels]);

  const loadR2ModelIntoViewer = useCallback(async (r2FileName: string, onProgress: (p: number)=>void) => {
    if (!fragmentsRef.current || !worldRef.current) return;
    try {
      const downloadResponse = await fetch('/api/models/r2-upload/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: r2FileName }),
      });
      if (!downloadResponse.ok) throw new Error(`Failed to get signed URL`);
      const { signedUrl } = await downloadResponse.json();
      
      const modelResponse = await fetch(signedUrl);
      if (!modelResponse.ok) throw new Error(`Failed to download`);
      
      const contentLength = modelResponse.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      const reader = modelResponse.body?.getReader();
      if (!reader) throw new Error("No body");
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if(total>0) onProgress((loaded/total)*100);
      }
      const arrayBuffer = await new Blob(chunks as BlobPart[]).arrayBuffer();
      const modelId = `${r2FileName}`;
      
      if(fragmentsRef.current.list.has(modelId)) fragmentsRef.current.core.disposeModel(modelId);
      const fragModel = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
      fragmentsRef.current.list.set(modelId, fragModel);
      fragModel.useCamera(worldRef.current.camera.three as PerspectiveCamera | OrthographicCamera);
      worldRef.current.scene.three.add(fragModel.object);
      fragmentsRef.current.core.update(true);

      setUploadedModels((prev) => {
        const idx = prev.findIndex(m => m.r2FileName === r2FileName);
        if (idx > -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], id: modelId, data: arrayBuffer };
            return updated;
        }
        return [...prev, { id: modelId, name: r2FileName, type: "frag", data: arrayBuffer, r2FileName }];
      });
      
      await loadCategoriesFromAllModels();

    } catch(e) { console.error(e); }
  }, [fragmentsRef, worldRef, setUploadedModels]);

  const loadAllModels = async () => {
    if (!componentsRef.current || !fragmentsRef.current || !worldRef.current) return;
    
    let modelsToLoad = uploadedModels.filter(m => m.r2FileName);

    if (modelsToLoad.length === 0) {
        console.log("State empty, fetching models manually...");
        const fetchedModels = await fetchR2Models();
        modelsToLoad = fetchedModels.filter((m: any) => m.r2FileName);
    }

    if (modelsToLoad.length === 0) {
      console.warn("No R2 models found to load.");
      return;
    }

    setHasAutoLoadedModels(true);
    setShowProgressModal(true);
    setProgress(0);
    
    try {
        let loadedCount = 0;
        for (const model of modelsToLoad) {
          try {
            await loadR2ModelIntoViewer(model.r2FileName!, (p) => {
              setProgress(Math.round(((loadedCount * 100) + p) / modelsToLoad.length));
            });
          } catch(e) { console.error("Error loading model:", e); }
          loadedCount++;
        }
        
        await getAllCenterAndBox3();
        await onFocus('isometric');
        
    } catch (error) {
      console.error("Critical error in loadAllModels:", error);
      setToast({ message: "Error loading models", type: "error" });
    } finally {
      setShowProgressModal(false);
      setProgress(100);
    }
  };

  const getCanvasSnapshot = (): Uint8Array | null => {
    if (!worldRef.current || !worldRef.current.renderer) return null;
    try {
        const renderer = worldRef.current.renderer;
        const canvas = renderer.three.domElement;
        
        if (worldRef.current.scene && worldRef.current.camera) {
          renderer.three.render(worldRef.current.scene.three, worldRef.current.camera.three);
        }

        const dataUrl = canvas.toDataURL("image/png");
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        return ia;
    } catch (e) {
        console.error("Snapshot error:", e);
        return null;
    }
  };

  // --- Viewpoint Logic ---
  const createViewpoint = async (): Promise<OBC.Viewpoint | null> => {
    if (!viewpointsRef.current || !worldRef.current) return null;
    if (!worldRef.current.camera) return null;

    viewpointsRef.current.world = worldRef.current;
    const vp = viewpointsRef.current.create();
    if (!vp) return null;

    vp.title = `Viewpoint ${storedViews.length + 1}`;
    
    try {
        await vp.updateCamera();

        const snapshotBuffer = getCanvasSnapshot();
        if (snapshotBuffer && viewpointsRef.current.snapshots) {
            viewpointsRef.current.snapshots.set(vp.guid, snapshotBuffer);
        }

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
    } catch (e) {
        console.error("Create Viewpoint Failed:", e);
        return null;
    }
  };

  const generateDefaultViewpoints = async () => {
    if (!viewpointsRef.current || !worldRef.current) return;
    
    if (!globalBox3Ref.current || !globalCenterRef.current) {
      await getAllCenterAndBox3();
      if(!globalBox3Ref.current) return;
    }

    if (storedViews.length > 0) return;

    setShowProgressModal(true);
    setProgress(0);
    
    viewpointsRef.current.world = worldRef.current;

    const center = globalCenterRef.current!;
    const size = new THREE.Vector3();
    globalBox3Ref.current!.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;

    const positions = [
      { name: "Front Door", pos: new THREE.Vector3(center.x, center.y, center.z + dist) },
      { name: "Back Door", pos: new THREE.Vector3(center.x, center.y, center.z - dist) },
      { name: "Left Door", pos: new THREE.Vector3(center.x - dist, center.y, center.z) },
      { name: "Right Door", pos: new THREE.Vector3(center.x + dist, center.y, center.z) },
    ];

    const camera = worldRef.current.camera as OBC.OrthoPerspectiveCamera;
    const newViews: StoredViewpoint[] = [];
    const totalSteps = positions.length;

    for (const [index, view] of positions.entries()) {
      
      await camera.controls.setLookAt(
        view.pos.x, view.pos.y, view.pos.z, 
        center.x, center.y, center.z,       
        false                               
      );
      
      await new Promise(r => setTimeout(r, 100)); 

      const vp = viewpointsRef.current.create();
      if (vp) {
        vp.title = view.name;
        await vp.updateCamera();
        
        const snapshotBuffer = getCanvasSnapshot();
        if (snapshotBuffer && viewpointsRef.current.snapshots) {
          viewpointsRef.current.snapshots.set(vp.guid, snapshotBuffer);
        }
        
        const snapshotData = getViewpointSnapshotData(vp);
        newViews.push({
          id: vp.guid,
          title: view.name,
          viewpoint: vp,
          snapshot: snapshotData
        });
      }

      const currentProgress = Math.round(((index + 1) / totalSteps) * 100);
      setProgress(currentProgress);
    }

    setStoredViews(newViews);
    
    setTimeout(() => {
      setShowProgressModal(false);
    }, 300);
    
    if (newViews.length > 0) {
      setCurrentViewpoint(newViews[0].viewpoint);
      await newViews[0].viewpoint.go();
    }
  };

  useEffect(() => {
    if (SearchResultMode) {
      setTimeout(() => { generateDefaultViewpoints(); }, 300);
    }
  }, [SearchResultMode]);

  const updateViewpointCamera = async (viewpoint: OBC.Viewpoint) => {
    if (!viewpoint) return;
    await viewpoint.updateCamera();
  };

  const setWorldCamera = async (viewpoint: OBC.Viewpoint) => {
    if (!viewpoint || !worldRef.current) return;
    await viewpoint.go();
  };

  const getViewpointSnapshotData = (vp: OBC.Viewpoint): string | null => {
    if (!vp || !viewpointsRef.current) return null;
    const data = viewpointsRef.current.snapshots.get(vp.guid);
    if (!data) return null;
    try {
        let binary = "";
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    } catch(e) { return null; }
  };

  // --- Handle Logic ---
  const handleIssueForms = async() => {
    console.log("Open Issue Form logic triggered (Disabled)");
    setToast({ message: "報修表單功能開發中", type: "success" });
  };

  const handleLocateElementByName = async () => {
    if (!isViewerReady) {
        setToast({message: "Viewer is initializing...", type: "warning"});
        return;
    }

    if (!hasAutoLoadedModels) {
        if (!elementSearchTerm.trim()) {
          setToast({message: "Enter name", type: "warning"}); return;
        }
        setIsGlobalLoading(true);
        try {
          await loadAllModels();
          await new Promise(r => setTimeout(r, 1200));
        } catch(e) { setIsGlobalLoading(false); return; }
    }

    if (!elementSearchTerm.trim()) {
      setToast({message: "Enter name", type: "warning"}); return;
    }

    setIsGlobalLoading(true);
    
    let modelIds: string[] = [];
    try {
      if (fragmentsRef.current) {
        try {
          modelIds = Array.from(fragmentsRef.current.list.keys());
        } catch (innerError) {
          console.warn("Fragments list access failed.", innerError);
        }
      }
    } catch (e) {
      console.error("Fragment Access Error:", e);
      setIsGlobalLoading(false);
      setToast({ message: "Viewer error: Please reload.", type: "error" });
      return;
    }

    if (modelIds.length === 0) {
      setIsGlobalLoading(false);
      setToast({ message: "No models loaded.", type: "warning" });
      return;
    }

    try {
      const response = await fetch('/api/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [{ id: 0, attribute: "Name", operator: "include", value: elementSearchTerm, logic: "AND" }],
          modelIds: modelIds,
        }),
      });

      if (!response.ok) throw new Error('Search failed');
      const foundElements = await response.json();

      if (foundElements.length > 0) {
        const selection: OBC.ModelIdMap = {};
        for (const element of foundElements) {
          const { modelId, attributes } = element;
          const expressID = attributes._localId.value;
          if (!selection[modelId]) selection[modelId] = new Set();
          selection[modelId].add(expressID);
        }
        
        const firstModelId = Object.keys(selection)[0];
        const firstExpressId = Array.from(selection[firstModelId])[0];
        setSelectedFragId(firstModelId);
        setSelectedDevice(firstExpressId);

        if (highlighterRef.current) {
          highlighterRef.current.enabled = true; 
          await highlighterRef.current.clear("select"); 
          setTimeout(async () => {
            if (highlighterRef.current) {
              await highlighterRef.current.highlightByID("select", selection, true, true);
              highlighterRef.current.enabled = false; 
            }
          }, 50); 
        }

        if(cameraRef.current) await cameraRef.current.fitToItems(selection);
        
        setToast({ message: `Found ${foundElements.length} elements`, type: "success" });
        setSearchResultMode(true);
      } else {
        setToast({ message: "No elements found", type: "error" });
      }
    } catch(e) { 
      console.error(e); 
      setToast({ message: "Search Error", type: "error" });
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleLocateIssueById = async () => {
    if (!isViewerReady) {
      setToast({message: "Viewer is initializing...", type: "warning"});
      return;
    }

    if (!hasAutoLoadedModels) {
        if (!issueIdSearchTerm.trim()) {
          setToast({message: "Enter Issue ID", type: "warning"}); return;
        }
        setIsGlobalLoading(true);
        try {
          await loadAllModels();
          await new Promise(r => setTimeout(r, 1200));
        } catch(e) { setIsGlobalLoading(false); return; }
    }

    if (!issueIdSearchTerm.trim()) {
      setToast({message: "Enter Issue ID", type: "warning"}); return;
    }

    setIsGlobalLoading(true);

    let modelIds: string[] = [];
    try {
        if (fragmentsRef.current) {
          try {
            modelIds = Array.from(fragmentsRef.current.list.keys());
          } catch (innerError) {
            console.warn("Fragments list access failed.", innerError);
          }
        }
    } catch (e) {
      console.error("Fragment Access Error:", e);
      setIsGlobalLoading(false);
      setToast({ message: "Viewer error: Please reload.", type: "error" });
      return;
    }

    if (modelIds.length === 0) {
      setIsGlobalLoading(false);
      setToast({ message: "No models loaded.", type: "warning" });
      return;
    }

    try {
      const response = await fetch('/api/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [{ id: 0, attribute: "IssueID", operator: "equal", value: issueIdSearchTerm, logic: "AND" }], 
          modelIds: modelIds,
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

        const firstModelId = Object.keys(selection)[0];
        const firstExpressId = Array.from(selection[firstModelId])[0];
        setSelectedFragId(firstModelId);
        setSelectedDevice(firstExpressId);

        if (highlighterRef.current) {
          highlighterRef.current.enabled = true; 
          await highlighterRef.current.clear("select"); 
          setTimeout(async () => {
            if (highlighterRef.current) {
              await highlighterRef.current.highlightByID("select", selection, true, true);
              highlighterRef.current.enabled = false; 
            }
          }, 50); 
        }
        
        if (cameraRef.current) {
          await cameraRef.current.fitToItems(selection);
        }

        setToast({ message: `Found Issue ID ${issueIdSearchTerm}`, type: "success" });
        setSearchResultMode(true);
      } else {
        setToast({ message: "Issue ID not found", type: "error" });
      }
    } catch (error) {
      console.error("Locate Issue failed:", error);
      setToast({ message: "Issue search failed", type: "error" });
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setSearchResultMode(false);
    setShowRepairButton(false);

    if (isGhost) {
      restoreModelMaterials();
      setIsGhost(false);
    }

    if (highlighterRef.current) {
      highlighterRef.current.enabled = true;
      highlighterRef.current.clear(); 
    }

    if (pathMeshRef.current && worldRef.current) {
      worldRef.current.scene.three.remove(pathMeshRef.current);
      pathMeshRef.current.geometry.dispose();
      (pathMeshRef.current.material as THREE.Material).dispose();
      pathMeshRef.current = null;
    }

    setSelectedFragId(null);
    setSelectedDevice(null);
  };

  const handleQRScan = (data: string | null) => {
    if (!data) return;
    setElementSearchTerm(data);
    setActiveSearchMode('element');
    setTimeout(() => { handleLocateElementByName(); }, 100);
    setIsQRScannerOpen(false);
    setShowRepairButton(false);
  };

  const handleDrawPath = async (doorName: string) => {
    if (!worldRef.current || !globalBox3Ref.current || !globalCenterRef.current) return;
    
    const scene = worldRef.current.scene.three;

    if (pathMeshRef.current) {
      scene.remove(pathMeshRef.current);
      pathMeshRef.current.geometry.dispose();
      (pathMeshRef.current.material as THREE.Material).dispose();
      pathMeshRef.current = null;
    }

    const validDoors = ["Front Door", "Back Door", "Left Door", "Right Door"];
    if (!validDoors.includes(doorName) || !selectedFragId || !selectedDevice) return;

    if (!isGhost && componentsRef.current) {
      setModelTransparent(componentsRef.current);
      setIsGhost(true);
    }

    const boxer = boxerRef.current;
    if (!boxer) return;
    boxer.list.clear();
    await boxer.addFromModelIdMap({ [selectedFragId]: new Set([selectedDevice]) });
    const elementBox = boxer.get();
    if (elementBox.isEmpty()) return;
    
    const targetCenter = new THREE.Vector3();
    elementBox.getCenter(targetCenter);

    const gBox = globalBox3Ref.current;
    const gCenter = globalCenterRef.current;
    const size = new THREE.Vector3();
    gBox.getSize(size);
    
    const groundY = gBox.min.y;
    const dist = Math.max(size.x, size.z) / 2 + 2;

    // 計算路徑的三個關鍵點 (Start ➔ Elevator ➔ Element Floor ➔ Target)
    let startPt = new THREE.Vector3();
    if (doorName === "Front Door") startPt.set(gCenter.x, groundY, gCenter.z + dist);
    else if (doorName === "Back Door") startPt.set(gCenter.x, groundY, gCenter.z - dist);
    else if (doorName === "Left Door") startPt.set(gCenter.x - dist, groundY, gCenter.z);
    else if (doorName === "Right Door") startPt.set(gCenter.x + dist, groundY, gCenter.z);

    const elevatorGroundPt = new THREE.Vector3(gCenter.x, groundY, gCenter.z);
    const elevatorTargetPt = new THREE.Vector3(gCenter.x, targetCenter.y, gCenter.z);

    // 建立曲線路徑
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(startPt, elevatorGroundPt)); // 進大門走向電梯
    path.add(new THREE.LineCurve3(elevatorGroundPt, elevatorTargetPt)); // 搭電梯垂直向上
    path.add(new THREE.LineCurve3(elevatorTargetPt, targetCenter)); // 出電梯走向目標元件

    const tubeGeometry = new THREE.TubeGeometry(path, 64, 0.2, 8, false);
    
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      depthTest: false, 
      transparent: true, 
      opacity: 0.8 
    });

    const pathMesh = new THREE.Mesh(tubeGeometry, material);
    pathMesh.renderOrder = 999;

    scene.add(pathMesh);
    pathMeshRef.current = pathMesh;
  };

  const getStepTitle = () => {
    if (showRepairButton) return "Step 3 : Finish Repair Request Form";
    if (SearchResultMode) return "Step 2 : Path to Element";
    return "Step 1 : Search Element";
  };

  // Init
  useEffect(() => {
    if (!viewerRef.current) return;
    const init = async () => {
      const components = new OBC.Components();
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

      const renderer = new OBC.SimpleRenderer(components, viewerRef.current!);
      world.renderer = renderer;
      
      const camera = new OBC.OrthoPerspectiveCamera(components);
      world.camera = camera;
      cameraRef.current = camera;
      
      components.init();
      
      const viewpoints = components.get(OBC.Viewpoints);
      viewpoints.world = world;
      viewpointsRef.current = viewpoints; 

      const highlighter = components.get(OBCF.Highlighter);
      highlighter.setup({ world });
      highlighter.zoomToSelection = true;
      highlighterRef.current = highlighter;
      
      const boxer = components.get(OBC.BoundingBoxer); 
      boxerRef.current = boxer;

      const fragments = components.get(OBC.FragmentsManager);
      
      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      try {
          const fetchedUrl = await fetch(githubUrl);
          const workerBlob = await fetchedUrl.blob();
          const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
          const workerUrl = URL.createObjectURL(workerFile);
          
          await fragments.init(workerUrl); 
          
          fragmentsRef.current = fragments;
          setIsViewerReady(true);
      } catch (error) {
          console.error("Failed to init fragments:", error);
          setToast({ message: "Init failed", type: "error" });
      }
    };
    init();
    return () => { 
      componentsRef.current?.dispose(); 
      componentsRef.current = null;
      fragmentsRef.current = null;
      worldRef.current = null;
      viewpointsRef.current = null;
      setIsViewerReady(false);
    };
  }, []);

  return (
    <div className={`relative h-dvh w-screen overflow-hidden ${darkMode ? 'bg-custom-zinc-900 bg-main-gradient text-white' : 'bg-white text-gray-800'}`}>
      
      {/* 標題列 Header (動態顯示 Step 1 ~ 3) */}
      <div className="absolute top-6 left-0 w-full z-[60] flex justify-center pointer-events-none">
        <div className="bg-blue-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold shadow-lg border border-blue-400/30 animate-in fade-in slide-in-from-top-4">
          {getStepTitle()}
        </div>
      </div>

      {/* Search Bars Area */}
      <div className="absolute top-22 left-0 w-full z-40 flex justify-center px-2 pointer-events-none">

        {/* Back Button */}
        {SearchResultMode && (
          <div className="pointer-events-auto absolute left-4">
            <button onClick={handleBackToSearch} className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition-all hover:scale-110 active:scale-95">
              <ArrowLeft size={24} />
            </button>
          </div>
        )}

        {/* Right Button (Open Repair Menu) - Style Matched to Left Button */}
        {SearchResultMode && !showRepairButton && (
          <div className="pointer-events-auto absolute right-4">
            <button 
              onClick={() => {
                setIsQRScannerOpen(true);
                setShowRepairButton(true);
              }} 
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition-all hover:scale-110 active:scale-95"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Element Name Search */}
        {!SearchResultMode && activeSearchMode === 'element' && (
          <div className="pointer-events-auto flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-xs animate-in slide-in-from-bottom-2 fade-in duration-200">
              <input type="text" placeholder="Search Element Name..." className="bg-transparent border-none outline-none text-sm w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 pl-1" value={elementSearchTerm} onChange={(e) => setElementSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLocateElementByName()} autoFocus />
              <button onClick={handleLocateElementByName} className="p-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"><Search size={16} /></button>
          </div>
        )}

        {/* Issue ID Search */}
        {!SearchResultMode && activeSearchMode === 'issue' && (
          <div className="pointer-events-auto flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-xs animate-in slide-in-from-bottom-2 fade-in duration-200">
            <input type="text" placeholder="Search Issue ID..." className="bg-transparent border-none outline-none text-sm w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 pl-1" value={issueIdSearchTerm} onChange={(e) => setIssueIdSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLocateIssueById()} autoFocus />
            <button onClick={handleLocateIssueById} className="p-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"><Search size={16} /></button>
          </div>
        )}
      </div>

      {/* Viewer */}
      <div ref={viewerRef} className="h-full w-full" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }} />

      {/* Bottom Bar */}
      {!SearchResultMode && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          {components && (
            <MobileActionButtons
              components={components}
              darkMode={darkMode}
              activeSearchMode={activeSearchMode}
              onSetSearchMode={setActiveSearchMode}
              onScanQR={() => {
                setIsQRScannerOpen(true);
                setShowRepairButton(false);
              }}
            />
          )}
        </div>
      )}

      {/* Viewpoints Panel */}
      {SearchResultMode && components && (
        <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 rounded-t-xl shadow-xl transition-transform duration-300 ${darkMode ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200'}`} style={{ height: '40vh' }}>
          <Viewpoints
            darkMode={darkMode}
            createViewpoint={createViewpoint}
            updateViewpointCamera={updateViewpointCamera}
            setWorldCamera={setWorldCamera}
            getViewpointSnapshotData={getViewpointSnapshotData}
            storedViews={storedViews}
            setStoredViews={setStoredViews}
            onDrawPath={handleDrawPath}
          />
        </div>
      )}
      
      {/* QR Scanner & Repair Button Overlay */}
      {isQRScannerOpen && (
        <>
          <QRScannerModal 
            onClose={() => {
              setIsQRScannerOpen(false);
              setShowRepairButton(false);
            }} 
            onScan={handleQRScan} 
            darkMode={darkMode} 
          />
          {showRepairButton && (
              <div className="fixed bottom-[5%] left-0 right-0 z-[60] flex justify-center pointer-events-auto">
                  <button 
                    onClick={handleIssueForms}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-lg transition-transform active:scale-95"
                  >
                    <BookAlert size={24} />
                    報修表單
                  </button>
              </div>
            )}
        </>
      )}

      <LoadingModal darkMode={darkMode} progress={progress} show={showProgressModal} />
    </div>
  );
};

export default MobileViewerContainer;