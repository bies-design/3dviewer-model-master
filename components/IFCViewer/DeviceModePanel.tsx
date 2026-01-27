"use client";

import React, { useState, useEffect, useCallback, useRef,useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2 } from "lucide-react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { useAppContext } from "@/contexts/AppContext";
import { Asap_Condensed } from "next/font/google";

interface FloorModePanelProps {
    components: OBC.Components;
    darkMode: boolean;
    onFocus: () => void;
    loadedModelIds: string[];
    cameraRef: React.MutableRefObject<OBC.OrthoPerspectiveCamera | null>;
    fragmentsRef: React.RefObject<OBC.FragmentsManager | null>;
    highlighterRef: React.MutableRefObject<OBCF.Highlighter | null>;
}

type TQueryRow = {
    attribute: "Name"; 
    operator: "include";
    value: string;
    logic: "AND";
};

type TResultItem = {
    id: string;
    name: string;
    category: string;
    expressID: number;
    fragmentId: string;
    floor: string;
};
const DeviceModePanel: React.FC<FloorModePanelProps> = ({
    components,
    darkMode,
    loadedModelIds,
    onFocus,
    cameraRef,
    fragmentsRef,
    highlighterRef,
}) => {

const { selectedFloor, setSelectedFloor,setViewMode,selectedDevice, setSelectedDevice ,selectedFragId, setSelectedFragId, selectedDeviceName, setSelectedDeviceName} = useAppContext(); 

const [availableFloors, setAvailableFloors] = useState<string[]>([]);
const [filteredDevices, setFilteredDevices] = useState<TResultItem[]>([]);
const [searchText, setSearchText] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [debouncedSearch, setDebouncedSearch] = useState("");

// 記錄哪些種類被展開了 (儲存種類名稱字串) 用set保證不重複
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

// 用來避免重複觸發的 Ref
const prevSelectedFloorRef = useRef<string | null | undefined>(undefined);


// 切換種類group展開/收合的函式
const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
        const next = new Set(prev);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        return next;
    });
};

// --- 1. 樓層解析工具 ---
const extractFloorFromModelId = (modelId: string): string | null => {
    try {
    let tempId = modelId.replace('.ifc.frag', '');
    if (tempId.endsWith('_')) tempId = tempId.slice(0, -1);
    const parts = tempId.split('_');
    return parts[parts.length - 1];
    } catch (e) { 
    return null;
    }
};

// --- 2. 初始化樓層列表 ---
useEffect(() => {
    const floors = loadedModelIds
    .map(extractFloorFromModelId)
    .filter((f): f is string => f !== null && f !== "");

    const uniqueFloors = Array.from(new Set(floors));

    uniqueFloors.sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    setAvailableFloors(uniqueFloors);
}, [loadedModelIds]);

// --- 3. 核心功能：根據樓層載入設備 (獨立函式) ---
// --- 3. 核心功能：根據樓層載入設備 (篩選 Name 不為空) ---
const fetchAndIsolateFloor = useCallback(async (floor: string | null) => {
    const hider = components.get(OBC.Hider);
    const highlighter = components.get(OBCF.Highlighter);

    setIsLoading(true);

    try {

        if(!selectedDevice) await highlighter.clear("select");

        // 修改查詢邏輯：
        // 如果有 floor，搜尋包含 floor 名稱的設備。
        // 如果沒有 floor，搜尋 Name 包含空字串的設備 (意即所有有名稱的設備)。
        const query: TQueryRow = {
            attribute: "Name",
            operator: "include",
            value: floor ? floor : "", // 當 floor 為 null 時，傳入空字串 ""
            logic: "AND"
        };

        const response = await fetch('/api/elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                queries: [query], 
                modelIds: loadedModelIds 
            }),
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
                    category: attributes._category.value || `Undefined`,
                    expressID,
                    fragmentId: modelId,
                    floor: floor || "All"
                });
            }

            if(!selectedDevice){
                // 視覺呈現邏輯
                if (!floor) {
                    await hider.set(true); // 選取全部時，顯示所有模型物件
                } else {
                    await hider.isolate(finalResult); // 選取特定樓層時，隔離顯示
                }
            }

            setFilteredDevices(foundItems);
            
            // 確保渲染完成後再對焦
            if(!selectedDevice) await cameraRef.current?.fitToItems(finalResult);
            console.log("第一個focus")
        
        } 
        else {
            await hider.set(true); 
            setFilteredDevices([]);
        }

    } catch (error) {
        console.error("Floor search failed:", error);
    } finally {
        setIsLoading(false);
    }
}, [components, loadedModelIds, onFocus]);

// --- ★★★ 關鍵修正：監聽 selectedFloor 變化 ★★★ ---
// 無論是「下拉選單」還是「3D 點擊」改變了 selectedFloor，這裡都會觸發並更新列表
useEffect(() => {
    // 避免初次渲染或重複執行相同樓層的查詢
    // 注意：如果是 null (全景) 也要執行
    if (selectedFloor !== prevSelectedFloorRef.current) {
        fetchAndIsolateFloor(selectedFloor as string | null);
        prevSelectedFloorRef.current = selectedFloor;
    }
}, [selectedFloor, fetchAndIsolateFloor]);

// Debounce 邏輯
useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearch(searchText);
    }, 300); // 延遲 300ms

    return () => clearTimeout(handler);
}, [searchText]);

// --- 4. 處理下拉選單變更 ---
// 現在這裡只需要單純更新 Context，剩下的交給上面的 useEffect
const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (setSelectedFloor) {
        setSelectedFloor(val === "" ? null : val);
    }
};

// --- 5. 前端搜尋過濾 debounce ---
const displayDevices = useMemo(() => {
    return filteredDevices.filter(d => 
        !debouncedSearch || d.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
}, [debouncedSearch, filteredDevices]); 
// 使用 useMemo 優化效能，只有在延遲後的值或原始列表改變時才計算

// --- 6. 點擊單一設備 ---
const handleDeviceClick = async (device: TResultItem) => {
    const hider = components.get(OBC.Hider);
    
    const selection = {[device.fragmentId]: new Set([device.expressID])};

    try {
        // 1. 3D 邏輯：隔離並聚焦
        await hider.isolate(selection);
        await cameraRef.current?.fitToItems(selection); 
        console.log("選中",device.expressID);

        // 儲存選中的設備，供新的面板使用
        if (setSelectedDevice) setSelectedDevice(device.expressID);
        if (setSelectedFragId) setSelectedFragId(device.fragmentId);
        if (setSelectedDeviceName) setSelectedDeviceName(device.name);
        
        console.log("選中",device.expressID);
        console.log("選中",device.fragmentId);
        console.log("選中",device.name);

    }catch(e){
        console.log("選中失敗",e);
    }   
};

// // 1. 定義樓層模式專屬處理函數
// const floorHighlightHandler = useCallback(async (selection: OBC.ModelIdMap) => {
//     const hider = components.get(OBC.Hider);
//     if (!Object.keys(selection).length) return;
        
//     console.log("Floor Mode 專屬點擊邏輯:", selection);
//   // 這裡你可以寫 Floor 模式下點擊物件要觸發的事，例如更新右側面板
//   // 或是什麼都不做，只讓它單純高亮（Highlighter 預設會處理高亮）

//     try{
//         await hider.isolate(selection);
//         await cameraRef.current?.fitToItems(selection);

//         const modelId = Object.keys(selection);
//         const expressIdSet = selection[modelId[0]];
//         const expressId = Array.from(expressIdSet)[0];
//         console.log("選中",expressId);
//         console.log("選中",modelId[0]);
//         await highlighterRef.current?.clear();

//         if (setSelectedDevice) setSelectedDevice(expressId);
//         if (setSelectedFragId) setSelectedFragId(modelId[0]);
        

//     }catch (e){
//         console.log("選中失敗",e);
//     }
// }, []);

// // 2. 生命週期管理
// useEffect(() => {
//     if (!highlighterRef?.current) return;
//     const highlighter = highlighterRef.current;

//     // 掛載子監聽器
//     highlighter.events.select.onHighlight.add(floorHighlightHandler);
//     console.log("✅ 已掛載 FloorMode 專屬監聽器");

//     return () => {
//         // 重要：卸載子監聽器，否則切換回 Global 時會發生重複執行
//         highlighter.events.select.onHighlight.remove(floorHighlightHandler);
//         console.log("❌ 已卸載 FloorMode 專屬監聽器");
//     };
// }, [highlighterRef, floorHighlightHandler]);

return (
    <div className="flex flex-col h-full p-4">
        <h3 className="text-2xl font-semibold mb-4">設備模式</h3>

        <div className="mb-4">
            {/* <label className="text-md font-medium mb-2 block">選擇樓層</label> */}
            <select
            value={typeof selectedFloor === 'string' ? selectedFloor : ""} 
            onChange={onSelectChange} // 改用新的 handler
            className={`w-full p-2 rounded border ${
                darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"
            }`}
            disabled={isLoading}
            >
            <option key="" value={""}>全部</option>
            {availableFloors.map((floor) => (
                <option key={floor} value={floor}>
                {floor}
                </option>
            ))}
            </select>
        </div>

        <div className="mb-4 relative">
            <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={selectedDeviceName ? selectedDeviceName: "搜尋設備..."}
            className={`w-full p-2 pl-10 rounded border ${
                darkMode ? "bg-custom-zinc-600 text-white border-gray-600" : "bg-light-background text-gray-900 border-gray-300"
            }`}
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
        </div>

        <div className="flex-grow overflow-y-auto">
            <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
            {"設備列表"} ({displayDevices.length})
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            </h4>

            {displayDevices.length === 0 ? (
            <p className="text-sm opacity-60 text-center py-8">
                {isLoading ? "載入中..." : "未找到設備"}
            </p>
            ) : (
            <ul className="space-y-2">
                {displayDevices.map((device) => (
                <li
                    key={device.id}
                    onClick={() => handleDeviceClick(device)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                    darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                    }`}
                >
                    <div className="font-medium truncate">{device.name}</div>
                    <div className="text-xs opacity-70">
                        ID: {device.category}
                    </div>
                </li>
                ))}
            </ul>
            )}
        </div>
    </div>
);
};

export default DeviceModePanel;