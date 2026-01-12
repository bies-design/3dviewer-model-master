"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { X, Plus, Trash2, Eye, Edit, Folder as FolderIcon, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "@/contexts/AppContext"; // Import useAppContext
import AddFolderModal from "./AddFolderModal"; // Import the new modal component

interface R2ModelHistoryPanelProps {
  darkMode: boolean;
  onClose: () => void;
  onDeleteModel: (modelId: string) => Promise<void>;
  onPreviewModel: (model: R2Model) => void; // Add onPreviewModel
  onAssignModelToGroup: (modelId: string, groupIds: string[]) => Promise<void>; // Add this prop
  currentModelGroupId: string | null; // Add this prop to pass the currently selected group ID
  refreshTrigger: number; // Add this prop to trigger a refresh from parent
}

export interface R2Model {
  _id: string;
  name: string;
  r2FileName: string;
  uploadedAt: string; // Changed to uploadedAt to match API response
  groupIds: string[]; // To store the group IDs
  groupNames: string[]; // To store the group names for display
  folderId: string | null; // New: To store the folder ID
  folderName: string | null; // New: To store the folder name for display
}

export interface Folder {
  _id: string;
  name: string;
  createdAt: string;
  parentId?: string | null; // New: Optional parent folder ID
}

export default function R2ModelHistoryPanel({ darkMode, onClose, onDeleteModel, onPreviewModel, onAssignModelToGroup, currentModelGroupId, refreshTrigger }: R2ModelHistoryPanelProps) {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [r2Models, setR2Models] = useState<R2Model[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>("");
  const [editingModelFolderId, setEditingModelFolderId] = useState<string | null>(null);
  const [currentFolderView, setCurrentFolderView] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>(t("folders"));
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
  const [isUploadedModelsExpanded, setIsUploadedModelsExpanded] = useState(true);
  const [sortKey, setSortKey] = useState<keyof R2Model | ''>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedModelsSearchQuery, setUploadedModelsSearchQuery] = useState("");

  const handleSort = (key: keyof R2Model) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortedAndFilteredModels = (models: R2Model[], query: string = "") => {
    let filteredModels = models;

    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (!sortKey) return filteredModels;

    return [...filteredModels].sort((a, b) => {
      let aValue = a[sortKey];
      let bValue = b[sortKey];

      // Special handling for name to be case-insensitive
      if (sortKey === 'name' && typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue! < bValue!) return sortDirection === 'asc' ? -1 : 1;
      if (aValue! > bValue!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };
 
   const fetchR2ModelsAndGroups = useCallback(async () => { // Removed folderId parameter
    try {
      setLoading(true);
      // Fetch R2 models
      const modelsResponse = await fetch('/api/models/r2-upload/list');
      if (!modelsResponse.ok) {
        throw new Error(`Failed to fetch R2 models: ${modelsResponse.statusText}`);
      }
      const fetchedModels: R2Model[] = await modelsResponse.json(); // No filtering here
      console.log("R2ModelHistoryPanel: fetchedModels from API", fetchedModels);

      // Fetch model groups
      const groupsResponse = await fetch('/api/model-groups');
      if (!groupsResponse.ok) {
        throw new Error(`Failed to fetch model groups: ${groupsResponse.statusText}`);
      }
      const fetchedGroups = await groupsResponse.json();
      console.log("R2ModelHistoryPanel: fetchedGroups from API", fetchedGroups);
      const groupMap = new Map(fetchedGroups.map((group: any) => [group._id, group.name]));
      console.log("R2ModelHistoryPanel: groupMap", groupMap);

      // Map group names to models
      const modelsWithGroupNames = fetchedModels.map((model: any) => {
        const groupIds = Array.isArray(model.groupIds) ? model.groupIds : [];
        const groupNames = Array.isArray(model.groupNames) && model.groupNames.length > 0
          ? model.groupNames
          : [t("no_group_assigned")];

        return {
          ...model,
          groupIds: groupIds,
          groupNames: groupNames,
        };
      });
      console.log("R2ModelHistoryPanel: modelsWithGroupNames (processed)", modelsWithGroupNames);

      setR2Models(modelsWithGroupNames);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching R2 models or groups:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchFolders = useCallback(async (parentFolderId: string | null = null) => {
    try {
      const url = parentFolderId ? `/api/folders?parentId=${parentFolderId}` : '/api/folders';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.statusText}`);
      }
      const fetchedFolders: Folder[] = await response.json();
      setFolders(fetchedFolders);
      // setCurrentFolderName is now handled by handleFolderClick, handleGoBack, handleGoForward
    } catch (err: any) {
      console.error("Error fetching folders:", err);
      // Optionally set an error state for folders
    }
  }, [t]);

  const handleEditFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
  };

  const handleSaveFolderName = async (folderId: string, explicitSave: boolean = false) => {
    const originalName = folders.find(folder => folder._id === folderId)?.name;

    if (!explicitSave) {
      // If not an explicit save (onBlur), just exit editing mode without saving
      setEditingFolderId(null);
      setEditingFolderName("");
      return;
    }

    // Only proceed with API call if it's an explicit save and the name has actually changed and is not empty
    if (explicitSave) {
      if (!editingFolderName.trim()) { // Check if the trimmed name is empty
        setToast({ message: t("folder_name_cannot_be_empty"), type: "warning" });
        setEditingFolderId(null);
        setEditingFolderName("");
        return;
      }
      // Only proceed with API call if the name has actually changed
      if (editingFolderName !== originalName) {
        try {
          const response = await fetch(`/api/folders/${folderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: editingFolderName }),
          });
          if (!response.ok) {
            throw new Error('Failed to update folder name');
          }
          fetchFolders(); // Refresh folders list
          setToast({ message: t("folder_name_updated_successfully"), type: "success" });
        } catch (error) {
          console.error('Error updating folder name:', error);
          setToast({ message: t("failed_to_update_folder_name"), type: "error" });
        } finally {
          setEditingFolderId(null);
          setEditingFolderName("");
        }
      } else {
        // If explicit save, but name is unchanged, just exit editing mode
        setEditingFolderId(null);
        setEditingFolderName("");
      }
    }
  };

  const handleAssignModelToFolder = async (modelId: string, folderId: string | null) => {
    try {
      const response = await fetch(`/api/models/${modelId}/assign-folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (!response.ok) {
        throw new Error('Failed to assign folder to model');
      }
      fetchR2ModelsAndGroups(); // Refresh models to show updated folder
      setToast({ message: t("folder_assigned_successfully"), type: "success" });
    } catch (error) {
      console.error('Error assigning folder to model:', error);
      setToast({ message: t("failed_to_assign_folder_to_model"), type: "error" });
    } finally {
      setEditingModelFolderId(null); // Exit editing mode
    }
  };

  const handleFolderClick = (folderId: string, folderName: string) => {
    setFolderHistory(prev => [...prev, currentFolderView || "all"]); // Save current view to history
    setForwardHistory([]); // Clear forward history when navigating to a new folder
    setCurrentFolderView(folderId);
    setCurrentFolderName(folderName);
    setFolderPath(prev => [...prev, folderName]); // Add folder name to path
  };

  const handleGoBack = () => {
    if (folderHistory.length > 0) {
      const lastView = folderHistory[folderHistory.length - 1];
      setFolderHistory(prev => prev.slice(0, prev.length - 1));
      setForwardHistory(prev => [currentFolderView || "all", ...prev]); // Add current view to forward history
      setCurrentFolderView(lastView === "all" ? null : lastView);
      const folderName = lastView === "all" ? t("folders") : folders.find(f => f._id === lastView)?.name || t("folders");
      setCurrentFolderName(folderName);
      setFolderPath(prev => prev.slice(0, prev.length - 1)); // Remove last folder from path
    }
  };

  const handleGoForward = () => {
    if (forwardHistory.length > 0) {
      const nextView = forwardHistory[0];
      setForwardHistory(prev => prev.slice(1));
      setFolderHistory(prev => [...prev, currentFolderView || "all"]); // Add current view to back history
      setCurrentFolderView(nextView === "all" ? null : nextView);
      const folderName = nextView === "all" ? t("folders") : folders.find(f => f._id === nextView)?.name || t("folders");
      setCurrentFolderName(folderName);
      setFolderPath(prev => [...prev, folderName]); // Add folder name to path
    }
  };

  useEffect(() => {
    fetchR2ModelsAndGroups(); // Always fetch all models
    fetchFolders(currentFolderView); // Fetch folders based on currentFolderView
  }, [fetchR2ModelsAndGroups, fetchFolders, refreshTrigger, currentFolderView]); // Added currentFolderView to dependencies
 
  const handleDeleteClick = async (modelId: string) => {
    if (window.confirm(t("confirm_delete_model"))) {
      await onDeleteModel(modelId);
      // After deletion, refetch models to update the list
      fetchR2ModelsAndGroups();
    }
  };

  return (
    <div className={`relative h-full w-full p-4 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
      <button onClick={onClose} className={`absolute top-4 right-4 ${darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}>
        <X size={24} />
      </button>
      {/* Folders Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex items-center">
              <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {currentFolderView ? (
                  editingFolderId === currentFolderView ? (
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onBlur={(e) => {
                        if (e.relatedTarget && e.relatedTarget.id === `save-folder-button-${currentFolderView}`) {
                          return;
                        }
                        handleSaveFolderName(currentFolderView, false); // Not an explicit save
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveFolderName(currentFolderView, true); // Explicit save
                        }
                      }}
                      className={`bg-transparent border-b ${darkMode ? "border-gray-500 text-white focus:border-blue-400" : "border-gray-400 focus:border-blue-500 text-black"} text-2xl font-bold`}
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center">
                      <span>{currentFolderName}</span>
                      <button
                        className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); handleEditFolder(currentFolderView, currentFolderName); }}
                      >
                        <Edit size={20} />
                      </button>
                    </div>
                  )
                ) : t("folders")}
              </h2>
              {folderPath.length > 0 && (
                <span className={`ml-2 text-xl ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  /{folderPath.join('/')}
                </span>
              )}
            </div>
            <div className="flex items-center ml-4"> {/* Added ml-4 for spacing */}
              <button
                onClick={handleGoBack}
                disabled={folderHistory.length === 0}
                className={`mr-2 p-1 rounded-full ${
                  folderHistory.length === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={handleGoForward}
                disabled={forwardHistory.length === 0}
                className={`mr-4 p-1 rounded-full ${
                  forwardHistory.length === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                }`}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <button
              onClick={() => setIsAddFolderModalOpen(true)}
              className={`flex items-center ml-4 px-4 py-2 rounded-md text-sm font-medium ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
            >
              <Plus size={16} className="mr-2" />
              {currentFolderView ? t("create_subfolder") : t("create_folder")}
            </button>
            
            <div className="relative ml-4">
              <input
                type="text"
                placeholder={t("search_models")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-4 py-2 rounded-md text-sm border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              <Search size={16} className={`absolute left-2.5 top-2.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
            </div>

            <button
              onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
              className={`ml-4 p-1 rounded-full ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
            >
              {isFoldersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
 
        {isFoldersExpanded && (
          <>
            {/* Display folders */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {folders.map((folder) => (
                <div
                  key={folder._id}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleFolderClick(folder._id, folder.name)}
                >
                  <FolderIcon size={48} className={`${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                  {editingFolderId === folder._id ? (
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onBlur={(e) => {
                        if (e.relatedTarget && e.relatedTarget.id === `save-folder-button-${folder._id}`) {
                          return;
                        }
                        handleSaveFolderName(folder._id, false); // Not an explicit save
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveFolderName(folder._id, true); // Explicit save
                        }
                      }}
                      className={`bg-transparent border-b ${darkMode ? "border-gray-500 text-white focus:border-blue-400" : "border-gray-400 focus:border-blue-500 text-black"} text-sm font-medium text-center mt-2`}
                      autoFocus
                    />
                  ) : (
                    <div className="flex flex-col items-center mt-2">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium text-center ${darkMode ? "text-white" : "text-gray-800"}`}>{folder.name}</span>
                        <button
                          className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                          onClick={(e) => { e.stopPropagation(); handleEditFolder(folder._id, folder.name); }}
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {folders.length === 0 && !loading && (
                <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>{t("no_folders_found")}</p>
              )}
            </div>

            {currentFolderView && ( // Only display models table if a folder is selected
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-2 mt-4">
                <table className={`min-w-full divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                  <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                        <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                          {t("model_name")}
                          {sortKey === 'name'
                            ? (sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)
                            : <ArrowUpDown size={16} className="text-gray-400" />
                          }
                        </button>
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                        {t("folder_name")}
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                        <button onClick={() => handleSort('uploadedAt')} className="flex items-center gap-1">
                          {t("uploaded_at")}
                          {sortKey === 'uploadedAt'
                            ? (sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)
                            : <ArrowUpDown size={16} className="text-gray-400" />
                          }
                        </button>
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-200 bg-white"}`}>
                    {getSortedAndFilteredModels(r2Models.filter(model => model.folderId === currentFolderView), searchQuery).map((model) => (
                      <tr key={model._id} className={`${darkMode ? "hover:bg-gray-500" : "hover:bg-gray-100"}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {model.name.replace(/\.frag$/, '')}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-200" : "text-gray-500"}`}>
                          <div className="relative flex items-center">
                            {editingModelFolderId === model._id ? (
                              <FolderSelect
                                model={model}
                                folders={folders}
                                darkMode={darkMode}
                                t={t}
                                handleAssignModelToFolder={handleAssignModelToFolder}
                                setEditingModelFolderId={setEditingModelFolderId}
                              />
                            ) : (
                              <>
                                <span>{model.folderName || t("no_folder_assigned")}</span>
                                <button
                                  className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                                  onClick={() => {
                                    setEditingModelFolderId(model._id);
                                  }}
                                >
                                  <Edit size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-200" : "text-gray-500"}`}>
                          {new Date(model.uploadedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-md font-bold flex items-center space-x-8">
                          <button
                            onClick={() => onPreviewModel(model)}
                            className={`${darkMode ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-900"}`}
                            title={t("preview")}
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            onClick={() => {
                              if (currentModelGroupId) {
                                const newGroupIds = model.groupIds ? [...model.groupIds, currentModelGroupId] : [currentModelGroupId];
                                onAssignModelToGroup(model._id, newGroupIds);
                              }
                            }}
                            className={`${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-900"}`}
                            title={t("add_to_group")}
                          >
                            <Plus size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(model._id)}
                            className={`${darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}`}
                            title={t("delete")}
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr >
                    ))}
                    {r2Models.filter(model => model.folderId === currentFolderView).length === 0 && (
                      <tr>
                        <td colSpan={4} className={`px-6 py-4 whitespace-nowrap text-sm text-center ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {t("no_models_in_this_folder")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center mt-8 mb-4">
        <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>{t("uploaded_models")}</h2>
        
        <div className="relative ml-4">
          <input
            type="text"
            placeholder={t("search_models")}
            value={uploadedModelsSearchQuery}
            onChange={(e) => setUploadedModelsSearchQuery(e.target.value)}
            className={`pl-8 pr-4 py-2 rounded-md text-sm border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
          />
          <Search size={16} className={`absolute left-2.5 top-2.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
        </div>

        <button
          onClick={() => setIsUploadedModelsExpanded(!isUploadedModelsExpanded)}
          className={`ml-4 p-1 rounded-full ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
        >
          {isUploadedModelsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {loading && <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>{t("loading_models")}...</p>}
      {error && <p className="text-red-500">{t("error_fetching_models")}: {error}</p>}

      {!loading && !error && isUploadedModelsExpanded && (
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-2">
          <table className={`min-w-full divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
            <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                    {t("model_name")}
                    {sortKey === 'name'
                      ? (sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)
                      : <ArrowUpDown size={16} className="text-gray-400" />
                    }
                  </button>
                </th>
                {/* <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                  {t("group_name")}
                </th> */}
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                  {t("folder_name")}
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                  <button onClick={() => handleSort('uploadedAt')} className="flex items-center gap-1">
                    {t("uploaded_at")}
                    {sortKey === 'uploadedAt'
                      ? (sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)
                      : <ArrowUpDown size={16} className="text-gray-400" />
                    }
                  </button>
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-200 bg-white"}`}>
              {getSortedAndFilteredModels(r2Models.filter(model => !model.folderId), uploadedModelsSearchQuery).map((model) => (
                <tr key={model._id} className={`${darkMode ? "hover:bg-gray-500" : "hover:bg-gray-100"}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {model.name.replace(/\.frag$/, '')}
                  </td>
                  {/* <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-200" : "text-gray-500"}`}>
                    {model.groupNames.join(', ')}
                  </td> */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-200" : "text-gray-500"}`}>
                    <div className="relative flex items-center">
                      {editingModelFolderId === model._id ? (
                        <FolderSelect
                          model={model}
                          folders={folders}
                          darkMode={darkMode}
                          t={t}
                          handleAssignModelToFolder={handleAssignModelToFolder}
                          setEditingModelFolderId={setEditingModelFolderId}
                        />
                      ) : (
                        <>
                          <span>{model.folderName || t("no_folder_assigned")}</span>
                          <button
                            className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
                            onClick={() => {
                              setEditingModelFolderId(model._id);
                            }}
                          >
                            <Edit size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-200" : "text-gray-500"}`}>
                    {new Date(model.uploadedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-md font-bold flex items-center space-x-8">
                    <button
                      onClick={() => onPreviewModel(model)}
                      className={`${darkMode ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-900"}`}
                      title={t("preview")}
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => {
                        if (currentModelGroupId) {
                          const newGroupIds = model.groupIds ? [...model.groupIds, currentModelGroupId] : [currentModelGroupId];
                          onAssignModelToGroup(model._id, newGroupIds);
                        }
                        
                      }}
                      className={`${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-900"}`}
                      title={t("add_to_group")}
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(model._id)}
                      className={`${darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}`}
                      title={t("delete")}
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddFolderModalOpen && (
        <AddFolderModal
          darkMode={darkMode}
          onClose={() => setIsAddFolderModalOpen(false)}
          onFolderCreated={() => {
            setIsAddFolderModalOpen(false);
            fetchFolders(); // Refresh folders after creation
          }}
          parentId={currentFolderView} // Pass the current folder ID as parentId
        />
      )}
    </div>
  );
}

interface FolderSelectProps {
  model: R2Model;
  folders: Folder[];
  darkMode: boolean;
  t: (key: string) => string;
  handleAssignModelToFolder: (modelId: string, folderId: string | null) => Promise<void>;
  setEditingModelFolderId: React.Dispatch<React.SetStateAction<string | null>>;
}

const FolderSelect: React.FC<FolderSelectProps> = ({
  model,
  folders,
  darkMode,
  t,
  handleAssignModelToFolder,
  setEditingModelFolderId,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
      console.log("FolderSelect: select element focused for model:", model._id, "current folderId:", model.folderId);
    }
  }, [model._id, model.folderId]);

  return (
    <select
      ref={selectRef}
      value={model.folderId || ""}
      onChange={(e) => {
        console.log("FolderSelect: onChange triggered for model:", model._id, "new value:", e.target.value);
        handleAssignModelToFolder(model._id, e.target.value || null);
      }}
      onBlur={() => {
        setTimeout(() => {
          if (selectRef.current && selectRef.current.contains(document.activeElement)) {
            return;
          }
          setEditingModelFolderId(null);
        }, 12000);
      }}
      className={`px-2 py-1 rounded text-xs transition-colors duration-200 ${darkMode ? "bg-gray-600 text-white hover:bg-gray-700" : "bg-gray-400 text-black hover:bg-gray-500"}`}
      autoFocus
    >
      <option value="">{t("no_folder_assigned")}</option>
      {folders.map((folder) => (
        <option key={folder._id} value={folder._id}>{folder.name}</option>
      ))}
    </select>
  );
};