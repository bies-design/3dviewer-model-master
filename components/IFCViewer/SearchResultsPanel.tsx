"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, ChevronDown, ChevronRight, Pencil, PlusCircle } from "lucide-react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";

type TResultItem = {
  id: string;
  name: string;
  expressID: number;
  fragmentId: string;
};

type TResultGroup = {
  id: number;
  name: string;
  items: TResultItem[];
  isCollapsed: boolean;
  isEditing: boolean;
};

interface SearchResultsPanelProps {
  components: OBC.Components;
  darkMode: boolean;
  resultGroups: TResultGroup[];
  setResultGroups: React.Dispatch<React.SetStateAction<TResultGroup[]>>;
  onClose: () => void;
  onToggleAddMode: (active: boolean, groupId: number | null) => void;
  addingToGroup: number | null;
}

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  components,
  darkMode,
  resultGroups,
  setResultGroups,
  onClose,
  onToggleAddMode,
  addingToGroup,
}) => {
  const { t } = useTranslation();

  const toggleGroupCollapse = (groupId: number) => {
    setResultGroups(
      resultGroups.map((group) =>
        group.id === groupId ? { ...group, isCollapsed: !group.isCollapsed } : group
      )
    );
  };

  const handleGroupNameChange = (groupId: number, newName: string) => {
    setResultGroups(
      resultGroups.map((group) =>
        group.id === groupId ? { ...group, name: newName, isEditing: false } : group
      )
    );
  };

  const toggleGroupNameEdit = (groupId: number) => {
    setResultGroups(
      resultGroups.map((group) =>
        group.id === groupId ? { ...group, isEditing: !group.isEditing } : group
      )
    );
  };

  const handleDeleteGroup = (groupId: number) => {
    setResultGroups(resultGroups.filter((group) => group.id !== groupId));
  };

  const handleDeleteItem = (groupId: number, itemId: string) => {
    setResultGroups(
      resultGroups.map((group) => {
        if (group.id === groupId) {
          return { ...group, items: group.items.filter((item) => item.id !== itemId) };
        }
        return group;
      })
    );
  };

  const handleItemClick = async (fragmentId: string, expressID: number) => {
    const hider = components.get(OBC.Hider);
    await hider.set(true, { [fragmentId]: new Set([expressID]) });

    const highlighter = components.get(OBCF.Highlighter);
    await highlighter.highlightByID("select", { [fragmentId]: new Set([expressID]) }, true, true);
  };

  return (
    <div className={`w-80 p-4 flex flex-col ${darkMode ? "bg-neutral-800 text-white" : "bg-neutral-200 text-black"}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">{t("search_results")}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700">
          <X size={18} />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto space-y-2">
        {resultGroups.length === 0 ? (
          <p className="text-gray-500">{t("no_results_yet")}</p>
        ) : (
          resultGroups.map((group) => (
            <div key={group.id} className={`border rounded-xl ${darkMode ? "border-gray-700" : "border-gray-600"}`}>
              <div
                className={`flex items-center justify-between p-2 rounded-t-xl cursor-pointer ${darkMode ? "bg-gray-800" : "bg-gray-700"}`}
                onClick={() => toggleGroupCollapse(group.id)}
              >
                <div className="flex items-center flex-grow">
                  {group.isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  {group.isEditing ? (
                    <input
                      type="text"
                      defaultValue={group.name}
                      className={`ml-2 p-1 text-sm rounded ${darkMode ? "bg-gray-700" : "bg-gray-600"}`}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => handleGroupNameChange(group.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGroupNameChange(group.id, e.currentTarget.value);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold ml-2">{group.name}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleAddMode(true, group.id); }}
                    className={`p-1 rounded ${addingToGroup === group.id ? "bg-green-500" : "text-gray-400 hover:text-white"}`}
                  >
                    <PlusCircle size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleGroupNameEdit(group.id); }} className="p-1 text-gray-400 hover:text-white">
                    <Pencil size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="p-1 text-red-500 hover:text-red-700">
                    <X size={16} />
                  </button>
                </div>
              </div>
              {!group.isCollapsed && (
                <ul className="p-2 space-y-1 max-h-48 overflow-y-auto">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between p-1 rounded cursor-pointer ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-600"}`}
                      onClick={() => handleItemClick(item.fragmentId, item.expressID)}
                    >
                      <span className="truncate" title={item.name}>{item.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(group.id, item.id); }}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchResultsPanel;
