"use client";

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Trash2, ChevronDown, ChevronRight, Pencil, PlusCircle, Search } from "lucide-react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { Spinner } from "@heroui/react";

interface SearchPanelProps {
  components: OBC.Components;
  darkMode: boolean;
  loadedModelIds: string[];
}

type TQueryRow = {
  id: number;
  attribute: "Category" | "Name" | "ObjectType" | "Tag";
  operator: "equal" | "include" | "startsWith" | "endsWith" | "from to";
  value: string;
  valueEnd?: string;
  logic: "AND" | "NOT";
};

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

export type SearchPanelRef = {
  addItemToGroup: (groupId: number, item: TResultItem) => void;
};

const SearchPanel = forwardRef<SearchPanelRef, SearchPanelProps>(({ components, darkMode, loadedModelIds }, ref) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [queryRows, setQueryRows] = useState<TQueryRow[]>([
    { id: 0, attribute: "Category", operator: "include", value: "", logic: "AND" },
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [groupCounter, setGroupCounter] = useState(1);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [resultGroups, setResultGroups] = useState<TResultGroup[]>([]);
  const [addingToGroup, setAddingToGroup] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    addItemToGroup: (groupId, item) => {
      setResultGroups(prevGroups =>
        prevGroups.map(group => {
          if (group.id === groupId && !group.items.some(i => i.id === item.id)) {
            return { ...group, items: [...group.items, item] };
          }
          return group;
        })
      );
    }
  }));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const getCategories = async () => {
      const fragments = components.get(OBC.FragmentsManager);
      const allCats: Set<string> = new Set();
      for (const modelId of loadedModelIds) {
        const model = fragments.list.get(modelId);
        if (model) {
          const cats = await model.getItemsOfCategories([/.*/]);
          Object.keys(cats).forEach((c) => allCats.add(c));
        }
      }
      setCategories(Array.from(allCats).sort());
    };
    getCategories();
  }, [components, loadedModelIds]);

  const handleAddRow = () => {
    setQueryRows([
      ...queryRows,
      { id: queryRows.length, attribute: "Name", operator: "include", value: "", logic: "AND" },
    ]);
  };

  const handleRemoveRow = (id: number) => {
    setQueryRows(queryRows.filter((row) => row.id !== id));
  };

  const handleRowChange = (id: number, newRow: Partial<TQueryRow>) => {
    setQueryRows(
      queryRows.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, ...newRow };
          if (newRow.operator === 'from to' && updatedRow.valueEnd === undefined) {
            updatedRow.valueEnd = '';
          }
          if (newRow.operator && newRow.operator !== 'from to') {
            delete updatedRow.valueEnd;
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  const onSearchResults = (groups: TResultGroup[]) => {
    setResultGroups(prev => [...prev, ...groups]);
  };

  const executeSearch = useCallback(async (queries: TQueryRow[]) => {
    setIsSearching(true);
    setNotification(null);
    try {
      const highlighter = components.get(OBCF.Highlighter);
      const hider = components.get(OBC.Hider);
      await highlighter.clear("select");

      const activeQueries = queries.filter(row => row.value);
      if (activeQueries.length === 0) {
        await hider.set(false);
        return;
      }

      const response = await fetch('/api/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: activeQueries, modelIds: loadedModelIds }),
      });

      if (!response.ok) throw new Error('Search request failed');
      const foundElements = await response.json();

      if (foundElements.length > 0) {
        const finalResult: { [id: string]: Set<number> } = {};
        const foundItems: TResultItem[] = [];

        for (const element of foundElements) {
          const { modelId, attributes } = element;
          const expressID = attributes._localId.value;
          if (!finalResult[modelId]) finalResult[modelId] = new Set();
          finalResult[modelId].add(expressID);
          foundItems.push({
            id: `${modelId}-${expressID}`,
            name: attributes.Name?.value || `Element ${expressID}`,
            expressID,
            fragmentId: modelId,
          });
        }

        await hider.isolate(finalResult);
        const newGroup: TResultGroup = {
          id: groupCounter,
          name: t("element_group", { count: groupCounter }),
          items: foundItems,
          isCollapsed: false,
          isEditing: false,
        };
        onSearchResults([newGroup]);
        setGroupCounter((prev) => prev + 1);
      } else {
        await hider.set(true);
        setNotification(t("no_elements_found"));
      }
    } catch (error) {
      console.error("Search failed:", error);
      setNotification(t("search_failed"));
    } finally {
      setIsSearching(false);
    }
  }, [components, groupCounter, t]);

  const handleSimpleSearch = async () => {
    const simpleQueries: TQueryRow[] = [];
    if (nameSearch) {
      simpleQueries.push({ id: 0, attribute: "Name", operator: "include", value: nameSearch, logic: "AND" });
    }
    if (simpleQueries.length > 0) await executeSearch(simpleQueries);
  };

  const parseAndGenerateRange = (startStr: string, endStr: string): string[] => {
    const numRegex = /\d+/g;
    const startMatches = [...startStr.matchAll(numRegex)];
    const endMatches = [...endStr.matchAll(numRegex)];

    if (startMatches.length === 0 || startMatches.length !== endMatches.length) return [];

    let diffIndex = -1;
    for (let i = 0; i < startMatches.length; i++) {
      if (startMatches[i][0] !== endMatches[i][0]) {
        if (diffIndex !== -1) return [];
        diffIndex = i;
      }
    }

    if (diffIndex === -1) return startStr === endStr ? [startStr] : [];

    const differingMatchStart = startMatches[diffIndex];
    const differingMatchEnd = endMatches[diffIndex];
    const num1 = parseInt(differingMatchStart[0], 10);
    const num2 = parseInt(differingMatchEnd[0], 10);

    if (isNaN(num1) || isNaN(num2)) return [];
    
    const startNum = Math.min(num1, num2);
    const endNum = Math.max(num1, num2);
    
    const prefixIndex = differingMatchStart.index!;
    const prefix = startStr.substring(0, prefixIndex);
    const numLength = differingMatchStart[0].length;
    const suffixIndex = prefixIndex + numLength;
    const suffix = startStr.substring(suffixIndex);

    const results: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      results.push(`${prefix}${i.toString().padStart(numLength, '0')}${suffix}`);
    }
    return results;
  };

  const handleAdvancedSearch = async () => {
    setIsSearching(true);
    setNotification(null);
    try {
      const fromToQuery = queryRows.find(row => row.operator === 'from to');
      const baseQueries = queryRows.filter(row => row.operator !== 'from to');
      const resultsMap = new Map<string, TResultItem>();

      if (fromToQuery && fromToQuery.value && fromToQuery.valueEnd) {
        const valuesInRange = parseAndGenerateRange(fromToQuery.value, fromToQuery.valueEnd);
        if (valuesInRange.length === 0) {
          setNotification("Invalid range for 'from to' operator.");
          return;
        }

        for (const value of valuesInRange) {
          const currentQueries = [...baseQueries, { ...fromToQuery, operator: 'include' as const, value }].filter(q => q.value);
          if (currentQueries.length === 0) continue;

          const response = await fetch('/api/elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: currentQueries, modelIds: loadedModelIds }),
          });

          if (response.ok) {
            const foundElements = await response.json();
            for (const element of foundElements) {
              const { modelId, attributes } = element;
              const expressID = attributes._localId.value;
              const item: TResultItem = {
                id: `${modelId}-${expressID}`,
                name: attributes.Name?.value || `Element ${expressID}`,
                expressID,
                fragmentId: modelId,
              };
              resultsMap.set(item.id, item);
            }
          }
        }
      } else {
        const activeQueries = baseQueries.filter(row => row.value);
        if (activeQueries.length > 0) {
          const response = await fetch('/api/elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: activeQueries, modelIds: loadedModelIds }),
          });

          if (response.ok) {
            const foundElements = await response.json();
            for (const element of foundElements) {
              const { modelId, attributes } = element;
              const expressID = attributes._localId.value;
              const item: TResultItem = {
                id: `${modelId}-${expressID}`,
                name: attributes.Name?.value || `Element ${expressID}`,
                expressID,
                fragmentId: modelId,
              };
              resultsMap.set(item.id, item);
            }
          } else {
            throw new Error('Search request failed');
          }
        }
      }

      const finalFoundItems = Array.from(resultsMap.values());
      const highlighter = components.get(OBCF.Highlighter);
      const hider = components.get(OBC.Hider);
      await highlighter.clear("select");

      if (finalFoundItems.length > 0) {
        const finalResult: { [id: string]: Set<number> } = {};
        finalFoundItems.forEach(item => {
          if (!finalResult[item.fragmentId]) finalResult[item.fragmentId] = new Set();
          finalResult[item.fragmentId].add(item.expressID);
        });

        await hider.isolate(finalResult);
        const newGroup: TResultGroup = {
          id: groupCounter,
          name: t("element_group", { count: groupCounter }),
          items: finalFoundItems,
          isCollapsed: false,
          isEditing: false,
        };
        onSearchResults([newGroup]);
        setGroupCounter((prev) => prev + 1);
      } else {
        await hider.set(true);
        setNotification(t("no_elements_found"));
      }
    } catch (error) {
      console.error("Search failed:", error);
      setNotification(t("search_failed"));
    } finally {
      setIsSearching(false);
    }
  };

  // --- Result Group Functions ---
  const toggleGroupCollapse = (groupId: number) => {
    setResultGroups(resultGroups.map(g => g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g));
  };

  const handleGroupNameChange = (groupId: number, newName: string) => {
    setResultGroups(resultGroups.map(g => g.id === groupId ? { ...g, name: newName, isEditing: false } : g));
  };

t
  const toggleGroupNameEdit = (groupId: number) => {
    setResultGroups(resultGroups.map(g => g.id === groupId ? { ...g, isEditing: !g.isEditing } : g));
  };

  const handleDeleteGroup = (groupId: number) => {
    setResultGroups(resultGroups.filter(g => g.id !== groupId));
  };

  const handleDeleteItem = (groupId: number, itemId: string) => {
    setResultGroups(resultGroups.map(g => {
      if (g.id === groupId) return { ...g, items: g.items.filter(i => i.id !== itemId) };
      return g;
    }));
  };

  const handleItemClick = async (fragmentId: string, expressID: number) => {
    const hider = components.get(OBC.Hider);
    await hider.set(true, { [fragmentId]: new Set([expressID]) });
    const highlighter = components.get(OBCF.Highlighter);
    await highlighter.highlightByID("select", { [fragmentId]: new Set([expressID]) }, true, true);
  };

  const onToggleAddMode = (active: boolean, groupId: number | null) => {
    setAddingToGroup(active ? groupId : null);
  };

  return (
    <div className="flex flex-col h-full py-4">
      {notification && (
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 mt-2 text-white px-4 py-2 rounded-xl shadow-lg z-10 ${notification.includes('successfully') ? 'bg-green-500' : 'bg-custom-red-500'}`}>
          {notification}
        </div>
      )}
      <div className="handle flex items-center justify-between mb-4 cursor-move">
        <h3 className="text-2xl font-semibold">{isClient ? t("simple_search") : "Search"}</h3>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {/* Search Controls */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{isClient ? t("search_elements") : "Search Elements"}</h3>
          <select 
            onChange={(e) => setShowAdvancedSearch(e.target.value === 'advanced')}
            className={`p-1 rounded border text-sm ${darkMode ? "bg-custom-zinc-700 text-white border-gray-600" : "bg-gray-200 text-gray-900 border-gray-300"}`}
          >
            <option value="simple">{isClient ? t("simple_search") : "Simple Search"}</option>
            <option value="advanced">{isClient ? t("advanced_search") : "Advanced Search"}</option>
          </select>
        </div>

        {showAdvancedSearch ? (
          <div className="space-y-4">
            {queryRows.map((row, index) => (
              <div key={row.id}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{isClient ? t("condition") : "Condition"} {index + 1}</span>
                  {queryRows.length > 1 && (
                    <button onClick={() => handleRemoveRow(row.id)} className="p-1 text-custom-red-500 hover:text-custom-red-700">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {/* Logic, Attribute, Operator, Value inputs */}
                  <div>
                    <label className={`text-sm font-medium ${darkMode ? "text-custom-zinc-400" : "text-custom-zinc-600"}`}>{isClient ? t("logic") : "Logic"}</label>
                    <select value={row.logic} onChange={(e) => handleRowChange(row.id, { logic: e.target.value as "AND" | "NOT" })} className={`w-full p-2 mt-1 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`}>
                      <option>AND</option>
                      <option>NOT</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${darkMode ? "text-custom-zinc-400" : "text-custom-zinc-600"}`}>{isClient ? t("attribute") : "Attribute"}</label>
                    <select value={row.attribute} onChange={(e) => handleRowChange(row.id, { attribute: e.target.value as any })} className={`w-full p-2 mt-1 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`}>
                      <option value="Category">{isClient ? t("category") : "Category"}</option>
                      <option value="Name">{isClient ? t("name") : "Name"}</option>
                      <option value="ObjectType">{isClient ? t("object_type") : "ObjectType"}</option>
                      <option value="Tag">{isClient ? t("tag") : "Tag"}</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${darkMode ? "text-custom-zinc-400" : "text-custom-zinc-600"}`}>{isClient ? t("operator") : "Operator"}</label>
                    <select value={row.operator} onChange={(e) => handleRowChange(row.id, { operator: e.target.value as any })} className={`w-full p-2 mt-1 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`}>
                      <option value="include">{isClient ? t("include") : "include"}</option>
                      <option value="equal">{isClient ? t("equal") : "equal"}</option>
                      <option value="startsWith">{isClient ? t("starts_with") : "startsWith"}</option>
                      <option value="endsWith">{isClient ? t("ends_with") : "endsWith"}</option>
                      <option value="from to">{isClient ? t("from_to") : "from to"}</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${darkMode ? "text-custom-zinc-400" : "text-custom-zinc-600"}`}>{isClient ? t("value") : "Value"}</label>
                    {row.attribute === "Category" ? (
                      <select value={row.value} onChange={(e) => handleRowChange(row.id, { value: e.target.value })} className={`w-full p-2 mt-1 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`}>
                        <option value="">{isClient ? t("select_category") : "Select category"}</option>
                        {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                      </select>
                    ) : row.operator === "from to" ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <input type="text" value={row.value} onChange={(e) => handleRowChange(row.id, { value: e.target.value })} placeholder={isClient ? t("start_value") : "Start value"} className={`w-full p-2 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`} />
                        <span>~</span>
                        <input type="text" value={row.valueEnd || ""} onChange={(e) => handleRowChange(row.id, { valueEnd: e.target.value })} placeholder={isClient ? t("end_value") : "End value"} className={`w-full p-2 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`} />
                      </div>
                    ) : (
                      <input type="text" value={row.value} onChange={(e) => handleRowChange(row.id, { value: e.target.value })} placeholder={isClient ? t("enter_attribute", { attribute: row.attribute }) : `Enter ${row.attribute}...`} className={`w-full p-2 mt-1 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 flex justify-between items-center">
              <button onClick={handleAddRow} className={`p-2 rounded flex items-center ${darkMode ? "bg-custom-blue-600 text-white hover:bg-custom-blue-700" : "bg-custom-blue-500 text-white hover:bg-custom-blue-600"}`}>
                <Plus size={18} className="mr-1" />
                {isClient ? t("add_condition") : "Add Condition"}
              </button>
              <button onClick={handleAdvancedSearch} disabled={isSearching} className={`p-2 px-4 rounded-xl flex items-center gap-2 ${darkMode ? "bg-custom-blue-600 text-white hover:bg-custom-blue-700" : "bg-custom-blue-500 text-white hover:bg-custom-blue-600"} disabled:bg-gray-400`}>
                {isSearching ? <Spinner size="sm" /> : <Search size={18} />}
                {isSearching ? (isClient ? t("searching") : "Searching...") : (isClient ? t("search") : "Search")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full relative">
              <input type="text" value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} placeholder={t("search_by_name")} className={`w-full p-2 rounded border ${darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"}`} />
            </div>
            <button onClick={handleSimpleSearch} disabled={isSearching} className={`w-full p-2 rounded flex items-center justify-center ${darkMode ? "bg-custom-blue-600 text-white hover:bg-custom-blue-700" : "bg-custom-blue-500 text-white hover:bg-custom-blue-600"} disabled:bg-gray-400`}>
              {isSearching ? <Spinner size="sm" /> : <Search size={18} className="mr-2" />}
              {isSearching ? (isClient ? t("searching") : "Searching...") : (isClient ? t("search") : "Search")}
            </button>
          </div>
        )}

        {/* Search Results */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-bold mb-4">{t("search_results")}</h3>
          <div className="flex-grow overflow-y-auto space-y-2">
            {resultGroups.length === 0 ? (
              <p className="text-gray-500">{t("no_results_yet")}</p>
            ) : (
              resultGroups.map((group) => (
                <div key={group.id} className={`border rounded-xl ${darkMode ? "border-gray-700" : "border-gray-600"}`}>
                  <div className={`flex items-center justify-between p-2 rounded-t-xl cursor-pointer ${darkMode ? "bg-gray-800" : "bg-gray-700"}`} onClick={() => toggleGroupCollapse(group.id)}>
                    <div className="flex items-center flex-grow">
                      {group.isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      {group.isEditing ? (
                        <input type="text" defaultValue={group.name} className={`ml-2 p-1 text-sm rounded ${darkMode ? "bg-gray-700" : "bg-gray-600"}`} onClick={(e) => e.stopPropagation()} onBlur={(e) => handleGroupNameChange(group.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGroupNameChange(group.id, e.currentTarget.value); }} autoFocus />
                      ) : (
                        <span className="font-semibold ml-2">{group.name}</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <button onClick={(e) => { e.stopPropagation(); onToggleAddMode(true, group.id); }} className={`p-1 rounded ${addingToGroup === group.id ? "bg-green-500" : "text-gray-400 hover:text-white"}`}>
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
                        <li key={item.id} className={`flex items-center justify-between p-1 rounded cursor-pointer ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-600"}`} onClick={() => handleItemClick(item.fragmentId, item.expressID)}>
                          <span className="truncate" title={item.name}>{item.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(group.id, item.id); }} className="p-1 text-red-500 hover:text-red-700">
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
      </div>
    </div>
  );
});

export default SearchPanel;