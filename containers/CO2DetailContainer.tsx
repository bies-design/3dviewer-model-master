"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import * as OBC from '@thatopen/components';
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { Focus, Sun, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ClipboardClock, Eye, EyeOff, BoxSelect, Ghost, Scissors, Ruler, Square } from "lucide-react";
import { Button, Tooltip } from "@heroui/react"; // Import Button
import MaterialDataTable from '@/components/MaterialDataTable';
import LoadingModal from '@/components/IFCViewer/LoadingModal';
import { useAppContext } from '@/contexts/AppContext';
import { ThemeSwitch } from '@/components/theme-switch';
import ElementHistoryModal from '@/components/IFCViewer/ElementHistoryModal'; // Import ElementHistoryModal

type History = {
  id: string;
  user: string;
  timestamp: string;
  changes: Record<string, { oldValue: any; newValue: any }>;
};

interface MaterialRow {
  id: number;
  index: string;
  material: string;
  thickness: number;
  width: number;
  density: number;
  length: number;
  kgM2: number;
  co2eKg: number;
  co2eM2: number;
  isDefault: boolean;
  subRows: Omit<MaterialRow, 'subRows' | 'index'>[];
}

interface ProjectData {
  _id: string;
  modelName: string;
  materials: MaterialRow[];
  fragmentR2Name: string;
  history?: History[]; // Add history property
}

const CO2DetailContainer = () => {
  const params = useParams();
  const { id } = params;
  const { darkMode, toggleTheme, setToast } = useAppContext(); // Add setToast
  const [project, setProject] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const clipperRef = useRef<OBC.Clipper | null>(null);
  const measurerRef = useRef<OBCF.LengthMeasurement | null>(null);
  const areaMeasurerRef = useRef<OBCF.AreaMeasurement | null>(null);
  const originalColors  = useRef(new Map<
    FRAGS.BIMMaterial,
    { color: number; transparent: boolean; opacity: number }
  >());

  const [isGhost, setIsGhost] = useState(false);
  const [isColorShadowsEnabled, setIsColorShadowsEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<"clipper" | "length" | "area" | null>(null);
  const [lengthMode, setLengthMode] = useState<"free" | "edge">("free");
  const [areaMode, setAreaMode] = useState<"free" | "square">("free");

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [originalMaterials, setOriginalMaterials] = useState<MaterialRow[]>([]); // New state for original materials
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [history, setHistory] = useState<History[]>([]); // New state for history
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false); // New state for history modal

  useEffect(() => {
    if (!viewerContainerRef.current || !id) return;

    let components: OBC.Components;
    let renderer: OBCF.PostproductionRenderer;
    let progressInterval: NodeJS.Timeout;

    const updateIfManualMode = () => {
      if (renderer && renderer.mode === OBC.RendererMode.MANUAL) {
        renderer.needsUpdate = true;
      }
    };

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(0);
        
        components = new OBC.Components();
        componentsRef.current = components;
        
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        worldRef.current = world;
        
        const scene = new OBC.SimpleScene(components);
        world.scene = scene;
        scene.setup();
        scene.three.background = null;
        
        renderer = new OBCF.PostproductionRenderer(components, viewerContainerRef.current!);
        world.renderer = renderer;
        
        const camera = new OBC.OrthoPerspectiveCamera(components);
        world.camera = camera;
        await camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
        
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

        await components.init();

        const highlighter = components.get(OBCF.Highlighter);
        highlighter.setup({ world });
        highlighter.zoomToSelection = true;
        highlighterRef.current = highlighter;

        components.get(OBC.Hider);
        const clipper = components.get(OBC.Clipper);
        clipper.enabled = false;
        clipperRef.current = clipper;

        const measurer = components.get(OBCF.LengthMeasurement);
        measurer.world = world;
        measurerRef.current = measurer;

        const areaMeasurer = components.get(OBCF.AreaMeasurement);
        areaMeasurer.world = world;
        areaMeasurerRef.current = areaMeasurer;

        const fragments = components.get(OBC.FragmentsManager);
        const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedUrl = await fetch(githubUrl);
        const workerBlob = await fetchedUrl.blob();
        const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
        const workerUrl = URL.createObjectURL(workerFile);
        await fragments.init(workerUrl);

        fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
          const isLod = "isLodMaterial" in material && material.isLodMaterial;
          if (isLod) {
            (world.renderer as OBCF.PostproductionRenderer).postproduction.basePass.isolatedMaterials.push(material);
          }
        });

        renderer.onBeforeUpdate.add(() => fragments.core.update());
        camera.controls.addEventListener("update", () => fragments.core.update(true));

        if (camera.controls) {
          camera.controls.addEventListener("update", updateIfManualMode);
        }
        if (renderer) {
          renderer.onResize.add(updateIfManualMode);
        }

        // const grids = components.get(OBC.Grids);
        // grids.create(world);

        const metaResponse = await fetch(`/api/co2-projects/${id}`);
        if (!metaResponse.ok) throw new Error(`Failed to fetch project metadata: ${metaResponse.statusText}`);
        const projectData = await metaResponse.json();
        setProject(projectData);
        setMaterials(projectData.materials);
        setOriginalMaterials(JSON.parse(JSON.stringify(projectData.materials))); // Save original materials
        setExpandedRows(new Set(projectData.materials.map((row: MaterialRow) => row.id)));
        setHistory(projectData.history || []); // Load history

        let simulatedProgress = 0;
        progressInterval = setInterval(() => {
          simulatedProgress += Math.random() * 9;
          if (simulatedProgress >= 98) simulatedProgress = 98;
          setLoadingProgress(Math.floor(simulatedProgress));
        }, 200);

        const downloadResponse = await fetch('/api/models/r2-upload/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: projectData.fragmentR2Name }),
        });
        if (!downloadResponse.ok) throw new Error("Failed to get download URL for fragment.");
        const { signedUrl } = await downloadResponse.json();

        const modelResponse = await fetch(signedUrl);
        if (!modelResponse.ok) throw new Error("Failed to download fragment file.");
        
        const buffer = await modelResponse.arrayBuffer();
        console.log(`Downloaded fragment buffer size: ${buffer.byteLength} bytes`);

        let model;
        const modelId = `model-${id}`; // Define modelId here
        try {
          model = await fragments.core.load(buffer, { modelId });
          console.log("Model loaded successfully:", model);
        } catch (loadError) {
          console.error("Error loading fragment with OBC:", loadError);
          throw new Error(`Failed to load fragment with OBC: ${loadError instanceof Error ? loadError.message : 'Unknown error'}`);
        }
        
        scene.three.add(model.object);
        model.useCamera(camera.three); // Add this line
        fragments.list.set(modelId, model); // Add this line
        await camera.fitToItems();
        console.log("Camera fitted to model items.");
        
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setTimeout(() => setIsLoading(false), 500);

        const resizeObserver = new ResizeObserver(() => {
          renderer.resize();
          camera.updateAspect();
        });
        resizeObserver.observe(viewerContainerRef.current!);

        return () => {
          if (viewerContainerRef.current) resizeObserver.unobserve(viewerContainerRef.current);
          resizeObserver.disconnect();
          
          if (camera?.controls) {
            camera.controls.removeEventListener("update", updateIfManualMode);
          }
          if (renderer) {
            renderer.onResize.remove(updateIfManualMode);
          }
          URL.revokeObjectURL(workerUrl);
          components?.dispose();
        };

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        clearInterval(progressInterval);
        setIsLoading(false);
      }
    };

    const cleanup = initViewer();

    return () => {
      clearInterval(progressInterval);
      cleanup.then(dispose => dispose && dispose());
    };
  }, [id]);

  useEffect(() => {
    if (!componentsRef.current || !worldRef.current) return;
    const components = componentsRef.current;
    const world = worldRef.current;
    const highlighter = components.get(OBCF.Highlighter);

    if (activeTool === "clipper") {
        if (clipperRef.current) clipperRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "length") {
        if (measurerRef.current) measurerRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "area") {
        if (areaMeasurerRef.current) areaMeasurerRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else {
        if (highlighter) highlighter.zoomToSelection = true;
    }

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
        if (highlighter) highlighter.enabled = true;
    };
  }, [activeTool]);

  useEffect(() => {
    if (measurerRef.current) measurerRef.current.mode = lengthMode;
  }, [lengthMode]);

  useEffect(() => {
    if (areaMeasurerRef.current) areaMeasurerRef.current.mode = areaMode;
  }, [areaMode]);

  useEffect(() => {
    if (!componentsRef.current || !worldRef.current) return;

    const handleDblClick = () => {
      if (activeTool === "length" && measurerRef.current?.enabled) {
        measurerRef.current.create();
      } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
        areaMeasurerRef.current.create();
      } else if (activeTool === "clipper" && clipperRef.current?.enabled && worldRef.current) {
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
      if (activeTool === "clipper" && clipperRef.current?.enabled && worldRef.current) {
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

    viewerContainerRef.current?.addEventListener("dblclick", handleDblClick);
    window.addEventListener("keydown", handleKeyDown);
    viewerContainerRef.current?.addEventListener("contextmenu", handleContextMenu);

    return () => {
      viewerContainerRef.current?.removeEventListener("dblclick", handleDblClick);
      window.removeEventListener("keydown", handleKeyDown);
      viewerContainerRef.current?.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [activeTool]);

  const setModelTransparent = (components: OBC.Components) => {
    const fragments = components.get(OBC.FragmentsManager);
    const materials = [...fragments.core.models.materials.list.values()];
    for (const material of materials) {
      if (material.userData.customId) continue;
      if (!originalColors.current.has(material)) {
        let color: number;
        if ('color' in material) color = material.color.getHex();
        else color = (material as any).lodColor.getHex();
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

  const onToggleVisibility = async () => {
    if (!componentsRef.current) return;
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    const hider = componentsRef.current.get(OBC.Hider);
    const selection = highlighter.selection.select;
    if (!selection || Object.keys(selection).length === 0) return;
    for (const modelId in selection) {
      const localIds = Array.from(selection[modelId]);
      if (localIds.length === 0) continue;
      const fragments = componentsRef.current.get(OBC.FragmentsManager);
      const model = fragments?.list.get(modelId);
      if (!model) continue;
      const visibility = await model.getVisible(localIds);
      const isAllVisible = visibility.every((v) => v);
      const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set(localIds) };
      await hider.set(!isAllVisible, modelIdMap);
    }
  };
  
  const onIsolate = async () => {
    if (!componentsRef.current) return;
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    const hider = componentsRef.current.get(OBC.Hider);
    const selection = highlighter.selection.select;
    if (!selection || Object.keys(selection).length === 0) return;
    await hider.set(false);
    await hider.set(true, selection);
  };

  const onShow = async () => {
    if (!componentsRef.current) return;
    const hider = componentsRef.current.get(OBC.Hider);
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    if (hider) await hider.set(true);
    if (highlighter) await highlighter.clear();
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

  const handleClipper = () => setActiveTool(prev => prev === "clipper" ? null : "clipper");
  const handleLength = () => setActiveTool(prev => prev === "length" ? null : "length");
  const handleArea = () => setActiveTool(prev => prev === "area" ? null : "area");

  const renderOptionsPanel = (tool: "length" | "area") => {
    if (activeTool !== tool) return null;
    const panelBaseClasses = `absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-max p-2 rounded-xl shadow-lg flex flex-col items-center gap-2 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-black"}`;
    switch (tool) {
      case "length":
        return (
          <div className={`${panelBaseClasses}`}>
            <span className="text-sm font-semibold">Length Mode</span>
            <div className="flex gap-2">
              <button onClick={() => setLengthMode("free")} className={`px-2 py-1 text-xs rounded ${lengthMode === 'free' ? 'bg-blue-500' : 'bg-gray-600'}`}>Free</button>
              <button onClick={() => setLengthMode("edge")} className={`px-2 py-1 text-xs rounded ${lengthMode === 'edge' ? 'bg-blue-500' : 'bg-gray-600'}`}>Edge</button>
            </div>
          </div>
        );
      case "area":
        return (
          <div className={`${panelBaseClasses}`}>
            <span className="text-sm font-semibold">Area Mode</span>
            <div className="flex gap-2">
              <button onClick={() => setAreaMode("free")} className={`px-2 py-1 text-xs rounded ${areaMode === 'free' ? 'bg-blue-500' : 'bg-gray-600'}`}>Free</button>
              <button onClick={() => setAreaMode("square")} className={`px-2 py-1 text-xs rounded ${areaMode === 'square' ? 'bg-blue-500' : 'bg-gray-600'}`}>Square</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const buttonClass = (tool: string | null) =>
    `p-2 rounded-xl ${activeTool === tool && tool !== null ? (darkMode ? "bg-blue-600" : "bg-blue-400") : (darkMode ? "hover:bg-gray-700" : "hover:bg-gray-300")}`;

  const onFocus = async () => {
    if (!worldRef.current) return;
    const camera = worldRef.current.camera as OBC.OrthoPerspectiveCamera;
    if (camera) {
      await camera.fitToItems();
    }
  };

  const handleSaveChanges = async () => {
    if (!project || !originalMaterials) return;

    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    // Deep compare materials and originalMaterials
    const allMaterialIds = new Set([...materials.map(m => m.id), ...originalMaterials.map(m => m.id)]);

    allMaterialIds.forEach(materialId => {
      const originalMaterial = originalMaterials.find(m => m.id === materialId);
      const currentMaterial = materials.find(m => m.id === materialId);

      if (!originalMaterial && currentMaterial) {
        // New material added
        changes[`material_${materialId}`] = { oldValue: null, newValue: currentMaterial };
      } else if (originalMaterial && !currentMaterial) {
        // Material removed
        changes[`material_${materialId}`] = { oldValue: originalMaterial, newValue: null };
      } else if (originalMaterial && currentMaterial) {
        // Material modified
        if (originalMaterial.material !== currentMaterial.material || originalMaterial.co2eM2 !== currentMaterial.co2eM2) {
          changes[`material_${materialId}`] = { oldValue: originalMaterial, newValue: currentMaterial };
        }
      }
    });

    if (Object.keys(changes).length === 0) {
      setToast({ message: "No changes to save.", type: "info" });
      return;
    }

    try {
      const response = await fetch(`/api/co2-projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materials,
          history: {
            user: "current_user", // TODO: Replace with actual user from session
            timestamp: new Date().toISOString(),
            changes,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      const result = await response.json();
      console.log("Save successful:", result);
      setOriginalMaterials(JSON.parse(JSON.stringify(materials))); // Update original materials
      setToast({ message: "Materials updated successfully!", type: "success" });
      const newHistoryEntry: History = {
        id: new Date().toISOString(),
        user: "current_user", // TODO: Replace with actual user from session
        timestamp: new Date().toISOString(),
        changes,
      };
      setHistory(prevHistory => [newHistoryEntry, ...prevHistory]);

    } catch (error) {
      console.error("Error saving changes:", error);
      setToast({ message: `Error saving changes: ${error instanceof Error ? error.message : 'Unknown error'}`, type: "error" });
    }
  };

  if (error) {
    return <div className="w-full h-dvh flex items-center justify-center bg-gray-900 text-white"><p>Error: {error}</p></div>;
  }

  return (
    <div className={`w-full h-dvh flex flex-col overflow-hidden ${darkMode ? "dark bg-gray-900 text-white" : "bg-gray-100 text-black"}`}>
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h1 className="text-xl font-bold truncate">CO2 Viewer: {project?.modelName || "Loading..."}</h1>
        <div className="flex items-center gap-2">
          <ThemeSwitch darkMode={darkMode} toggleTheme={toggleTheme} />
        </div>
      </header>
      <div className="flex-grow flex flex-row min-h-0 h-full relative">
        <LoadingModal darkMode={darkMode} progress={loadingProgress} show={isLoading} />

        <div ref={viewerContainerRef} className={`h-full relative overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-1/2' : 'w-full'}`}>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[min(100%-2rem,900px)] flex flex-wrap items-end gap-4 px-4 py-2 rounded-xl shadow-lg z-20
              ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
          >
            <div className="flex items-center gap-2">
              <Tooltip content="Focus" placement="top">
                <button
                  onClick={onFocus}
                  className={buttonClass(null)}
                >
                  <Focus size={20} />
                </button>
              </Tooltip>

              {/* Visibility Buttons */}
              <Tooltip content="Hide" placement="top">
                <button
                  onClick={onToggleVisibility}
                  className={buttonClass(null)}
                >
                  <EyeOff size={20} />
                </button>
              </Tooltip>
              <Tooltip content="Isolate Selection" placement="top">
                <button
                  onClick={onIsolate}
                  className={buttonClass(null)}
                >
                  <BoxSelect size={20} />
                </button>
              </Tooltip>
              <Tooltip content="Show All" placement="top">
                <button
                  onClick={onShow}
                  className={buttonClass(null)}
                >
                  <Eye size={20} />
                </button>
              </Tooltip>
              <Tooltip content="Ghost Mode" placement="top">
                <button
                  onClick={handleGhost}
                  className={`${buttonClass(null)} ${isGhost ? (darkMode ? "bg-purple-900" : "bg-purple-700") : ""}`}
                >
                  <Ghost size={20} />
                </button>
              </Tooltip>
              <Tooltip content="Color Shadows">
                <button
                  onClick={handleToggleColorShadows}
                  className={`${buttonClass(null)} ${isColorShadowsEnabled ? (darkMode ? "bg-purple-900" : "bg-purple-700") : ""}`}
                >
                  <Sun size={18} />
                </button>
              </Tooltip>

              {/* Tool Buttons */}
              <Tooltip content="Clipper" placement="top">
                <button
                  onClick={handleClipper}
                  className={buttonClass("clipper")}
                >
                  <Scissors size={20} />
                </button>
              </Tooltip>
              <div className="relative">
                <Tooltip content="Length Measurement" placement="top">
                  <button
                    onClick={handleLength}
                    className={buttonClass("length")}
                  >
                    <Ruler size={20} />
                  </button>
                </Tooltip>
                {renderOptionsPanel("length")}
              </div>
              <div className="relative">
                <Tooltip content="Area Measurement" placement="top">
                  <button
                    onClick={handleArea}
                    className={buttonClass("area")}
                  >
                    <Square size={20} />
                  </button>
                </Tooltip>
                {renderOptionsPanel("area")}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute -translate-y-1/2 z-50 p-1 shadow-md transition-all duration-200 md:block
            ${isSidebarOpen ? 'md:right-[50%] md:translate-x-[50%] bg-blue-500 hover:bg-blue-600 text-white' : 'md:right-[1%] md:-mr-4 bg-blue-500 hover:bg-blue-600 text-white'}
          `}
        >
          <span className="md:hidden">
            {isSidebarOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
          </span>
          <span className="hidden md:block">
            {isSidebarOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </span>
        </button>

        <div className={`h-full flex flex-col border-l ${darkMode ? 'border-gray-700' : 'border-gray-600'} transition-all duration-300 ${isSidebarOpen ? 'w-1/2' : 'w-0'}`} style={{ overflow: 'hidden' }}>
          <div className="flex-grow p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Material Data</h2>
              <Button onClick={() => setHistoryModalOpen(true)} size="sm" className="flex items-center gap-1">
                <ClipboardClock size={16} /> History
              </Button>
            </div>
            <MaterialDataTable
              rows={materials}
              setRows={setMaterials}
              expandedRows={expandedRows}
              setExpandedRows={setExpandedRows}
              darkMode={darkMode}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveChanges} color="primary">Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
      {isHistoryModalOpen && (
        <ElementHistoryModal
          onClose={() => setHistoryModalOpen(false)}
          history={history}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default CO2DetailContainer;