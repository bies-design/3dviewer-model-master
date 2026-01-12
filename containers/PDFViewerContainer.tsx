"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Focus, Eye, EyeOff, Sun, Scissors, Ruler, Square, BoxSelect, Ghost } from "lucide-react";
import { Viewer, Worker, RotateDirection } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { useAppContext } from "@/contexts/AppContext";
import { ThemeSwitch } from "@/components/theme-switch";
import LoadingModal from "@/components/IFCViewer/LoadingModal";
import { toolbarPlugin, ToolbarSlot } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { Tooltip } from "@heroui/react";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";

// PDF worker URL
const workerUrl = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const PDFViewerContainer = () => {
  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;

  const zoomPluginInstance = zoomPlugin();
  const { zoomTo } = zoomPluginInstance;

  const params = useParams();
  const { id } = params;
  const { darkMode, toggleTheme } = useAppContext();
  
  // State for PDF Viewer
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");


  // State for Loading Modal
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Refs for PDF Panning
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Refs for 3D Viewer
  const viewerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const cameraRef = useRef<OBC.OrthoPerspectiveCamera | null>(null);
  const clipperRef = useRef<OBC.Clipper | null>(null);
  const measurerRef = useRef<OBCF.LengthMeasurement | null>(null);
  const areaMeasurerRef = useRef<OBCF.AreaMeasurement | null>(null);
  const colorizeRef = useRef<{ enabled: boolean }>({ enabled: false });
  const selectedColorRef = useRef<string>("#ffa500");

  // States for ActionButtons
  const [isGhost, setIsGhost] = useState(false);
  const [isColorShadowsEnabled, setIsColorShadowsEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<"clipper" | "length" | "area" | "colorize" | "collision" | "search" | "multi-select" | null>(null);
  const [lengthMode, setLengthMode] = useState<"free" | "edge">("free");
  const [areaMode, setAreaMode] = useState<"free" | "square">("free");
  const [originalSelectStyle, setOriginalSelectStyle] = useState<any>(null);
  const originalColors  = useRef(new Map<
    FRAGS.BIMMaterial,
    { color: number; transparent: boolean; opacity: number }
  >());
  
  useEffect(() => {
    if (!viewerRef.current || !id) return;

    let components: OBC.Components;
    let renderer: OBCF.PostproductionRenderer;
    let progressInterval: NodeJS.Timeout;

    const updateIfManualMode = () => {
      if (renderer && renderer.mode === OBC.RendererMode.MANUAL) {
        renderer.needsUpdate = true;
      }
    };

    const initAndLoad = async () => {
      try {
        // 1. Initialize Viewer Components
        components = new OBC.Components();
        componentsRef.current = components; // Store components in ref
        
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        worldRef.current = world;
        
        const scene = new OBC.SimpleScene(components);
        world.scene = scene;
        scene.setup();
        scene.three.background = null;
        
        renderer = new OBCF.PostproductionRenderer(components, viewerRef.current!);
        world.renderer = renderer;
        
        const camera = new OBC.OrthoPerspectiveCamera(components);
        world.camera = camera;
        await camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
        cameraRef.current = camera; // Store camera in ref
        
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

        const fragments = components.get(OBC.FragmentsManager);
        fragmentsRef.current = fragments; // Store fragments in ref
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

        const highlighter = components.get(OBCF.Highlighter);
        highlighter.setup({ world });
        highlighter.zoomToSelection = true;
        highlighter.enabled = true;
        highlighterRef.current = highlighter; // Store highlighter in ref

        // Add Hider, Clipper, Measurer, and AreaMeasurer
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

        // 2. Fetch PDF and find corresponding model using the new API
        const metaResponse = await fetch(`/api/document-data/${id}`);
        if (!metaResponse.ok) throw new Error(`Failed to fetch document metadata: ${metaResponse.statusText}`);
        const metaData = await metaResponse.json();
        const originalPdfName = metaData.originalFileName || "";
        setFileName(originalPdfName);
        setPdfUrl(`/api/document-proxy/${id}`);

        if (originalPdfName) {
          const correspondingIfcName = originalPdfName.replace(/\.pdf$/i, '.ifc');
          
          const modelDataResponse = await fetch(`/api/models/find-by-filename?fileName=${encodeURIComponent(correspondingIfcName)}`);
          
          if (modelDataResponse.ok) {
            const modelItem = await modelDataResponse.json();
            
            if (modelItem && modelItem.r2FileName) {
              setIsLoading(true);
              setLoadingProgress(0);

              let simulatedProgress = 0;
              progressInterval = setInterval(() => {
                simulatedProgress += Math.random() * 9;
                if (simulatedProgress >= 98) simulatedProgress = 98;
                setLoadingProgress(Math.floor(simulatedProgress));
              }, 200);

              // 3. Download and load the model
              const downloadResponse = await fetch('/api/models/r2-upload/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: modelItem.r2FileName }),
              });
              if (!downloadResponse.ok) throw new Error("Failed to get download URL for fragment.");
              const { signedUrl } = await downloadResponse.json();

              const modelResponse = await fetch(signedUrl);
              if (!modelResponse.ok) throw new Error("Failed to download fragment file.");
              
              setLoadingMessage("Loading Model into Viewer...");
              const buffer = await modelResponse.arrayBuffer();

              const model = await fragments.core.load(buffer, { modelId: `model-${id}` });
              scene.three.add(model.object);

              // 4. Fit camera to the loaded model, with a short delay
              setTimeout(() => {
                const box = new THREE.Box3().setFromObject(model.object);
                if (!box.isEmpty()) {
                  camera.controls.fitToBox(box, true);
                }
              }, 250);
              
              clearInterval(progressInterval);
              setLoadingProgress(100);
              setTimeout(() => setIsLoading(false), 500);

            } else {
              console.warn(`Model data found, but r2FileName is missing for: ${correspondingIfcName}`);
            }
          } else {
            console.warn(`No corresponding model found for ${correspondingIfcName}. Status: ${modelDataResponse.status}`);
          }
        }

        const resizeObserver = new ResizeObserver(() => {
            renderer.resize();
            camera.updateAspect();
        });
        resizeObserver.observe(viewerRef.current!);

        return () => {
          if (viewerRef.current) resizeObserver.unobserve(viewerRef.current);
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
        console.error("Error during initialization and loading:", err);
        setPdfError(err instanceof Error ? err.message : "An unknown error occurred");
        clearInterval(progressInterval);
        setIsLoading(false);
      }
    };

    const cleanup = initAndLoad();

    return () => {
      clearInterval(progressInterval);
      cleanup.then(dispose => dispose && dispose());
    };
  }, [id]);

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
    if (!componentsRef.current || !worldRef.current) return;
    const components = componentsRef.current;
    const world = worldRef.current;
    const highlighter = components.get(OBCF.Highlighter);

    // This part is the "setup" for the current activeTool
    if (activeTool === "clipper") {
        if (clipperRef.current) clipperRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "length") {
        if (!measurerRef.current) {
            const length = components.get(OBCF.LengthMeasurement);
            length.world = world;
            length.color = new THREE.Color("#494cb6");
            measurerRef.current = length;
        }
        measurerRef.current.enabled = true;
        if (highlighter) highlighter.enabled = false;
    } else if (activeTool === "area") {
        if (!areaMeasurerRef.current) {
            const area = components.get(OBCF.AreaMeasurement);
            area.world = world;
            area.color = new THREE.Color("#494cb6");
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
  }, [activeTool, componentsRef.current, worldRef.current, originalSelectStyle]);

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
    const root = pdfContainerRef.current;
    if (!root) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    const getScrollEl = (fromTarget: HTMLElement | null) => {
      const viewerRoot = fromTarget?.closest(".rpv-core__viewer") as HTMLElement | null;

      const inner =
        viewerRoot?.querySelector(".rpv-core__inner-pages") as HTMLElement | null;

      const candidate = inner || viewerRoot || root;

      const findScrollable = (el: HTMLElement | null) => {
        while (el) {
          const style = window.getComputedStyle(el);
          const canScrollY = /(auto|scroll)/.test(style.overflowY);
          const canScrollX = /(auto|scroll)/.test(style.overflowX);
          if ((canScrollY || canScrollX) && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
            return el;
          }
          el = el.parentElement;
        }
        return root;
      };

      return findScrollable(candidate);
    };

    let scrollEl: HTMLElement | null = null;

    const isInPdfViewer = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return false;
      if (root.contains(el)) return true;
      return !!el.closest(".rpv-core__viewer");
    };

    const onMouseDownCapture = (e: MouseEvent) => {
      if (e.button !== 2) return;
      if (!isInPdfViewer(e)) return;

      e.preventDefault();

      const target = e.target as HTMLElement | null;
      scrollEl = getScrollEl(target);

      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = scrollEl.scrollLeft;
      startScrollTop = scrollEl.scrollTop;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning || !scrollEl) return;

      scrollEl.scrollLeft = startScrollLeft - (e.clientX - startX);
      scrollEl.scrollTop  = startScrollTop  - (e.clientY - startY);
    };

    const onMouseUp = () => {
      isPanning = false;
      scrollEl = null;
    };

    const onContextMenuCapture = (e: MouseEvent) => {
      if (!isInPdfViewer(e)) return;
      e.preventDefault();
    };

    window.addEventListener("mousedown", onMouseDownCapture, true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onContextMenuCapture, true);

    return () => {
      window.removeEventListener("mousedown", onMouseDownCapture, true);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("contextmenu", onContextMenuCapture, true);
    };
  }, [pdfUrl]);

  useEffect(() => {
    const root = pdfContainerRef.current;
    if (!root || !pdfUrl) return;

    let currentScale = 1;
    const minScale = 0.25;
    const maxScale = 4;
    const step = 0.1;

    const clamp = (v: number) => Math.min(maxScale, Math.max(minScale, v));

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || (!root.contains(target) && !target.closest(".rpv-core__viewer"))) return;

      e.preventDefault();

      const dir = e.deltaY < 0 ? 1 : -1;
      currentScale = clamp(currentScale + dir * step);
      zoomTo(currentScale);
    };
    
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel as any);
    };
  }, [pdfUrl, zoomTo]);

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
          // Assuming lodColor exists if color doesn't
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

  // const handleMouseEnter = () => {
  //   if (!componentsRef.current) return;
  //   if (activeTool === "length" && measurerRef.current?.enabled) {
  //     measurerRef.current.delete();
  //   } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
  //     areaMeasurerRef.current.delete();
  //   }
  // };

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

  const onShow = async () => {
    if (!componentsRef.current) return;
    const hider = componentsRef.current.get(OBC.Hider);
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    if (hider) {
      await hider.set(true); // Show all elements
    }
    if (highlighter) {
      await highlighter.clear(); // Clear all highlights
    }
  };

  function renderPdfError() {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <p>{pdfError}</p>
      </div>
    );
  }

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

  const handleClipper = () => {
    setActiveTool(prev => prev === "clipper" ? null : "clipper");
  };

  const handleLength = () => {
    setActiveTool(prev => prev === "length" ? null : "length");
  };

  const handleArea = () => {
    setActiveTool(prev => prev === "area" ? null : "area");
  };

  const renderOptionsPanel = (tool: "length" | "area") => {
    if (activeTool !== tool) return null;

    const panelBaseClasses = `absolute bottom-full mb-2 w-max p-2 rounded-xl shadow-lg flex flex-col items-center gap-2 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-black"}`;

    switch (tool) {
      case "length":
        return (
          <div className={`${panelBaseClasses} left-1/2 -translate-x-1/2`}>
            <span className="text-sm font-semibold">Length Mode</span>
            <div className="flex gap-2">
              <button onClick={() => setLengthMode("free")} className={`px-2 py-1 text-xs rounded ${lengthMode === 'free' ? 'bg-blue-500' : 'bg-gray-600'}`}>Free</button>
              <button onClick={() => setLengthMode("edge")} className={`px-2 py-1 text-xs rounded ${lengthMode === 'edge' ? 'bg-blue-500' : 'bg-gray-600'}`}>Edge</button>
            </div>
          </div>
        );
      case "area":
        return (
          <div className={`${panelBaseClasses} left-1/2 -translate-x-1/2`}>
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


  function renderPdfLoader() {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-lg">Loading document...</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-dvh flex flex-col overflow-hidden ${darkMode ? "dark bg-gray-900 text-white" : "bg-gray-100 text-black"}`}>
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h1 className="text-xl font-bold truncate">Document Viewer: {fileName}</h1>
        <div className="flex items-center gap-2">
          <ThemeSwitch darkMode={darkMode} toggleTheme={toggleTheme} />
        </div>
      </header>
      <div className="flex-grow flex flex-row min-h-0 h-full relative">
        <LoadingModal darkMode={darkMode} progress={loadingProgress} show={isLoading} />

        <div ref={viewerRef} className="w-1/2 h-full relative overflow-hidden">
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[min(100%-2rem,900px)] flex flex-wrap items-end gap-4 px-4 py-2 rounded-xl shadow-lg z-20
              ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
          >
            <div className="flex items-center gap-2">
              <Tooltip content="Focus">
                <button onClick={onFocus} className={buttonClass(null)}>
                  <Focus size={18} />
                </button>
              </Tooltip>
              <Tooltip content="Hide">
                <button onClick={onToggleVisibility} className={buttonClass(null)}>
                  <EyeOff size={18} />
                </button>
              </Tooltip>
              <Tooltip content="Isolate Selection">
                <button onClick={onIsolate} className={buttonClass(null)}>
                  <BoxSelect size={18} />
                </button>
              </Tooltip>
              <Tooltip content="Show All">
                <button onClick={onShow} className={buttonClass(null)}>
                  <Eye size={18} />
                </button>
              </Tooltip>
              <Tooltip content="Ghost Mode">
                <button
                  onClick={handleGhost}
                  className={`${buttonClass(null)} ${isGhost ? (darkMode ? "bg-purple-900" : "bg-purple-700") : ""}`}
                >
                  <Ghost size={18} />
                </button>
              </Tooltip>
              <Tooltip content="Toggle Color Shadows">
                <button
                  onClick={handleToggleColorShadows}
                  className={`${buttonClass(null)} ${isColorShadowsEnabled ? (darkMode ? "bg-purple-900" : "bg-purple-700") : ""}`}
                >
                  <Sun size={18} />
                </button>
              </Tooltip>
              <Tooltip content="Clipper">
                <button onClick={handleClipper} className={buttonClass("clipper")}>
                  <Scissors size={18} />
                </button>
              </Tooltip>
              <div className="relative">
                <Tooltip content="Length Measurement">
                  <button onClick={handleLength} className={buttonClass("length")}>
                    <Ruler size={18} />
                  </button>
                </Tooltip>
                {renderOptionsPanel("length")}
              </div>
              <div className="relative">
                <Tooltip content="Area Measurement">
                  <button onClick={handleArea} className={buttonClass("area")}>
                    <Square size={18} />
                  </button>
                </Tooltip>
                {renderOptionsPanel("area")}
              </div>
            </div>
          </div>
        </div>

        <div className={`w-1/2 h-full flex flex-col border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex-grow relative flex flex-col h-full">
            {pdfError && renderPdfError()}
            {!pdfError && !pdfUrl && renderPdfLoader()}
            {pdfUrl && (
              <>
                <div className="flex-shrink-0 z-10 bg-gray-200">
                  <Toolbar>
                    {(props: ToolbarSlot) => {
                      const {
                        CurrentPageInput,
                        Download,
                        EnterFullScreen,
                        GoToNextPage,
                        GoToPreviousPage,
                        NumberOfPages,
                        Print,
                        Rotate,
                        ZoomIn,
                        ZoomOut,
                      } = props;
                      return (
                        <div className="flex items-center justify-between w-full p-1 text-black">
                          <div className="flex items-center">
                            <div className="p-1"><GoToPreviousPage /></div>
                            <div className="px-2 flex items-center">
                              <CurrentPageInput /> / <NumberOfPages />
                            </div>
                            <div className="p-1"><GoToNextPage /></div>
                          </div>
                          <div className="flex items-center">
                            <div className="p-1"><ZoomOut /></div>
                            <div className="p-1"><ZoomIn /></div>
                            <div className="p-1"><Rotate direction={RotateDirection.Forward} /></div>
                            <div className="p-1"><Rotate direction={RotateDirection.Backward} /></div>
                          </div>
                          <div className="flex items-center">
                            <div className="p-1"><EnterFullScreen /></div>
                            <div className="p-1"><Download /></div>
                            <div className="p-1"><Print /></div>
                          </div>
                        </div>
                      );
                    }}
                  </Toolbar>
                </div>
                <div ref={pdfContainerRef} className="flex-grow h-full overflow-y-auto">
                  <Worker workerUrl={workerUrl}>
                    <Viewer
                      fileUrl={pdfUrl}
                      plugins={[toolbarPluginInstance, zoomPluginInstance]}
                      renderLoader={() => renderPdfLoader()}
                    />
                  </Worker>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewerContainer;