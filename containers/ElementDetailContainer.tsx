"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Plus, List, ClipboardClock, LogIn, LogOut, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Focus, Eye } from "lucide-react";
import { Tabs, Tab, Chip, Button } from "@heroui/react";
import { useAppContext } from "@/contexts/AppContext";
import { ThemeSwitch } from "@/components/theme-switch";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import ElementHistoryModal from "@/components/IFCViewer/ElementHistoryModal";
import IssueManager from "@/components/IFCViewer/IssueManager";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import { viewerApi } from "@/lib/viewer-api";

type PsetDict = Record<string, Record<string, any>>;

type ElementData = {
  modelId: string;
  expressID: number;
  attributes: Record<string, any>;
  psets: Record<string, any>;
};

type History = {
  id: string;
  user: string;
  timestamp: string;
  changes: Record<string, { oldValue: any; newValue: any }>;
};

const ElementDetailContainer = () => {
  const params = useParams();
  const router = useRouter();
  const { modelId: modelIdParam, expressId: id } = params;
  const { darkMode, toggleTheme, isLoggedIn, showLoginModal, setShowLoginModal, showRegisterModal, setShowRegisterModal, setIsLoggedIn, setUser, user, setToast, isLoadingUser } = useAppContext();
  
  const modelId = Array.isArray(modelIdParam) ? modelIdParam[0] : modelIdParam;

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setUser(null);
  };

  const viewerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const [elementData, setElementData] = useState<ElementData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing viewer...");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingKeyTemp, setEditingKeyTemp] = useState<string>(""); // New state for temporary key editing
  const [history, setHistory] = useState<History[]>([]);
  const [originalAttributes, setOriginalAttributes] = useState<Record<string, any> | null>(null);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("properties");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // New state for sidebar collapse
  const [isIsolated, setIsIsolated] = useState(false);

  useEffect(() => {
    if (!viewerRef.current || !modelId || !id) return;

    let components: OBC.Components;
    let world: OBC.World;

    const initViewer = async () => {
      try {
        components = new OBC.Components();
        componentsRef.current = components;
        
        const worlds = components.get(OBC.Worlds);
        world = worlds.create();
        worldRef.current = world;
        const scene = new OBC.SimpleScene(components);
        world.scene = scene;
        scene.setup();
        scene.three.background = null;
        
        const renderer = new OBCF.PostproductionRenderer(components, viewerRef.current!);
        world.renderer = renderer;

        const camera = new OBC.OrthoPerspectiveCamera(components);
        world.camera = camera;
        await camera.controls.setLookAt(3, 3, 3, 0, 0, 0);
        camera.updateAspect();
        
        await components.init();

        viewerApi.init(components, world);

        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
        });

        const fragments = components.get(OBC.FragmentsManager);
        const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedUrl = await fetch(githubUrl);
        const workerBlob = await fetchedUrl.blob();
        const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
        const workerUrl = URL.createObjectURL(workerFile);
        await fragments.init(workerUrl);

        camera.controls.addEventListener("update", () => {
          fragments.core.update(true);
        });

        fragments.list.onItemSet.add(({ value: model }) => {
          const cam = world.camera as OBC.OrthoPerspectiveCamera;
          model.useCamera(cam.three);
          world.scene.three.add(model.object);
          fragments.core.update(true);
          setTimeout(async () => {
              if (cam) {
                //cam.fitToItems();
                await onFocus();
              }
          }, 1200);
        });

        // const grids = components.get(OBC.Grids);
        // const grid = grids.create(world);

        const highlighter = components.get(OBCF.Highlighter);
        highlighter.setup({ world });
        components.get(OBC.Hider);
        components.get(OBC.ItemsFinder);

        setLoadingMessage("Downloading 3D model...");
        const downloadResponse = await fetch('/api/models/r2-upload/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: `models/${modelId}` }),
        });

        if (!downloadResponse.ok) {
          throw new Error(`Failed to get signed URL: ${downloadResponse.statusText}`);
        }
        const { signedUrl } = await downloadResponse.json();
        const modelResponse = await fetch(signedUrl);
        if (!modelResponse.ok) {
          throw new Error(`Failed to download model from R2: ${modelResponse.statusText}`);
        }

        setLoadingMessage("Loading model into viewer...");
        const buffer = await modelResponse.arrayBuffer();
        const model = await fragments.core.load(buffer, { modelId });
        fragments.list.set(model.modelId, model);
        scene.three.add(model.object);

        let expressIdToUse: number;
        let elementProps: any;

        if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
          setLoadingMessage("Fetching element data by ID...");
          const elementResponse = await fetch(`/api/elements/${id}`);
          if (!elementResponse.ok) throw new Error("Failed to fetch element data by ID");
          const elementData = await elementResponse.json();
          expressIdToUse = elementData.expressID;
          elementProps = elementData.attributes;
        } else {
          expressIdToUse = parseInt(id as string, 10);
          const [props] = await model.getItemsData([expressIdToUse], { attributesDefault: true });
          elementProps = props;
        }

        if (isNaN(expressIdToUse)) throw new Error("Invalid element ID");

        const psetsRaw = await getItemPsets(model, expressIdToUse);
        const psets = formatItemPsets(psetsRaw);
        
        let fetchedElementData;
        if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
          const elementResponse = await fetch(`/api/elements/${id}`);
          fetchedElementData = await elementResponse.json();
        }

        setElementData({
          modelId: model.modelId,
          expressID: expressIdToUse,
          attributes: fetchedElementData?.attributes || elementProps || {},
          psets: psets || {}
        });
        setOriginalAttributes(JSON.parse(JSON.stringify(fetchedElementData?.attributes || elementProps || {})));
        setHistory(fetchedElementData?.history || []);

        setTimeout(async () => {
          const selection = { [model.modelId]: new Set([expressIdToUse]) };

          await viewerApi.setModelTransparent(0.2);

          await highlighter.highlightByID("select", selection, true, true);

          const hiderInstance = components.get(OBC.Hider);
          await hiderInstance.set(true, selection);

          highlighter.enabled = false;

          setLoadingMessage("Focusing on element...");
          setIsLoading(false);
        }, 100);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setIsLoading(false);
      }
    };

    initViewer();

    const resizeObserver = new ResizeObserver(() => {
      if(components && viewerRef.current) {
        const renderer = world.renderer as OBCF.PostproductionRenderer;
        if (renderer) {
          renderer.resize();
        }
        const camera = world.camera as OBC.OrthoPerspectiveCamera;
        if (camera) {
          camera.updateAspect();
        }
      }
    });

    if (viewerRef.current) {
      resizeObserver.observe(viewerRef.current);
    }

    return () => {
      if (viewerRef.current) {
        resizeObserver.unobserve(viewerRef.current);
      }
      resizeObserver.disconnect();
      if (components) {
        components.dispose();
        viewerApi.restoreModelMaterials();
      }
    };
  }, [modelId, id]);

  const getItemPsets = async (model: FRAGS.FragmentsModel, localId: number) => {
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

  const handleAttributeChange = (key: string, value: any, isKeyChange = false) => {
    if (!elementData) return;

    if (isKeyChange) {
      const newAttributes: Record<string, any> = {};
      Object.entries(elementData.attributes).forEach(([oldKey, attrValue]) => {
        if (oldKey === key) {
          newAttributes[value] = attrValue;
        } else {
          newAttributes[oldKey] = attrValue;
        }
      });
      setElementData({ ...elementData, attributes: newAttributes });
    } else {
      setElementData({
        ...elementData,
        attributes: {
          ...elementData.attributes,
          [key]: { ...elementData.attributes[key], value },
        },
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!elementData || !originalAttributes) return;

    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    const allKeys = new Set([...Object.keys(originalAttributes), ...Object.keys(elementData.attributes)]);

    allKeys.forEach(key => {
      const oldValue = originalAttributes[key];
      const newValue = elementData.attributes[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          oldValue: oldValue?.value ?? oldValue,
          newValue: newValue?.value ?? newValue,
        };
      }
    });

    if (Object.keys(changes).length === 0) {
      console.log("No changes to save.");
      return;
    }

    try {
      const response = await fetch(`/api/elements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: elementData.attributes,
          history: {
            user: user?.username || "current_user",
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
      setOriginalAttributes(JSON.parse(JSON.stringify(elementData.attributes)));
      setToast({ message: "Properties updated successfully!", type: "success" });
      const newHistoryEntry: History = {
        id: new Date().toISOString(),
        user: user?.username || "current_user",
        timestamp: new Date().toISOString(),
        changes,
      };
      setHistory(prevHistory => [newHistoryEntry, ...prevHistory]);

    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  const handleAddAttribute = () => {
    if (!elementData) return;
    let i = 0;
    let newKey = "newAttribute";
    while (`${newKey}${i}` in elementData.attributes) {
      i++;
    }
    newKey = `${newKey}${i}`;

    setElementData({
      ...elementData,
      attributes: {
        ...elementData.attributes,
        [newKey]: { value: "newValue", type: "USER_DEFINED" },
      },
    });
  };

  const renderAttributes = (attrs: Record<string, any>) => {
    const editableFields = ["Name", "ObjectType", "PredefinedType"];

    const handleEditClick = (key: string, isKey = false) => {
      if (isKey) {
        setEditingKey(key);
        setEditingKeyTemp(key);
        setEditingField(null);
      } else {
        setEditingField(key);
        setEditingKey(null);
        setEditingKeyTemp("");
      }
    };

    const handleKeyUpdate = (oldKey: string, newKey: string) => {
      if (oldKey !== newKey) {
        handleAttributeChange(oldKey, newKey, true);
      }
      setEditingKey(null);
      setEditingKeyTemp("");
    };

    return Object.entries(attrs).map(([key, valueObj]) => {
      const actualValue = valueObj && typeof valueObj === 'object' && 'value' in valueObj ? valueObj.value : valueObj;
      const isPredefinedEditable = editableFields.includes(key);
      const isUserDefined = valueObj?.type === "USER_DEFINED";

      return (
        <div key={key} className="grid grid-cols-3 gap-4 text-sm py-1 border-b border-gray-200 dark:border-gray-700 items-center">
          <div className="font-semibold truncate col-span-1 flex items-center justify-between">
            {editingKey === key && isUserDefined ? (
              <input
                type="text"
                value={editingKeyTemp}
                onChange={(e) => setEditingKeyTemp(e.target.value)}
                onBlur={() => handleKeyUpdate(key, editingKeyTemp)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleKeyUpdate(key, editingKeyTemp);
                  } else if (e.key === "Escape") {
                    setEditingKey(null);
                    setEditingKeyTemp("");
                  } else {
                    e.stopPropagation();
                  }
                }}
                autoFocus
                className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="truncate">{key}</span>
            )}
            {isUserDefined && editingKey !== key && (
              <button onClick={() => handleEditClick(key, true)} className="ml-2 text-gray-400 hover:text-gray-600">
                <Pencil size={14} />
              </button>
            )}
          </div>
          <div className="truncate col-span-2 flex items-center justify-between">
            {editingField === key && (isPredefinedEditable || isUserDefined) ? (
              <input
                type="text"
                value={actualValue}
                onChange={(e) => handleAttributeChange(key, e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingField(null);
                  } else if (e.key === "Escape") {
                    setEditingField(null);
                  } else {
                    e.stopPropagation();
                  }
                }}
                autoFocus
                className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="truncate">{String(actualValue)}</span>
            )}
            {(isPredefinedEditable || isUserDefined) && editingField !== key && (
              <button onClick={() => handleEditClick(key)} className="ml-2 text-blue-500 hover:text-blue-700">
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  const onFocus = async () => {
    if (!componentsRef.current) return;
    const camera = worldRef.current?.camera as OBC.OrthoPerspectiveCamera;
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    if (!camera || !highlighter) return;

    const selection = highlighter.selection.select;
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
      await camera.fitToItems(selection);
    } else {
      await camera.fitToItems();
    }
  };

  const onIsolate = async () => {
    if (!componentsRef.current || !elementData) return;
    const highlighter = componentsRef.current.get(OBCF.Highlighter);
    const hiderInstance = componentsRef.current.get(OBC.Hider);
    const fragments = componentsRef.current.get(OBC.FragmentsManager);
    if (!highlighter || !hiderInstance) return;

    const model = componentsRef.current.get(OBC.FragmentsManager).list.get(elementData.modelId);
    if (!model) return;

    const selection = { [elementData.modelId]: new Set([elementData.expressID]) };

    if (isIsolated) {
      // Restore all models
      await hiderInstance.set(true); 
      // Show the isolated element
      await viewerApi.setModelTransparent(0.2); // Restore transparency
      await highlighter.highlightByID("select", selection, true, true);
      highlighter.enabled = false;
      setIsIsolated(false);
    } else {
      // Isolate the selected element   
      await hiderInstance.set(false);
      await hiderInstance.set(true, selection);
      await viewerApi.restoreModelMaterials();
      highlighter.enabled = true;
      await fragments.core.update(true);
      await highlighter.clear("select");
      setIsIsolated(true);
    }
  };

  return (
    <div className={`w-full h-dvh flex flex-col ${darkMode ? "dark bg-gray-900 text-white" : "bg-gray-100 text-black"}`}>
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h1 className="text-xl font-bold truncate max-w-[calc(100%-150px)] sm:max-w-none">Element Viewer: {elementData?.attributes?.Name?.value || id}</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isLoggedIn && user ? (
            <span className="text-sm font-medium truncate max-w-[100px] sm:max-w-none hidden sm:block">{user.username}</span>
          ) : null}
          <ThemeSwitch darkMode={darkMode} toggleTheme={toggleTheme} />
          {isLoggedIn ? (
            <Button onClick={handleLogout} color="danger" size="sm" className="flex items-center text-xs">
              <LogOut size={16} />
            </Button>
          ) : (
            <Button onClick={() => setShowLoginModal(true)} color="primary" size="sm" className="flex items-center text-xs">
              <LogIn size={16} />
            </Button>
          )}
        </div>
      </header>
      
      <div className="flex-grow flex flex-col min-h-0 h-full md:flex-row relative">
        <div ref={viewerRef} className={`relative w-full overflow-hidden md:h-full ${isSidebarCollapsed ? 'h-full md:w-full' : ' h-1/2 md:w-1/2'} md:flex-grow transition-all duration-300`}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-white mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>{loadingMessage}</p>
              </div>
            </div>
          )}
          <button
            onClick={onFocus}
            className="absolute bottom-4 right-4 z-20 p-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
            title="Focus on element"
          >
            <Focus size={20} />
          </button>
          <button
            onClick={onIsolate}
            className="absolute bottom-4 right-16 z-20 p-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
            title="Isolate element"
          >
            <Eye size={20} />
          </button>
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
          <div className="flex w-full flex-col flex-shrink-0">
            <div className="flex justify-between items-center">
              <Tabs
                aria-label="Options"
                selectedKey={activeTab}
                onSelectionChange={(key) => {
                  if (key === 'epd') {
                    window.open('/co2', '_blank');
                  } else {
                    setActiveTab(key as string);
                  }
                }}
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
                <Tab
                  key="issues"
                  title={
                    <div className="flex items-center space-x-2">
                      <ClipboardClock />
                      <span>Issues</span>
                    </div>
                  }
                />
                <Tab
                  key="epd"
                  title={
                    <div className="flex items-center space-x-2">
                      <ClipboardClock />
                      <span>EPD</span>
                    </div>
                  }
                />
              </Tabs>
            </div>
          </div>
          <div className="pt-4 flex-grow h-full overflow-y-auto min-h-0">
            {activeTab === 'properties' && (
              <>
                {error && <p className="text-red-500">Error: {error}</p>}
                {elementData ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2 pb-1 border-b">
                        <h3 className="font-bold text-md">Attributes</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setHistoryModalOpen(true)}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            History
                          </button>
                          <button
                            onClick={handleSaveChanges}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">{renderAttributes(elementData.attributes)}</div>
                    </div>
                    {Object.keys(elementData.psets).length > 0 && (
                      <div>
                        <h3 className="font-bold text-md mb-2 border-b pb-1">Property Sets</h3>
                        {Object.entries(elementData.psets).map(([psetName, psetAttrs]) => (
                          <div key={psetName} className="mb-4">
                            <h4 className="font-semibold text-sm italic mb-2">{psetName}</h4>
                            <div className="space-y-1 pl-4">{renderAttributes(psetAttrs)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleAddAttribute}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm flex items-center"
                    >
                      Add Attributes <Plus size={16} className="ml-1" />
                    </button>
                  </div>
                ) : (
                  !error && !isLoading && <p>No element data found.</p>
                )}
              </>
            )}
            {activeTab === 'issues' && typeof id === 'string' && (
              <IssueManager
                darkMode={darkMode}
                elementId={id}
                elementName={elementData?.attributes?.Name?.value || ""}
              />
            )}
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

      {showLoginModal && setShowLoginModal && (
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

export default ElementDetailContainer;
