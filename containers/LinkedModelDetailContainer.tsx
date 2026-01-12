"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { List, ClipboardClock, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Focus, Eye, EyeOff, Pipette, Scissors, Ruler, Square, BoxSelect, Ghost, Sun } from "lucide-react";
import { Tabs, Tab } from "@heroui/react";
import { useAppContext } from "@/contexts/AppContext";
import { ThemeSwitch } from "@/components/theme-switch";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { Tooltip } from "@heroui/react";

type ItemProps = Record<string, any>;
type PsetDict = Record<string, Record<string, any>>;

const LinkedModelDetailContainer = () => {
  const params = useParams();
  const { id } = params;
  const { darkMode, toggleTheme } = useAppContext();
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const cameraRef = useRef<OBC.OrthoPerspectiveCamera | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const [attributes, setAttributes] = useState<ItemProps>({});
  const [psets, setPsets] = useState<PsetDict>({});
  const [elementName, setElementName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing viewer...");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGhost, setIsGhost] = useState(false);
  const [isColorShadowsEnabled, setIsColorShadowsEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<"clipper" | "length" | "area" | "colorize" | "collision" | "search" | "multi-select" | null>(null);
  const [lengthMode, setLengthMode] = useState<"free" | "edge">("free");
  const [areaMode, setAreaMode] = useState<"free" | "square">("free");

  const originalSelectStyle = useRef<any>(null);
  const originalColors  = useRef(new Map<
      FRAGS.BIMMaterial,
      { color: number; transparent: boolean; opacity: number }
    >());
  const clipperRef = useRef<OBC.Clipper | null>(null);
  const measurerRef = useRef<OBCF.LengthMeasurement | null>(null);
  const areaMeasurerRef = useRef<OBCF.AreaMeasurement | null>(null);
  const selectedColorRef = useRef<THREE.Color>(new THREE.Color(0xffc700));
  const restListener = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!viewerRef.current || !id) return;

    let components: OBC.Components;
    let renderer: OBCF.PostproductionRenderer;
    let camera: OBC.OrthoPerspectiveCamera;
    let fragments: OBC.FragmentsManager;

    const updateIfManualMode = () => {
      if (renderer && renderer.mode === OBC.RendererMode.MANUAL) {
        renderer.needsUpdate = true;
      }
    };

    const initViewer = async () => {
      try {
        components = new OBC.Components();
        componentsRef.current = components;
        
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        worldRef.current = world;
        const scene = new OBC.SimpleScene(components);
        world.scene = scene;
        scene.setup();
        scene.three.background = null;
        
        renderer = new OBCF.PostproductionRenderer(components, viewerRef.current!);
        world.renderer = renderer;
        
        camera = new OBC.OrthoPerspectiveCamera(components);
        world.camera = camera;
        await camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
        cameraRef.current = camera; // Store camera in ref
        camera.updateAspect();

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

        fragments = components.get(OBC.FragmentsManager);
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
        
        renderer.onBeforeUpdate.add(() => {
          if (fragments) fragments.core.update();
        });

        camera.controls.addEventListener("update", () => {
          fragments.core.update(true);
        });

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

        highlighter.events.select.onHighlight.add(async (selection) => {
          console.log('Highlight selection (IDs only):', selection);

          // --- Start: Log detailed properties on click ---
          if (Object.keys(selection).length > 0) {
            const fragmentId = Object.keys(selection)[0];
            const model = fragmentsRef.current?.list.get(fragmentId);
            if (!model) return;
            const ids = Array.from(selection[fragmentId]);
            if (ids.length === 0) return;

            const firstItemId = ids[0];
            const [attrs] = await model.getItemsData([firstItemId], { attributesDefault: true });

            const psetsRaw = (await model.getItemsData([firstItemId], {
              attributesDefault: false,
              relations: { IsDefinedBy: { attributes: true, relations: true } },
            }))[0]?.IsDefinedBy as FRAGS.ItemData[] ?? [];

            const formattedPsets: PsetDict = {};
            for (const pset of psetsRaw) {
              const { Name: psetName, HasProperties } = pset as any;
              if (!(psetName && "value" in psetName && Array.isArray(HasProperties))) continue;
              const props: Record<string, any> = {};
              for (const prop of HasProperties) {
                const { Name, NominalValue } = prop || {};
                if (!(Name && "value" in Name && NominalValue && "value" in NominalValue)) continue;
                props[Name.value] = NominalValue.value;
              }
              formattedPsets[psetName.value] = props;
            }
            
            setAttributes(attrs ?? {});
            setPsets(formattedPsets);
            console.log(`Detailed properties for ${ids.length} element(s) in model ${fragmentId}:`, { attrs, formattedPsets });
          } else {
            setAttributes({});
            setPsets({});
          }
        });

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

        setLoadingMessage("Fetching model metadata...");
        const dataResponse = await fetch(`/api/link-data/${id}`);
        if (!dataResponse.ok) throw new Error("Failed to fetch model metadata.");
        const modelData = await dataResponse.json();
        const r2FileName = modelData.r2FileName;
        const currentElementName = modelData.originalFileName.split('@')[0] || "Linked Model";
        setElementName(currentElementName);

        setLoadingMessage("Downloading 3D model...");
        const downloadResponse = await fetch('/api/models/r2-upload/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: r2FileName }),
        });
        if (!downloadResponse.ok) throw new Error("Failed to get download URL for fragment.");
        const { signedUrl } = await downloadResponse.json();

        const modelResponse = await fetch(signedUrl);
        if (!modelResponse.ok) throw new Error("Failed to download fragment file.");
        const buffer = await modelResponse.arrayBuffer();

        setLoadingMessage("Loading model into viewer...");
        const model = await fragments.core.load(buffer, { modelId: `linked-model-${id}` });
        scene.three.add(model.object);

        setLoadingMessage("Extracting properties...");
        const itemIDs = await model.getItemsIdsWithGeometry();
        if (itemIDs.length > 0) {
          const firstItemId = itemIDs[0];
          const [attrs] = await model.getItemsData([firstItemId], { attributesDefault: true });

          const psetsRaw = (await model.getItemsData([firstItemId], {
            attributesDefault: false,
            relations: { IsDefinedBy: { attributes: true, relations: true } },
          }))[0]?.IsDefinedBy as FRAGS.ItemData[] ?? [];

          const formattedPsets: PsetDict = {};
          for (const pset of psetsRaw) {
            const { Name: psetName, HasProperties } = pset as any;
            if (!(psetName && "value" in psetName && Array.isArray(HasProperties))) continue;
            const props: Record<string, any> = {};
            for (const prop of HasProperties) {
              const { Name, NominalValue } = prop || {};
              if (!(Name && "value" in Name && NominalValue && "value" in NominalValue)) continue;
              props[Name.value] = NominalValue.value;
            }
            formattedPsets[psetName.value] = props;
          }
          
          setAttributes(attrs ?? {});
          setPsets(formattedPsets);
        }

        const box = new THREE.Box3().setFromObject(model.object);
        if (!box.isEmpty()) {
          camera.controls.fitToBox(box, true);
        }

        setIsLoading(false);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setIsLoading(false);
      }
    };

    initViewer();

    const resizeObserver = new ResizeObserver(() => {
      if (renderer && camera) {
        renderer.resize();
        camera.updateAspect();
      }
    });

    if (viewerRef.current) {
      resizeObserver.observe(viewerRef.current);
    }

    return () => {
      if (viewerRef.current) resizeObserver.unobserve(viewerRef.current);
      resizeObserver.disconnect();
      
      if (camera?.controls) {
        camera.controls.removeEventListener("update", updateIfManualMode);
      }
      if (renderer) {
        renderer.onResize.remove(updateIfManualMode);
      }

      components?.dispose();
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
        // colorizeRef.current.enabled = true; // Colorize is not needed for LinkedModelDetailContainer
        if (highlighter) {
          highlighter.enabled = true;
          highlighter.zoomToSelection = false;
          const style = highlighter.styles.get("select");
          if (style) {
            // setOriginalSelectStyle({ color: style.color.clone(), opacity: style.opacity }); // setOriginalSelectStyle is not needed for LinkedModelDetailContainer
            style.opacity = 0;
          }
        }
    } else {
        // No tool is active
        if (highlighter) {
            highlighter.zoomToSelection = true;
            // if (originalSelectStyle) { // originalSelectStyle is not needed for LinkedModelDetailContainer
            //   const style = highlighter.styles.get("select");
            //   if (style) {
            //     style.color.set(originalSelectStyle.color);
            //     style.opacity = originalSelectStyle.opacity;
            //   }
            //   setOriginalSelectStyle(null);
            // }
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
  }, [activeTool, componentsRef.current, worldRef.current]);

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

  const renderAttributes = (attrs: Record<string, any>) => {
    return Object.entries(attrs).map(([key, valueObj]) => {
      const actualValue = valueObj && typeof valueObj === 'object' && 'value' in valueObj ? valueObj.value : valueObj;
      return (
        <div key={key} className="grid grid-cols-3 gap-4 text-sm py-1 border-b border-gray-200 dark:border-gray-700 items-center">
          <div className="font-semibold truncate col-span-1">{key}</div>
          <div className="truncate col-span-2">{String(actualValue)}</div>
        </div>
      );
    });
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

  const onFocus = async () => {
    if (!worldRef.current || !cameraRef.current || !highlighterRef.current) return;
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

  const onToggleVisibility = async () => {
    if (!componentsRef.current) return;
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    const hider = componentsRef.current.get(OBC.Hider);
    if (!highlighter || !hider) return;

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

  return (
    <div className={`w-full h-dvh flex flex-col ${darkMode ? "dark bg-gray-900 text-white" : "bg-gray-100 text-black"}`}>
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h1 className="text-xl font-bold truncate">Element Viewer: {elementName}</h1>
        <div className="flex items-center gap-2">
          <ThemeSwitch darkMode={darkMode} toggleTheme={toggleTheme} />
        </div>
      </header>
      
      <div className="flex-grow flex flex-col min-h-0 h-full md:flex-row relative">
        <div ref={viewerRef} className={`relative w-full overflow-hidden md:h-full ${isSidebarCollapsed ? 'h-full md:w-full' : ' h-1/2 md:w-1/2'} md:flex-grow transition-all duration-300`}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="text-center">
                <Loader2 className="animate-spin h-8 w-8 text-white mx-auto mb-2" />
                <p>{loadingMessage}</p>
              </div>
            </div>
          )}
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
              <Tooltip content="Color Shadows">
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
        
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute -translate-y-1/2 z-50 p-1 shadow-md transition-all duration-200 md:block
            ${isSidebarCollapsed ? 'md:right-[1%] md:-mr-4 bg-blue-500 hover:bg-blue-600 text-white' : 'md:right-[50%] md:translate-x-[50%] bg-blue-500 hover:bg-blue-600 text-white'}
          `}
        >
          <span className="md:hidden">
            {isSidebarCollapsed ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </span>
          <span className="hidden md:block">
            {isSidebarCollapsed ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </span>
        </button>

        <div className={`p-4 w-full overflow-y-auto flex-grow h-full flex flex-col ${isSidebarCollapsed ? 'md:w-0 hidden' : 'md:w-1/2'} transition-all duration-200`}>
          <div>
            <div className="flex w-full flex-col flex-shrink-0">
              <Tabs
                aria-label="Options"
                selectedKey="properties"
                classNames={{
                  tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                  cursor: "w-full bg-blue-500",
                  tab: "max-w-fit px-0 h-12",
                  tabContent: "group-data-[selected=true]:text-blue-500",
                }}
                color="primary"
                variant="underlined"
              >
                <Tab
                  key="properties"
                  title={
                    <div className="flex items-center space-x-2">
                      <List />
                      <span>Properties</span>
                    </div>
                  }
                />
                <Tab key="issues" title={<div className="flex items-center space-x-2"><ClipboardClock /><span>Issues</span></div>} isDisabled />
                <Tab key="epd" title={<div className="flex items-center space-x-2"><ClipboardClock /><span>EPD</span></div>} isDisabled />
              </Tabs>
            </div>
            <div className="pt-4 flex-grow h-full overflow-y-auto min-h-0">
              {error && <p className="text-red-500">Error: {error}</p>}
              {!isLoading && !error && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-md mb-2 pb-1 border-b">Attributes</h3>
                    <div className="space-y-1">{renderAttributes(attributes)}</div>
                  </div>
                  {Object.keys(psets).length > 0 && (
                    <div>
                      <h3 className="font-bold text-md mb-2 border-b pb-1">Property Sets</h3>
                      {Object.entries(psets).map(([psetName, psetAttrs]) => (
                        <div key={psetName} className="mb-4">
                          <h4 className="font-semibold text-sm italic mb-2">{psetName}</h4>
                          <div className="space-y-1 pl-4">{renderAttributes(psetAttrs)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedModelDetailContainer;