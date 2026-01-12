"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import Image from "next/image";

interface Project {
  id: string;
  name: string;
  models: any[];
}

export default function ProjectsPanel({ darkMode, uploadedModels }: { darkMode: boolean, uploadedModels: any[] }) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [showModelList, setShowModelList] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const createNewProject = () => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: `${t("project")} ${projects.length + 1}`,
      models: [],
    };
    setProjects([...projects, newProject]);
    setSelectedProject(newProject);
  };

  const handleAddModelClick = (projectId: string) => {
    console.log("handleAddModelClick called with projectId:", projectId);
    setSelectedProject(projects.find((p) => p.id === projectId) || null);
    setShowModelList(true);
    console.log("showModelList after setting to true:", true);
  };

  const handleModelSelection = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter((id) => id !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const addSelectedModelsToProject = () => {
    if (!selectedProject) return;
    const modelsToAdd = uploadedModels.filter(
      (m) => selectedModels.includes(m.id) && !selectedProject.models.some((pm) => pm.id === m.id)
    );

    if (modelsToAdd.length < selectedModels.length) {
      setNotification(t("some_models_already_exist"));
    }

    setProjects(
      projects.map((p) => {
        if (p.id === selectedProject.id) {
          return { ...p, models: [...p.models, ...modelsToAdd] };
        }
        return p;
      })
    );
    setShowModelList(false);
    setSelectedModels([]);
  };

  const handleStartEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingProjectName(e.target.value);
  };

  const handleSaveName = (projectId: string) => {
    setProjects(
      projects.map((p) => {
        if (p.id === projectId) {
          return { ...p, name: editingProjectName };
        }
        return p;
      })
    );
    setEditingProjectId(null);
  };

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };

  const deleteModelFromProject = (projectId: string, modelId: string) => {
    setProjects(
      projects.map((p) => {
        if (p.id === projectId) {
          return { ...p, models: p.models.filter((m) => m.id !== modelId) };
        }
        return p;
      })
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {notification && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg z-20">
          {notification}
        </div>
      )}
      <div className="p-4 flex justify-center">
        <Image src="/Type=Full.svg" alt="Type Full" width={200} height={50} className={darkMode ? "dark-mode-svg" : ""} />
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{t("projects")}</h2>
        <button
          onClick={createNewProject}
          className={`p-2 rounded-md ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"}`}
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-2 border-b cursor-pointer ${
              selectedProject?.id === project.id
                ? darkMode
                  ? "bg-zinc-700"
                  : "bg-zinc-300"
                : ""
            } ${darkMode ? "border-dark-divider" : "border-light-divider"}`}
            onClick={() => setSelectedProject(project)}
          >
            <div className="flex justify-between items-center">
              {editingProjectId === project.id ? (
                <input
                  type="text"
                  value={editingProjectName}
                  onChange={handleNameChange}
                  onBlur={() => handleSaveName(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveName(project.id);
                    }
                  }}
                  className={`border rounded p-1 text-sm flex-1 w-22 ${darkMode ? 'bg-dark-content3 text-white' : 'bg-light-content3 text-black'}`}
                  autoFocus
                />
              ) : (
                <span>{project.name}</span>
              )}
              <div className="flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditing(project);
                  }}
                  className="text-gray-500 hover:text-white"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddModelClick(project.id);
                  }}
                  className="text-green-500 hover:text-green-700 ml-2"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {selectedProject?.id === project.id && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold mt-2">{t("models")}</h4>
                <ul className="space-y-2">
                  {project.models.map((model) => (
                    <li key={model.id} className="text-xs flex justify-between items-center">
                      <span>{model.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteModelFromProject(project.id, model.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      {showModelList && selectedProject && (
        <div className={`absolute top-1/2 -translate-y-1/2 left-full ml-4 w-64 p-4 z-10 rounded-lg shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-zinc-200 border-gray-300 text-black"}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{t("select_models")}</h3>
            <button onClick={() => setShowModelList(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {uploadedModels.map((model) => (
              <div key={model.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={model.id}
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelSelection(model.id)}
                  className="mr-2"
                />
                <label htmlFor={model.id}>{model.name}</label>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={addSelectedModelsToProject}
              className={`p-2 rounded-md ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-primary text-white hover:bg-light-focus"}`}
            >
              {t("add")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
