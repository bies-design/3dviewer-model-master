import React, { useState, useEffect, useRef, useCallback, forwardRef, RefObject, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import * as OBC from "@thatopen/components"; // Import OBC
import { useAppContext } from "@/contexts/AppContext";
import AddGroupModal from "./AddGroupModal";
import { UploadedModel } from "./ModelManager"; // Import UploadedModel

interface Props {
  components: OBC.Components;
  darkMode: boolean;
  onClose: () => void;
  onToggleAddMode: (active: boolean, groupId: string | null) => void;
  uploadedModels: UploadedModel[];
  setUploadedModels: React.Dispatch<React.SetStateAction<any[]>>;
  handleAssignModelToGroup: (modelId: string, groupIds: string[]) => Promise<void>;
  onModelGroupFilterChange: (groupId: string | null) => void;
  fetchR2Models: () => Promise<void>;
  fragmentsRef: RefObject<OBC.FragmentsManager | null>;
  worldRef: RefObject<any>;
  loadR2ModelIntoViewer: (r2FileName: string, onProgress: (progress: number) => void) => Promise<void>;
  mainDisplayGroupId: string | null;
  setMainDisplayGroupId: React.Dispatch<React.SetStateAction<string | null>>;
}

export type HomePanelRef = {
  addItemToGroup: (groupId: string, item: any) => void;
  handleSelectAllModels: () => Promise<string[]>; // Now returns a Promise with selected model names
  handleLoadSelectedR2Models: (modelNames: string[]) => Promise<void>; // Accepts model names as parameter
};

  const HomePanel = forwardRef<HomePanelRef, Props>(({ components, darkMode, onClose, onToggleAddMode, uploadedModels, setUploadedModels, handleAssignModelToGroup, onModelGroupFilterChange, fetchR2Models, fragmentsRef, worldRef, loadR2ModelIntoViewer, mainDisplayGroupId, setMainDisplayGroupId }, ref) => {
    const { t } = useTranslation();
    const { setUploadProgress, setUploadTime, setUploadStatus, setShowUploadStatus, setShowProgressModal, setProgress, setToast } = useAppContext();
    const [isClient, setIsClient] = useState(false);
    const [selectedR2Models, setSelectedR2Models] = useState<string[]>([]);
    const [modelGroups, setModelGroups] = useState<any[]>([]);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState<string>("");
    // const [mainGroupId, setMainGroupId] = useState<string | null>(null); // Removed as it's now passed as prop
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(mainDisplayGroupId);
    const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [hiddenModels, setHiddenModels] = useState<Map<string, boolean>>(new Map());
    const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null); // New state for dropdown
  
    useImperativeHandle(ref, () => ({
      addItemToGroup: (groupId: string, item: any) => {
        // Implement if needed, or keep as a placeholder
        console.log(`Adding item to group ${groupId}:`, item);
      },
      handleSelectAllModels: async () => {
        return handleSelectAllModels();
      },
      handleLoadSelectedR2Models: async (modelNames: string[]) => {
        await handleLoadSelectedR2Models(modelNames);
      },
    }));

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddGroup = async (groupName: string) => {
    try {
      const response = await fetch('/api/model-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName }),
      });
      if (!response.ok) {
        throw new Error('Failed to add group');
      }
      fetchR2Models(); // Refresh models to show new group
      fetchModelGroups(); // Refresh groups list
    } catch (error) {
      console.error('Error adding group:', error);
      setToast({ message: isClient ? t("failed_to_add_group") : 'Failed to add group', type: "error" });
    }
  };

  const fetchModelGroups = async () => {
    try {
      const response = await fetch('/api/model-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch model groups');
      }
      let data = await response.json();

      // Check for "Main Group" and create if not exists
      let mainGroup = data.find((group: any) => group.name === "Main Group");
      if (!mainGroup) {
        const createResponse = await fetch('/api/model-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: "Main Group" }),
        });
        if (!createResponse.ok) {
          throw new Error('Failed to create Main Group');
        }
        mainGroup = await createResponse.json();
        data = [...data, mainGroup]; // Add the newly created main group to the list
      }
      if (!mainDisplayGroupId) { // Only set if mainDisplayGroupId is not already set (e.g., from localStorage)
        setMainDisplayGroupId(mainGroup._id); // Set the main group ID
        setSelectedGroupFilter(mainGroup._id); // Set default filter to Main Group
        onModelGroupFilterChange(mainGroup._id); // Notify parent of initial main group selection
      } else {
        setSelectedGroupFilter(mainDisplayGroupId); // Use the persisted mainDisplayGroupId
        onModelGroupFilterChange(mainDisplayGroupId); // Notify parent of initial main group selection
      }

      setModelGroups(data);
      fetchR2Models(); // Refresh models after groups are fetched
    } catch (error) {
      console.error('Error fetching model groups:', error);
    }
  };

  const handleEditGroup = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingGroupName(currentName);
  };

  const handleSaveGroupName = async (groupId: string, explicitSave: boolean = false) => {
    const originalName = modelGroups.find(group => group._id === groupId)?.name;

    if (!explicitSave) {
      // If not an explicit save (onBlur), just exit editing mode without saving
      setEditingGroupId(null);
      setEditingGroupName("");
      return;
    }

    // Only proceed with API call if it's an explicit save and the name has actually changed and is not empty
    if (explicitSave) {
      if (!editingGroupName.trim()) { // Check if the trimmed name is empty
        setToast({ message: isClient ? t("group_name_cannot_be_empty") : "Group name cannot be empty.", type: "warning" });
        setEditingGroupId(null);
        setEditingGroupName("");
        return;
      }
      // Only proceed with API call if the name has actually changed
      if (editingGroupName !== originalName) {
      try {
        const response = await fetch(`/api/model-groups/${groupId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingGroupName }),
        });
        if (!response.ok) {
          throw new Error('Failed to update group name');
        }
        fetchModelGroups(); // Refresh groups list
        setToast({ message: isClient ? t("group_name_updated_successfully") : 'Group name updated successfully!', type: "success" });
      } catch (error) {
        console.error('Error updating group name:', error);
        setToast({ message: isClient ? t("failed_to_update_group_name") : 'Failed to update group name', type: "error" });
      } finally {
        setEditingGroupId(null);
        setEditingGroupName("");
      }
      } else {
        // If explicit save, but name is unchanged, just exit editing mode
        setEditingGroupId(null);
        setEditingGroupName("");
      }
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(isClient ? t("confirm_delete_group") : "Are you sure you want to delete this group? All models assigned to this group will be unassigned.")) {
      return;
    }

    try {
      const response = await fetch(`/api/model-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete group');
      }
      fetchModelGroups(); // Refresh groups list
      fetchR2Models(); // Refresh models to reflect unassigned models
      setToast({ message: isClient ? t("group_deleted_successfully") : 'Group deleted successfully!', type: "success" });
    } catch (error) {
      console.error('Error deleting group:', error);
      setToast({ message: isClient ? t("failed_to_delete_group") : 'Failed to delete group', type: "error" });
    }
  };

const handleSelectAllModels = useCallback(() => {
    return new Promise<string[]>(resolve => {
      const modelsInCurrentGroup = uploadedModels
        .filter(model => model.r2FileName && model.groupIds?.includes(selectedGroupFilter || '')) // Filter by selectedGroupFilter
        .map(model => model.r2FileName!);
      
      const newState = isAllSelected ? [] : modelsInCurrentGroup;
      setSelectedR2Models(newState);
      setIsAllSelected(!isAllSelected);
      resolve(newState); // Resolve the promise with the new state
    });
  }, [uploadedModels, isAllSelected, selectedGroupFilter]);

const handleLoadSelectedR2Models = useCallback(async (modelNames: string[]) => {
    if (modelNames.length === 0) {
      setToast({ message: isClient ? t("please_select_at_least_one_model_to_load_from_r2") : "Please select at least one model to load from R2.", type: "warning" });
      return;
    }

    // Clear all existing models from the scene before loading new ones
    if (fragmentsRef.current) {
      for (const model of fragmentsRef.current.list.values()) {
        fragmentsRef.current.core.disposeModel(model.modelId);
      }
      // 嘗試強制更新場景
      fragmentsRef.current.core.update(true);
    }
 
    setShowProgressModal(true);
    setProgress(0);

    const totalModels = modelNames.length;
    let loadedModelsCount = 0;
    let totalProgress = 0;

    const updateOverallProgress = (modelProgress: number) => {
      const currentModelWeight = 1 / totalModels;
      const currentModelContribution = modelProgress * currentModelWeight;
      totalProgress = (loadedModelsCount * currentModelWeight * 100) + currentModelContribution;
      setProgress(Math.floor(totalProgress));
    };

    try {
      for (const r2FileName of modelNames) {
        await loadR2ModelIntoViewer(r2FileName, (modelProgress) => {
          updateOverallProgress(modelProgress);
        });
        loadedModelsCount++;
      }
    } catch (error) {
      console.error(`Error loading models from R2:`, error);
      setToast({ message: isClient ? t("failed_to_load_models_from_r2") : `Failed to load models from R2. Please check console for details.`, type: "error" });
    } finally {
      setProgress(100);
      setTimeout(() => setShowProgressModal(false), 1500);
    }
    setSelectedR2Models([]); // Clear selection after loading
    setIsAllSelected(false); // Reset select all button to "Select All"
  }, [isClient, fragmentsRef, loadR2ModelIntoViewer, setProgress, setShowProgressModal, setToast]);

  useEffect(() => {
    if (isClient) {
      fetchModelGroups(); // Fetch model groups when client is ready
    }
  }, [isClient, fetchR2Models]); // Add fetchR2Models to dependency array

  useEffect(() => {
    if (isClient) {
      fetchModelGroups(); // Fetch model groups when client is ready
    }
  }, [isClient, fetchR2Models]);


  return (
    <React.Fragment>
      <div className="flex flex-col h-full py-2 px-2">
        <div className="handle flex items-center justify-between mb-4 cursor-move">
          <h3 className="text-2xl font-semibold">{isClient ? t("Home") : "Home"}</h3>
        </div>

        <div className="flex-grow overflow-y-auto space-y-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{isClient ? t("model_group") : "Model Group"}</h2>
            {/* <div className="relative">
              <select
                className={`px-3 py-1 rounded-md text-sm font-medium appearance-none cursor-pointer
                  ${darkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                value={selectedGroupFilter || ""}
                onChange={(e) => {
                  if (e.target.value === "add-new-group") {
                    setIsAddGroupModalOpen(true);
                  } else {
                    const newFilter = e.target.value;
                    setSelectedGroupFilter(newFilter);
                    onModelGroupFilterChange(newFilter);
                    setSelectedR2Models([]); // Clear selected models
                    setIsAllSelected(false); // Reset select all button
                  }
                }}
              >
                {modelGroups.map(group => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
                <option value="add-new-group">{isClient ? t("add_new_group") : "Add New Group"}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-200">
                <ChevronDown size={16} />
              </div>
            </div> */}
          </div>

          <hr />
          <br />

          <div>
            {selectedGroupFilter !== "ungrouped" && modelGroups
              .filter(group => selectedGroupFilter === null || group._id === selectedGroupFilter)
              .map(group => (
                <div key={group._id} className="mb-4 relative">
                  <div
                    className={`flex items-center justify-between px-4 py-2 rounded-md ${darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                  >
                    <div
                      className={`flex items-center gap-2 flex-grow ${editingGroupId === group._id ? "" : "cursor-pointer"}`}
                      onClick={() => {
                        if (editingGroupId !== group._id) {
                          setIsDropdownOpen(isDropdownOpen === group._id ? null : group._id);
                        }
                      }}
                    >
                      {editingGroupId === group._id ? (
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onBlur={(e) => {
                            if (e.relatedTarget && e.relatedTarget.id === `save-button-${group._id}`) {
                              return;
                            }
                            handleSaveGroupName(group._id, false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveGroupName(group._id, true);
                            }
                          }}
                          className={`bg-transparent border-b ${darkMode ? "border-gray-500 text-white focus:border-blue-400" : "border-gray-400 focus:border-blue-500 text-black"} text-sm font-semibold`}
                          autoFocus
                        />
                      ) : (
                        <h3 className={`font-semibold text-sm ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                          {group.name}
                          {group._id === mainDisplayGroupId && (
                            <span className="ml-2 text-xs text-blue-400 dark:text-blue-300">
                              ({isClient ? t("main_display") : "Main Display"})
                            </span>
                          )}
                        </h3>
                      )}
                      <ChevronDown size={16} className={`${darkMode ? "text-gray-200" : "text-gray-800"}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      {editingGroupId === group._id ? (
                        <button
                          id={`save-button-${group._id}`}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
                          onClick={(e) => { e.stopPropagation(); handleSaveGroupName(group._id, true); }}
                        >
                          {isClient ? t("save") : "Save"}
                        </button>
                      ) : (
                        <>
                          <button
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); handleEditGroup(group._id, group.name); }}
                          >
                            <Edit size={16} />
                          </button>
                          {group._id !== mainDisplayGroupId && (
                            <button
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
                              onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group._id); }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {isDropdownOpen === group._id && (
                    <div className={`absolute z-10 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg rounded-md mt-1 w-full`}>
                      <ul className="py-1">
                        {modelGroups.map(optionGroup => (
                          <li
                            key={optionGroup._id}
                            className={`px-4 py-2 text-sm cursor-pointer ${darkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
                            onClick={() => {
                              setSelectedGroupFilter(optionGroup._id);
                              onModelGroupFilterChange(optionGroup._id);
                              setIsDropdownOpen(null); // Close dropdown after selection
                              setSelectedR2Models([]); // Clear selected models
                              setIsAllSelected(false); // Reset select all button
                            }}
                          >
                            {optionGroup.name}
                          </li>
                        ))}
                        <li
                          className={`px-4 py-2 text-sm cursor-pointer ${darkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
                          onClick={() => {
                            setIsAddGroupModalOpen(true); // Open the modal
                            setIsDropdownOpen(null); // Close dropdown after selection
                          }}
                        >
                          {isClient ? t("add_new_group") : "Add New Group"}
                        </li>
                      </ul>
                    </div>
                  )}
                    <ul className="space-y-3 mt-4 max-h-[440px] overflow-y-auto">
                      {uploadedModels
                        .filter(model => model.groupIds?.includes(group._id))
                        .filter((model, index, self) =>
                          index === self.findIndex((m) => (m.r2FileName ? m.r2FileName === model.r2FileName : m.id === model.id))
                        )
                        .map((model) => (
                          <li key={model.r2FileName || model.id}>
                            <div className="flex items-center gap-2">
                              {model.r2FileName && (
                                <input
                                  type="checkbox"
                                  checked={selectedR2Models.includes(model.r2FileName)}
                                  onChange={() => {
                                    setSelectedR2Models(prev =>
                                      prev.includes(model.r2FileName!)
                                        ? prev.filter(id => id !== model.r2FileName)
                                        : [...prev, model.r2FileName!]
                                    );
                                  }}
                                  className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                                />
                              )}
                              <div className="flex flex-col gap-1 flex-grow">
                                <span className={`cursor-pointer hover:underline ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{model.name}</span>
                                <div className="flex space-x-1">
                                  {model.type === 'ifc' && (
                                    <button
                                      className={`${darkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"} px-2 py-1 rounded text-xs transition-colors duration-200`}
                                      onClick={() => setToast({ message: isClient ? t("download_ifc_functionality_needs_to_be_implemented") : "Download IFC functionality needs to be implemented.", type: "info" })}
                                    >
                                      {isClient ? t("ifc") : "IFC"}
                                    </button>
                                  )}
                                  {model.type === 'frag' && (
                                    <button
                                      className={`${darkMode ? "bg-gray-600 text-white hover:bg-gray-700" : "bg-gray-400 text-black hover:bg-gray-500"} px-2 py-1 rounded text-xs transition-colors duration-200`}
                                      onClick={() => setToast({ message: isClient ? t("download_fragment_functionality_needs_to_be_implemented") : "Download Fragment functionality needs to be implemented.", type: "info" })}
                                    >
                                      {isClient ? t("fragment") : "Fragment"}
                                    </button>
                                  )}
                                  <button
                                    className={`${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-400 text-black hover:bg-gray-500"} px-2 py-1 rounded text-xs transition-colors duration-200`}
                                    onClick={async () => {
                                      if (!fragmentsRef.current || !worldRef.current) return;
                                      const hider = components.get(OBC.Hider);
                                      if (!hider) return;

                                      const modelId = model.id;
                                      const fragModel = fragmentsRef.current.list.get(modelId);
                                      if (fragModel) {
                                        const allFragmentIds = new Set<number>();
                                        const allItems = await fragModel.getItemsOfCategories([/.*/]);
                                        for (const category in allItems) {
                                          for (const id of allItems[category]) {
                                            allFragmentIds.add(id);
                                          }
                                        }
                                        
                                        const isCurrentlyHidden = hiddenModels.get(modelId) || false;
                                        await hider.set(isCurrentlyHidden, { [modelId]: allFragmentIds }); // Changed to match user's observed behavior
                                        fragmentsRef.current.core.update(true);
                                        setHiddenModels(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(modelId, !isCurrentlyHidden);
                                          return newMap;
                                        });
                                      }
                                    }}
                                  >
                                    {isClient ? (hiddenModels.get(model.id) ? t("show") : t("hide") ) : (hiddenModels.get(model.id) ? "Hide" : "Show")}
                                  </button>
                                </div>
                                <hr
                                  style={{
                                    height: "11px",
                                    border: "none",
                                    borderTop: `3px ridge ${darkMode ? "#fbbf29" : "#4cedef"}`,
                                  }}
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                    </ul>
                </div>
              ))}
          </div>
          <div className="flex justify-center items-center gap-2 mt-2 px-4">
            <button
              className={`w-full px-6 py-2 rounded-xl font-medium
                ${mainDisplayGroupId === selectedGroupFilter ? "bg-gray-400 text-gray-700 cursor-not-allowed" : (darkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer")}`}
              onClick={() => selectedGroupFilter && setMainDisplayGroupId(selectedGroupFilter)}
              disabled={mainDisplayGroupId === selectedGroupFilter}
            >
              {isClient ? t("set_main_display") : "Set Main Display"}
            </button>
          </div>
          
          <div className="flex justify-center items-center gap-2 mt-2 px-4">
            <button
              className={`w-full px-6 py-2 rounded-xl font-medium cursor-pointer
                ${darkMode ? "bg-gray-600 text-white hover:bg-gray-700" : "bg-gray-400 text-black hover:bg-gray-500"}`}
              onClick={handleSelectAllModels}
            >
              {isClient ? (isAllSelected ? t("deselect_all") : t("select_all")) : (isAllSelected ? t("deselect_all") : t("select_all"))}
            </button>
          </div>
          <div className="flex justify-center items-center gap-2 mt-2 px-4">
            <button
              className={`w-full px-6 py-2 rounded-xl font-medium cursor-pointer
                ${darkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"}`}
              onClick={() => handleLoadSelectedR2Models(selectedR2Models)}
              disabled={selectedR2Models.length === 0}
            >
              {isClient ? t("load_selected_models") : "Load Selected Models"}
            </button>
          </div>
        </div>
      </div>
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onAddGroup={handleAddGroup}
        darkMode={darkMode}
      />
    </React.Fragment>
  );
});

export default HomePanel;
