"use client";

import React, { useEffect, useState, RefObject, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Edit, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import HeaderToggle from "@/components/header";
import Image from "next/image";
import { useAppContext } from "@/contexts/AppContext";
import * as OBC from "@thatopen/components"; // Import OBC
import * as FRAGS from "@thatopen/fragments";
import AddGroupModal from "./AddGroupModal"; // Import the new modal component

export interface UploadedModel {
  _id: string; // Changed from id to _id to reflect MongoDB ID
  id: string; // Keep original id for viewer internal use
  name: string;
  type: "ifc" | "frag" | "json";
  data?: ArrayBuffer;
  r2FileName?: string; // Add r2FileName for models uploaded to R2
  groupIds?: string[]; // Add groupIds for model grouping
  isMainDisplay?: boolean; // Add isMainDisplay for model grouping
}

interface ModelManagerProps {
  darkMode: boolean;
  uploadedModels: UploadedModel[];
  setUploadedModels: React.Dispatch<React.SetStateAction<any[]>>;
  // IfcUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFragmentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleJSONUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownloadIFC: (model: UploadedModel) => void;
  downloadFragments: () => void;
  handleDownloadJSON: (model: UploadedModel) => void;
  deleteAllModels: () => void;
  deleteSelectedModel: (model: UploadedModel) => void;
  fragmentsRef: RefObject<OBC.FragmentsManager | null>;
  worldRef: RefObject<any>;
  components: OBC.Components;
  fetchR2Models: () => Promise<void>;
  onOpenR2History: () => void; // Add new prop for opening R2 history panel
  isR2HistoryPanelOpen: boolean; // New prop to indicate if R2 history panel is open
  handleAssignModelToGroup: (modelId: string, groupIds: string[]) => Promise<void>; // Add this prop
  onModelGroupFilterChange: (groupId: string | null) => void; // Add this prop
  setR2HistoryRefreshCounter: React.Dispatch<React.SetStateAction<number>>; // Add this prop
  mainDisplayGroupId: string | null; // Add this prop
  setMainDisplayGroupId: React.Dispatch<React.SetStateAction<string | null>>; // Add this prop
}

export default function ModelManager({
  darkMode,
  uploadedModels,
  setUploadedModels,
  // IfcUpload,
  handleFragmentUpload,
  handleJSONUpload,
  handleDownloadIFC,
  downloadFragments,
  handleDownloadJSON,
  deleteAllModels,
  deleteSelectedModel,
  fragmentsRef,
  worldRef,
  components,
  fetchR2Models, // Destructure fetchR2Models from props
  onOpenR2History, // Destructure new prop
  handleAssignModelToGroup, // Destructure new prop
  onModelGroupFilterChange, // Destructure new prop
  setR2HistoryRefreshCounter, // Destructure new prop
  isR2HistoryPanelOpen, // Destructure new prop
  mainDisplayGroupId, // Destructure new prop
  setMainDisplayGroupId, // Destructure new prop
}: ModelManagerProps) {
  const { t } = useTranslation();
  const { setUploadProgress, setUploadTime, setUploadStatus, setShowUploadStatus, setShowProgressModal, setProgress, setToast } = useAppContext();
  const [isClient, setIsClient] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [selectedR2Models, setSelectedR2Models] = useState<string[]>([]);
  const ifcLoaderRef = useRef<OBC.IfcLoader | null>(null);
  const [modelGroups, setModelGroups] = useState<any[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(mainDisplayGroupId);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null); // New state for dropdown

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
      setToast({ message: t("failed_to_add_group"), type: "error" });
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
        setToast({ message: t("group_name_updated_successfully"), type: "success" });
      } catch (error) {
        console.error('Error updating group name:', error);
        setToast({ message: t("failed_to_update_group_name"), type: "error" });
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
      setToast({ message: t("group_deleted_successfully"), type: "success" });
    } catch (error) {
      console.error('Error deleting group:', error);
      setToast({ message: t("failed_to_delete_group"), type: "error" });
    }
  };


  const handleChunkedUpload = async (e: React.ChangeEvent<HTMLInputElement>, originalFileType: "ifc" | "frag") => {
    const file = e.target.files?.[0];
    if (!file) return;
 
    let fileToUpload = file;
    let uploadFileName = file.name;
    let uploadFileType: "ifc" | "frag" = originalFileType;

    console.log('ModelManager: handleChunkedUpload triggered for file:', file.name, 'with original type:', originalFileType);

    if (originalFileType === "ifc") {
        if (!ifcLoaderRef.current || !fragmentsRef.current || !worldRef.current) {
            setToast({ message: "Viewer components not initialized for IFC conversion.", type: "error" });
            return;
        }

        setShowUploadStatus(true);
        setUploadProgress(0);
        setUploadTime(null);
        setUploadStatus("Converting IFC to Fragments...");

        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const cleanedFileName = file.name.replace(/[^a-zA-Z0-9-_.]/g, '_');
            const modelId = `${cleanedFileName}_${Date.now()}`;

            const fragModel = await ifcLoaderRef.current.load(uint8Array, true, modelId, {
                instanceCallback: (importer: any) => console.log("IfcImporter ready", importer),
                userData: {},
            });

            const fragBuffer = await fragModel.getBuffer(false);
            fileToUpload = new File([fragBuffer], `${cleanedFileName}.frag`, { type: 'application/octet-stream' });
            uploadFileType = "frag";
            uploadFileName = `${cleanedFileName}.frag`;

            setUploadStatus("Conversion complete. Uploading fragments...");
        } catch (error) {
            console.error("Error converting IFC to fragments:", error);
            setUploadStatus(`Conversion failed: ${error}`);
            return;
        }
    } else if (originalFileType === "frag") {
        const fileExtension = file.name.split('.').pop();
        if (fileExtension !== "frag") {
            setToast({ message: `Please upload a valid .frag file.`, type: "warning" });
            return;
        }
    }

    const checkResponse = await fetch('/api/models/r2-upload/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: uploadFileName }),
    });
    const checkData = await checkResponse.json();
    const { exists, model: existingModel } = checkData; // Get existing model data
    console.log('ModelManager: Check existing model response:', { exists, existingModel, checkData });

    if (exists) {
      const shouldOverwrite = window.confirm('File already exists. Do you want to overwrite it?');
      if (!shouldOverwrite) {
        return;
      }
      // If overwrite, delete the old model from R2 and MongoDB
      if (existingModel && existingModel._id && existingModel.r2FileName) {
        console.log('Attempting to delete existing model for overwrite:', { modelId: existingModel._id, r2FileName: existingModel.r2FileName });
        try {
          const deleteResponse = await fetch('/api/models/r2-upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId: existingModel._id, r2FileName: existingModel.r2FileName }),
          });
          console.log('Delete existing model response status:', deleteResponse.status);
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            console.error('Delete existing model error data:', errorData);
            throw new Error(errorData.error || 'Failed to delete existing model from R2 and MongoDB');
          }
          console.log(`ModelManager: Existing model ${existingModel.name} deleted for overwrite.`);
          // Remove the old model from the uploadedModels state
          setUploadedModels(prev => prev.filter(model => model._id !== existingModel._id));
          await fetchR2Models(); // Refresh the R2 models list after deleting the old model
        } catch (error) {
          console.error('ModelManager: Error deleting existing model for overwrite:', error);
          setToast({ message: `Failed to delete existing model for overwrite. Check console for details.`, type: "error" });
          return; // Stop upload if old model deletion fails
        }
      } else {
        console.warn('ModelManager: Existing model found but missing _id or r2FileName, cannot delete for overwrite.', existingModel);
      }
    } else {
      console.log('ModelManager: No existing model found with the same name. Proceeding with new upload.');
    }

    setShowUploadStatus(true);
    setUploadProgress(0);
    setUploadTime(null);
    setUploadStatus("Uploading...");

    console.log('ModelManager: Starting direct chunked upload for file:', uploadFileName);
    const startTime = Date.now();

    try {
      // 1. Start multipart upload
      const startResponse = await fetch('/api/models/r2-upload/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadFileName }), // Use uploadFileName
      });
      const startData = await startResponse.json();
      if (!startResponse.ok) throw new Error(startData.error || 'Failed to start upload');
      const { uploadId, r2FileName } = startData;
      console.log('ModelManager: Start API response:', { uploadId, r2FileName });

      // 2. Upload parts in batches
      const chunkSize = 5 * 1024 * 1024; // 5MB
      const totalChunks = Math.ceil(fileToUpload.size / chunkSize); // Use fileToUpload.size
      const batchSize = 8;
      let uploadedParts: { ETag: string | null; PartNumber: number }[] = [];

      for (let i = 0; i < totalChunks; i += batchSize) {
        const batch = [];
        for (let j = i; j < i + batchSize && j < totalChunks; j++) {
          const start = j * chunkSize;
          const end = Math.min(start + chunkSize, fileToUpload.size); // Use fileToUpload.size
          const chunk = fileToUpload.slice(start, end); // Use fileToUpload.slice

          const promise = (async () => {
            const partResponse = await fetch('/api/models/r2-upload/part', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: r2FileName, uploadId, partNumber: j + 1 }),
            });
            const partData = await partResponse.json();
            if (!partResponse.ok) throw new Error(partData.error || 'Failed to get signed URL');
            const { signedUrl } = partData;
            console.log(`ModelManager: Part ${j + 1} signed URL obtained.`);

            const uploadResponse = await fetch(signedUrl, {
              method: 'PUT',
              body: chunk,
            });

            const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, "") || null; // Convert undefined to null
            setUploadProgress(((j + 1) / totalChunks) * 100);
            console.log(`ModelManager: Part ${j + 1} uploaded, ETag: ${etag}`);
            return { ETag: etag, PartNumber: j + 1 };
          })();
          batch.push(promise);
        }
        const batchResult = await Promise.all(batch);
        uploadedParts = uploadedParts.concat(batchResult);
        console.log(`ModelManager: Batch of parts uploaded. Total uploaded parts: ${uploadedParts.length}`);
      }

      // 3. Complete multipart upload
      console.log('ModelManager: Completing multipart upload...');
      const completeResponse = await fetch('/api/models/r2-upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFileName, // Original file name for MongoDB
          r2FileName: r2FileName, // R2 key
          uploadId,
          parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber)
        }),
      });
      if (!completeResponse.ok) {
          const errorData = await completeResponse.json();
          throw new Error(errorData.error || 'Failed to complete upload');
      }
      console.log('ModelManager: Multipart upload completed successfully.');
      const { _id } = await completeResponse.json(); // Get the _id from the response

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      setUploadTime(duration);
      setUploadStatus("Success");
      setUploadProgress(100);
      // setUploadedModels(prev => [...prev, { id: `chunked_${Date.now()}`, name: fileName, type: fileType, r2FileName: r2FileName }]); // Removed as r2Models will handle this
      await fetchR2Models(); // Refresh the R2 models list
      setR2HistoryRefreshCounter(prev => prev + 1); // Increment to trigger R2ModelHistoryPanel refresh
    } catch (error) {
      console.error('ModelManager: Upload process failed:', error);
      setUploadStatus(`Failed: ${error}`);
      // Optionally abort multipart upload if it started
      // if (uploadId && r2FileName) {
      //   await fetch('/api/models/r2-upload/abort', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ fileName: r2FileName, uploadId }),
      //   });
      // }
    }
  };

  const handleClearLargeModels = async () => {
    try {
      const response = await fetch('/api/models/clear-large-models', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to clear large models');
      }
      setToast({ message: t("large_models_cleared_successfully"), type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: t("failed_to_clear_large_models"), type: "error" });
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchModelGroups(); // Fetch model groups on component mount
    fetchR2Models(); // Call fetchR2Models here to ensure initial load
 
    let ifcLoader = components.get(OBC.IfcLoader);
    if (!ifcLoader) {
      ifcLoader = new OBC.IfcLoader(components);
      components.add(OBC.IfcLoader.uuid, ifcLoader);
    }
    ifcLoaderRef.current = ifcLoader;

    ifcLoaderRef.current.setup({
      autoSetWasm: false,
      wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
    });
  }, [components, fetchR2Models]); // Add fetchR2Models and uploadedModels to dependency array

  const handleLoadSelectedR2Models = async () => {
    if (selectedR2Models.length === 0) {
      setToast({ message: t("please_select_at_least_one_model_to_load_from_r2"), type: "warning" });
      return;
    }
 
    setShowProgressModal(true);
    setProgress(0);

    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.random() * 8;
      if (simulatedProgress >= 98) simulatedProgress = 98;
      setProgress(Math.floor(simulatedProgress));
    }, 180);

    try {
      for (const r2FileName of selectedR2Models) {
        const response = await fetch('/api/models/r2-upload/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: r2FileName }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get signed URL for ${r2FileName}`);
        }

        const { signedUrl } = await response.json();

        const modelName = r2FileName.split('/').pop() || r2FileName;

        // Check for duplicates in the current scene
        if (fragmentsRef.current) {
          const existingModelIds = Array.from(fragmentsRef.current.list.values()).map((model: any) => model.modelId);
          if (existingModelIds.includes(`r2_${r2FileName}`)) {
            console.warn(`Model ${modelName} is already loaded in the scene. Skipping.`);
            continue; // Skip to the next model
          }
        }

        const modelResponse = await fetch(signedUrl);
        if (!modelResponse.ok) {
          throw new Error(`Failed to download model from R2: ${modelResponse.statusText}`);
        }
        const arrayBuffer = await modelResponse.arrayBuffer();

        if (!fragmentsRef.current || !worldRef.current) {
          throw new Error("Viewer components not initialized.");
        }

        const modelId = `r2_${r2FileName}`;
        let fragModel;
        try {
          fragModel = await fragmentsRef.current.core.load(arrayBuffer, { modelId });
        } catch (loadError) {
          console.error(`Error loading model ${modelName} into viewer:`, loadError);
          setToast({ message: `Failed to load model ${modelName} into viewer. It might be corrupted or an unsupported format.`, type: "error" });
          continue; // Skip to the next model if loading fails
        }
        
        fragmentsRef.current.list.set(modelId, fragModel);

        fragModel.useCamera(worldRef.current.camera.three);
        worldRef.current.scene.three.add(fragModel.object);
        fragmentsRef.current.core.update(true);

        setUploadedModels((prev: UploadedModel[]) => [...prev, {
          id: modelId,
          name: modelName,
          type: modelName.endsWith('.ifc') ? 'ifc' : (modelName.endsWith('.frag') ? 'frag' : 'json'),
          r2FileName: r2FileName,
          data: arrayBuffer
        }]);
        console.log(`Model ${modelName} loaded from R2.`);
      }
    } catch (error) {
      console.error(`Error loading models from R2:`, error);
      setToast({ message: `Failed to load models from R2. Please check console for details.`, type: "error" });
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setShowProgressModal(false), 1500);
    }
    setSelectedR2Models([]); // Clear selection after loading
    setIsAllSelected(false); // Reset "Select All" button state
};

  const handleSelectAllModels = () => {
    const modelsInCurrentGroup = uploadedModels
      .filter(model => model.r2FileName && model.groupIds?.includes(selectedGroupFilter || ''))
      .map(model => model.r2FileName!);
    if (isAllSelected) {
      setSelectedR2Models([]);
    } else {
      setSelectedR2Models(modelsInCurrentGroup);
    }
    setIsAllSelected(prev => !prev);
  };


  useEffect(() => {
    if (isClient) {
      fetchModelGroups(); // Fetch model groups when client is ready
    }
  }, [isClient]);

  return (
    <React.Fragment>
      <div className="flex flex-col h-full">
        <div className="p-4 flex justify-center">
          <Image src="/Type=Full.svg" alt="Type Full" width={200} height={50} className={darkMode ? "brightness-0 invert" : ""} />
        </div>

      <div className="flex flex-col justify-center items-center gap-2 mt-2 px-4">
        {/* <label
          className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"}`}
          >
            {isClient ? t("Upload model") : "Upload model"}
            <input type="file" accept=".ifc" onChange={IfcUpload} className="hidden" />
          </label> */}
        {/* <button
          className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-secondary text-white hover:bg-dark-focus" : "bg-light-secondary text-white hover:bg-light-focus"}`}
        >
          Upload lock model
        </button> */}
        {/* <label
          className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"}`}
          >
            {isClient ? t("upload_ifc") : "Upload IFC File"}
            <input type="file" accept=".ifc" onChange={IfcUpload} className="hidden" />
          </label>
        <label
          className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-dark-default-400 text-white hover:bg-dark-default-300" : "bg-light-default-400 text-black hover:bg-light-default-500"}`}
          >
            {isClient ? t("upload_fragment") : "Upload Fragment File"}
            <input type="file" accept=".frag" onChange={handleFragmentUpload} className="hidden" />
          </label> */}
        <label
          className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"}`}
        >
          {isClient ? t("upload_ifc") : "Upload IFC"}
          <input type="file" accept=".ifc" onChange={(e) => handleChunkedUpload(e, "ifc")} className="hidden" />
        </label>
        <button
          className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200
            ${darkMode ? "bg-gray-600 text-white hover:bg-gray-700" : "bg-gray-400 text-black hover:bg-gray-500"}`}
          onClick={onOpenR2History}
        >
          {isClient ? (isR2HistoryPanelOpen ? t("close_model_list") : t("open_model_list")) : (isR2HistoryPanelOpen ? "Close Model List" : "Open Model List")}
          {isR2HistoryPanelOpen ? <ChevronLeft size={16} className="ml-2" /> : <ChevronRight size={16} className="ml-2" />}
        </button>
      </div>

      <br />

      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{isClient ? t("model_group") : "Model Group"}</h2>
        {/* <div className="relative">
          <select
            className={`px-3 py-1 rounded-md text-sm font-medium appearance-none cursor-pointer
              ${darkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
            value={selectedGroupFilter || ""}
            onChange={(e) => {
              if (e.target.value === "add-new-group") {
                setIsAddGroupModalOpen(true); // Open the modal
              } else {
                const newFilter = e.target.value;
                setSelectedGroupFilter(newFilter);
                onModelGroupFilterChange(newFilter); // Notify parent of change
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
            <div key={group._id} className="mb-4 relative"> {/* Added relative here */}
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
                        handleSaveGroupName(group._id, false); // Not an explicit save
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveGroupName(group._id, true); // Explicit save
                        }
                      }}
                      className={`bg-transparent border-b ${darkMode ? "border-gray-500 text-white focus:border-blue-400" : "border-gray-400 focus:border-blue-500 text-black"} text-sm font-semibold`}
                      autoFocus
                    />
                  ) : (
                    <h3 className={`font-semibold text-sm ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                      {group.name}
                      {mainDisplayGroupId === group._id && (
                        <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">({isClient ? t("main_display") : "Main Display"})</span>
                      )}
                    </h3>
                  )}
                  <ChevronDown size={16} className={`${darkMode ? "text-gray-200" : "text-gray-800"}`} />
                </div>
                <div className="flex items-center gap-2">
                  {editingGroupId === group._id ? (
                    <button
                      id={`save-button-${group._id}`} // Add an ID to the save button
                      className="px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
                      onClick={(e) => { e.stopPropagation(); handleSaveGroupName(group._id, true); }} // Explicit save
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
                      {group._id !== mainDisplayGroupId && ( // Only show delete button if not the main group
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
                <ul className="space-y-3 px-4 mt-4 max-h-[360px] overflow-y-auto">
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
                                  onClick={() => handleDownloadIFC(model)}
                                >
                                  {isClient ? t("ifc") : "IFC"}
                                </button>
                              )}
                              {model.type === 'frag' && (
                                <button
                                  className={`${darkMode ? "bg-gray-600 text-white hover:bg-gray-700" : "bg-gray-400 text-black hover:bg-gray-500"} px-2 py-1 rounded text-xs transition-colors duration-200`}
                                  onClick={() => downloadFragments()}
                                >
                                  {isClient ? t("fragment") : "Fragment"}
                                </button>
                              )}
                              <button
                                className={`${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 text-white hover:bg-red-600"} px-2 py-1 rounded text-xs transition-colors duration-200`}
                                onClick={() => {
                                  const currentGroupIds = model.groupIds || [];
                                  const newGroupIds = currentGroupIds.filter(id => id !== group._id);
                                  handleAssignModelToGroup(model._id, newGroupIds);
                                }}
                              >
                                {isClient ? t("remove") : "Remove"}
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
          onClick={handleLoadSelectedR2Models}
          disabled={selectedR2Models.length === 0}
        >
          {isClient ? t("load_selected_models") : "Load Selected Models"}
        </button>
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
}
