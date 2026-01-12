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
import HomePanel from "@/components/IFCViewer/HomePanel";
import FloorPlan from "@/components/IFCViewer/FloorPlan";
import AssetsPanel from "@/components/IFCViewer/AssetsPanel";
import ShadowScenePanel from "@/components/IFCViewer/ShadowScenePanel";
import SearchPanel from "@/components/IFCViewer/SearchPanel";

type ItemProps = Record<string, any>;
type PsetDict = Record<string, Record<string, any>>;

const MobileViewerContainer = () => {
  const { uploadedModels, setUploadedModels, viewerApi, darkMode, toggleTheme, user, setUser, isLoggedIn, setIsLoggedIn } = useAppContext();
  const viewerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const cameraRef = useRef<OBC.OrthoPerspectiveCamera | null>(null);
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

  const [activeTool, setActiveTool] = useState<"clipper" | "length" | "area" | "multi-select" | null>(null);
  const [isGhost, setIsGhost] = useState(false);
  const [isShadowed, setIsShadowed] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isShadowPanelOpen, setIsShadowPanelOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedLocalId, setSelectedLocalId] = useState<number | null>(null);
  const [lengthMode, setLengthMode] = useState<"free" | "edge">("free");
  const [areaMode, setAreaMode] = useState<"free" | "square">("free");

  // States for Side Panel
  type PanelType = 'home' | 'floor' | 'assets';
  const [selectedSidePanel, setSelectedSidePanel] = useState<PanelType>('home');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);

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
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [isLoggedIn]);

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

      const renderer = new OBCF.PostproductionRenderer(components, viewerRef.current!);
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
      });

      const clipper = components.get(OBC.Clipper);
      clipper.enabled = false;
      clipperRef.current = clipper;

      components.get(OBC.Hider); // Initialize Hider
      components.get(OBC.ItemsFinder);

      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
      const workerUrl = URL.createObjectURL(workerFile);

      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);
      fragmentsRef.current = fragments;

      camera.controls.addEventListener("update", () => {
        fragments.core.update(true);
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

    if (componentsRef.current && isLoggedIn && fragmentsRef.current && fragmentsRef.current.list.size === 0) {
      loadModelFromR2();
    }
  }, [components, isLoggedIn]);

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

  const handleGhost = () => {
    if (!components) return;

    if (isGhost) {
      restoreModelMaterials();
      setIsGhost(false);
    } else {
      setModelTransparent(components);
      setIsGhost(true);
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
        {/* {selectedSidePanel === 'home' && components &&
          <HomePanel
            components={components}
            darkMode={darkMode}
            onClose={() => setIsSidePanelOpen(false)}
            onToggleAddMode={() => {}}
            onSearchResults={() => {}}
          />} */}
        {selectedSidePanel === 'home' && components &&
          <SearchPanel
            components={components}
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