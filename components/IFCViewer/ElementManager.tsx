"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";
import { ArrowUp, ArrowDown, ArrowUpDown, X } from "lucide-react";
import PreviewModal from "./PreviewModal";
import { useAppContext } from "@/contexts/AppContext";

interface UploadedFile {
  id: string;
  file: File;
  status: "converting" | "uploading" | "success" | "failed" | "pending";
  preview?: string;
  progress?: number;
  fragmentData?: ArrayBuffer;
}

interface HistoryEntry {
  _id: string;
  originalFileName: string;
  r2FileName: string;
  status: string;
  uploadedAt: string;
}

interface ElementManagerProps {
  darkMode: boolean;
  components: OBC.Components;
  category: string;
}

export default function ElementManager({ darkMode, components, category }: ElementManagerProps) {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [sortKey, setSortKey] = useState<keyof HistoryEntry | ''>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<UploadedFile | HistoryEntry | null>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/element-manager?category=${category}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        console.error("Failed to fetch history");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
        id: `${file.name}-${Date.now()}`,
        file,
        status: "pending",
      }));
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleDeleteFile = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  };

  const handleUpload = async () => {
    const filesToUpload = files.filter(f => f.status === 'pending');
    if (filesToUpload.length === 0) return;

    for (const fileToUpload of filesToUpload) {
      if (category === '3dmodels' && fileToUpload.file.name.toLowerCase().endsWith('.ifc')) {
        await handleIfcUpload(fileToUpload);
      } else {
        await handleDirectUpload(fileToUpload);
      }
    }
  };

  const handleDirectUpload = async (fileToUpload: UploadedFile) => {
    let progressInterval: any;
    try {
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading', progress: 0 } : f));

      // Simulate upload progress
      await new Promise(resolve => {
        let progress = 0;
        progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 10, 98);
          setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, progress } : f));
          if (progress >= 98) {
            clearInterval(progressInterval);
            resolve(null);
          }
        }, 100);
      });

      const formData = new FormData();
      formData.append('file', fileToUpload.file);
      formData.append('originalFileName', fileToUpload.file.name);

      const response = await fetch(`/api/element-manager?category=${category}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'success', progress: 100 } : f));
      await fetchHistory();
      setTimeout(() => setFiles(prev => prev.filter(f => f.id !== fileToUpload.id)), 1500);

    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Error during direct upload:", error);
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'failed' } : f));
    }
  };

  const handleIfcUpload = async (fileToUpload: UploadedFile) => {
    const ifcLoader = components.get(OBC.IfcLoader);
    let progressInterval: any;
    try {
      // 1. Convert IFC to Fragment
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'converting', progress: 0 } : f));
      
      await new Promise(resolve => {
        let progress = 0;
        progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 5, 48);
          setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, progress } : f));
          if (progress >= 48) {
            clearInterval(progressInterval);
            resolve(null);
          }
        }, 100);
      });

      const arrayBuffer = await fileToUpload.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const model = await ifcLoader.load(uint8Array, false, `frag-${fileToUpload.id}`);
      const fragmentData = await model.getBuffer(false);
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, progress: 50 } : f));

      // 2. Upload Fragment to R2 via API
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading' } : f));

      await new Promise(resolve => {
        let progress = 50;
        progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 5, 98);
          setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, progress } : f));
          if (progress >= 98) {
            clearInterval(progressInterval);
            resolve(null);
          }
        }, 100);
      });

      const formData = new FormData();
      formData.append('file', new Blob([fragmentData]));
      formData.append('originalFileName', fileToUpload.file.name);

      const response = await fetch(`/api/element-manager?category=${category}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // 3. Update UI
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'success', progress: 100, fragmentData } : f));

      // 4. Handle old entry deletion
      await fetchHistory();
      const oldEntry = history.find(entry =>
        entry.originalFileName === fileToUpload.file.name &&
        !response.url.includes(entry.r2FileName)
      );
      if (oldEntry) {
        await handleDeleteHistory(oldEntry, true);
      }
      await fetchHistory();

      // 5. Remove from list
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.id !== fileToUpload.id));
      }, 1500);

    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Error during IFC upload process:", error);
      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'failed' } : f));
    }
  };

  const handlePreview = async (item: UploadedFile | HistoryEntry) => {
    if (category === '3dmodels') {
      if (('r2FileName' in item) || ('fragmentData' in item && item.fragmentData)) {
        setSelectedItemForPreview(item);
        setShowPreviewModal(true);
      } else {
        setToast({ message: "No fragment data available for preview.", type: "error" });
        console.error("No fragment data available for preview for item:", item);
      }
    } else {
      // For drawings and documents, directly open the file
      const r2FileName = 'r2FileName' in item ? item.r2FileName : null;
      if (r2FileName) {
        try {
          const response = await fetch('/api/element-manager/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ r2FileName }),
          });
          if (response.ok) {
            const { signedUrl } = await response.json();
            window.open(signedUrl, '_blank');
          } else {
            console.error("Failed to get signed URL");
            setToast({ message: "Could not open file preview.", type: "error" });
          }
        } catch (error) {
          console.error("Error fetching signed URL:", error);
          setToast({ message: "An error occurred while trying to open the file.", type: "error" });
        }
      } else {
        setToast({ message: "File URL not found.", type: "error" });
      }
    }
  };

  const handleDeleteHistory = async (entry: HistoryEntry, skipConfirm = false) => {
    if (!skipConfirm && !confirm(`Are you sure you want to delete "${entry.originalFileName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/element-manager?id=${entry._id}&r2FileName=${entry.r2FileName}&category=${category}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to delete history item:", errorData.details || 'Unknown error');
        setToast({ message: `Failed to delete: ${errorData.details || 'Unknown error'}`, type: "error" });
      }

      await fetchHistory();
    } catch (error) {
      console.error("Error deleting history item:", error);
      setToast({ message: `An error occurred while trying to delete the item.`, type: "error" });
    }
  };

  const handleSort = (key: keyof HistoryEntry) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedHistory = useMemo(() => {
    const filtered = history.filter(entry =>
      statusFilter === 'all' || entry.status === statusFilter
    );

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [history, sortKey, sortDirection, statusFilter]);

  const getStatusText = (status: UploadedFile["status"] | HistoryEntry["status"]) => {
    switch (status) {
      case "pending":
        return "";
      case "converting":
        return t("converting");
      case "uploading":
        return t("uploading");
      case "success":
        return t("upload_success");
      case "failed":
        return t("upload_failed");
      default:
        return "";
    }
  };

  const getAcceptedFileTypes = () => {
    switch (category) {
      case '3dmodels':
        return '.ifc';
      case 'drawings':
        return '.pdf';
      case 'documents':
        return "*"; // No restriction
      default:
        return "";
    }
  };

  return (
    <div className={`relative p-4 rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"} max-h-[95vh] overflow-y-auto`}>
      <button
        onClick={() => window.close()}
        className={`absolute top-4 right-4 p-2 rounded-full ${darkMode ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-200"}`}
        aria-label="Close"
      >
        <X size={24} />
      </button>
      {showPreviewModal && (
        <PreviewModal
          darkMode={darkMode}
          item={selectedItemForPreview}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedItemForPreview(null);
          }}
        />
      )}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("element_manager")}</h1>
      </div>

      <input
        type="file"
        multiple
        accept={getAcceptedFileTypes()}
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t("name")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t("status")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t("preview")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4 whitespace-nowrap">{file.file.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {file.status === 'converting' || file.status === 'uploading' ? (
                    <div className="w-full bg-gray-200 rounded-full">
                      <div
                        className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                        style={{ width: `${file.progress || 0}%` }}
                      >
                        {`${Math.round(file.progress || 0)}%`}
                      </div>
                    </div>
                  ) : (
                    getStatusText(file.status)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {file.status === 'success' && (
                    <button
                      onClick={() => handlePreview(file)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {t("preview_button")}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    {t("delete")}
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-grow px-4 py-2 rounded border-2 border-dashed ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"}`}
                  >
                    {t("select_files")}
                  </button>
                  <button
                    onClick={handleUpload}
                    className={`px-6 py-2 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white`}
                  >
                    {t("upload")}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <button
          onClick={() => setIsHistoryVisible(!isHistoryVisible)}
          className="text-lg font-semibold"
        >
          {t("upload_history")} {isHistoryVisible ? "▲" : "▼"}
        </button>
        {isHistoryVisible && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button onClick={() => handleSort('originalFileName')} className="flex items-center gap-1">
                      {t("name")}
                      {sortKey === 'originalFileName'
                        ? (sortDirection === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />)
                        : <ArrowUpDown size={20} className="text-gray-400" />
                      }
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button onClick={() => handleSort('uploadedAt')} className="flex items-center gap-1">
                      {t("upload_time")}
                      {sortKey === 'uploadedAt'
                        ? (sortDirection === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />)
                        : <ArrowUpDown size={20} className="text-gray-400" />
                      }
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>{t("status")}</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`text-xs rounded p-1 ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-gray-100 text-black border-gray-300"}`}
                      >
                        <option value="all">All</option>
                        <option value="success">{t("upload_success")}</option>
                        <option value="failed">{t("upload_failed")}</option>
                      </select>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t("preview")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                {sortedHistory.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.originalFileName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(entry.uploadedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusText(entry.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handlePreview(entry)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {t("preview_button")}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteHistory(entry)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t("delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}