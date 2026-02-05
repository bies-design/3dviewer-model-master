"use client";

import React, { useState, useEffect, useCallback, useRef,useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, ChevronRight, X } from "lucide-react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as THREE from "three";
import { useAppContext } from "@/contexts/AppContext";
import { Select ,SelectItem} from "@heroui/react";

type FocusMode = 'top-down' | 'isometric' | 'tight-fit';

interface FloorModePanelProps {
    components: OBC.Components;
    outlinerRef: React.MutableRefObject<OBCF.Outliner| null>;
    markerRef: React.MutableRefObject<OBCF.Marker | null>;
    darkMode: boolean;
    onFocus: (mode?: FocusMode) => Promise<void>;
    handleSwitchViewMode: (mode: "global" | "allfloors" | "floor" | "device" | "warnings" | "issueforms") => Promise<void>;
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

const FloorModePanel: React.FC<FloorModePanelProps> = ({
    components,
    markerRef,
    outlinerRef,
    darkMode,
    loadedModelIds,
    handleSwitchViewMode,
    onFocus,
    cameraRef,
    fragmentsRef,
    highlighterRef,
}) => {

const { selectedFloor, setSelectedFloor, viewMode,selectedDevice, setSelectedDevice , setSelectedFragId, setSelectedDeviceName,
        setIsGlobalLoading,setLoadingMessage,setIsCCTVOn,setIsHVACOn,setIsEACOn
        } = useAppContext(); 

const [availableFloors, setAvailableFloors] = useState<string[]>([]);
const [filteredDevices, setFilteredDevices] = useState<TResultItem[]>([]);
const [searchText, setSearchText] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [debouncedSearch, setDebouncedSearch] = useState("");

const isLoadingRef = useRef(false);

// 記錄哪些種類被展開了 (儲存種類名稱字串) 用set保證不重複
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
// 用來避免重複觸發的 Ref
const prevSelectedFloorRef = useRef<string | null | undefined>(undefined);

const lastViewModeRef = useRef<string>(viewMode)

const viewModeRef = useRef(viewMode);// for usecallback用
// 使用 useEffect 隨時同步最新值到 Ref
useEffect(() => {
    viewModeRef.current = viewMode;
}, [viewMode]);

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
    
    if(isLoadingRef.current){
        console.log("過度頻繁呼叫 所以我擋住了");
        return;
    }

    isLoadingRef.current = true;

    setIsLoading(true);

    setSelectedDevice(null);
    setSelectedDeviceName(null);

    prevSelectedFloorRef.current = floor;
    lastViewModeRef.current = 'floor';

    const hider = components.get(OBC.Hider);
    const highlighter = components.get(OBCF.Highlighter);
    setSearchText('');
    setIsLoading(true);
    setIsGlobalLoading(true);
    setLoadingMessage("正在分離樓層...");

    try {
        await highlighter.clear("select");

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

        console.log("依照樓層找到",foundElements);
        
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

            // 視覺呈現邏輯
            if (!floor) {
                await hider.set(true); // 選取全部時，顯示所有模型物件
            } else {
                await hider.isolate(finalResult); // 選取特定樓層時，隔離顯示
            }
            
            setFilteredDevices(foundItems);
            
            await onFocus('top-down');
            // // 確保渲染完成後再對焦
            // await cameraRef.current?.fitToItems(finalResult);
            // console.log("第一個focus")
        } 
        else {
            await hider.set(true); 
            setFilteredDevices([]);
        }

    } catch (error) {
        console.error("Floor search failed:", error);
    } finally {
        setIsLoading(false);
        setIsGlobalLoading(false);
        isLoadingRef.current = false;
    }
}, [components, loadedModelIds, viewMode]);

// 只有在以下兩種情況才執行 3D 隔離與資料抓取：
// 1. 樓層真正改變時 (手動下拉選單)
// 2. 當模式是 'floor' 且沒有選中設備時 (表示從 device 模式退回)
useEffect(() => {
    if(selectedFloor !== prevSelectedFloorRef.current){
        console.log("樓層改變 使用者手動切換樓層",selectedFloor,prevSelectedFloorRef);
        fetchAndIsolateFloor(selectedFloor as string | null);
    }else if(viewMode === 'floor' && !selectedDevice && lastViewModeRef.current === 'device'){
        console.log("從設備模式切換floor模式 重新渲染樓層",);
        fetchAndIsolateFloor(selectedFloor as string | null);
    }
    lastViewModeRef.current = viewMode;
}, [selectedFloor, viewMode, selectedDevice, fetchAndIsolateFloor]);

// searchBar Debounce 
useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearch(searchText);
    }, 300); //delay 300 ms

    return () => clearTimeout(handler);
}, [searchText]);

useEffect(() => {
    const highlighter = highlighterRef.current;
    if (!highlighter) return;

    // 檢查是否已經設定過 'hover' 樣式
    if (!highlighter.styles.has('hover')) {
        
        // 根據官方文件，styles 是一個 DataMap
        // 我們需要設定名稱 ('hover') 和材質定義
        // 如果要設為 null (不著色只選取) 可以傳 null，但我們要自定義顏色
        
        highlighter.styles.set('hover', {
            color: new THREE.Color(0x00FFFF), // 金黃色
            opacity: 1,
            transparent: false,
            depthTest: false, // 讓它能透過牆壁被看到
            renderedFaces: 1,
        });

        console.log("✅ 'hover' style registered successfully via styles.set()");
    }
}, [highlighterRef]);

//mouse enter then highlight the corresponding device(3D Object)
const handleMouseEnter = async (device: TResultItem) => {
    const highlighter = highlighterRef.current;
    if (!highlighter) return;

    // 建構選取集
    const selection = { [device.fragmentId]: new Set([device.expressID]) };
    
    // 使用 'hover' 這個名稱來 highlight，避免影響 'select'
    //remove previous 交給handlemouseleave
    await highlighter.highlightByID('hover', selection, false, true);
};
//mouse leave then clear the highlighted device
const handleMouseLeave = async () => {
    const highlighter = highlighterRef.current;
    if (!highlighter) return;

    // 清除 'hover' 樣式，但保留 'select'
    await highlighter.clear('hover');
};
// 現在這裡只需要單純更新 Context，剩下的交給上面的 useEffect
const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (setSelectedFloor) {
        setSelectedFloor(val === "" ? null : val);
        console.log("設定樓層",val);
    }
};

// 第一步：先過濾搜尋關鍵字（保留你原本的邏輯）
const displayDevices = useMemo(() => {
    return filteredDevices.filter(d => 
        !debouncedSearch || d.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
}, [debouncedSearch, filteredDevices]); 

// 第二步：將過濾後的結果進行「種類分組」
const groupedDevices = useMemo(() => {
    const groups: Record<string, TResultItem[]> = {};
    
    // 這裡使用你原本過濾搜尋關鍵字後的結果
    displayDevices.forEach((device) => {
        const cat = device.category || "未分類";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(device);
    });

    // 可選：對種類名稱進行排序（例如 A-Z）
    const sortedKeys = Object.keys(groups).sort();
    const sortedGroups: Record<string, TResultItem[]> = {};
    sortedKeys.forEach(key => {
        sortedGroups[key] = groups[key];
    });

    return sortedGroups;

}, [displayDevices]);// 當過濾後的清單改變時，才重新分組

// 使用 useMemo 優化效能，只有在延遲後的值或原始列表改變時才計算

// --- 6. 點擊單一設備 ---
const handleDeviceClick = async (device: TResultItem) => {
    const hider = components.get(OBC.Hider);
    
    const selection = {[device.fragmentId]: new Set([device.expressID])};

    try {
        // 1. 3D 邏輯：隔離並聚焦
        await hider.isolate(selection);
        
        // 儲存選中的設備，供新的面板使用
        if (setSelectedDevice) setSelectedDevice(device.expressID);
        if (setSelectedFragId) setSelectedFragId(device.fragmentId);
        if (setSelectedDeviceName) setSelectedDeviceName(device.name);

        setSearchText(device.name);

        console.log("選中",device.expressID);
        console.log("選中",device.fragmentId);
        console.log("選中",device.name);
        // 2. 狀態邏輯：切換到 device 模式
        // if(handleSwitchViewMode) await handleSwitchViewMode('device');
        
        console.log("切換至設備模式:", device);
        await onFocus('tight-fit');
        
    }catch(e){
        console.log("選中失敗",e);
    }   
};

// 1. 定義樓層模式專屬處理函數
const floorHighlightHandler = useCallback(async (selection: OBC.ModelIdMap) => {

    console.log("現在的viewmode是",viewModeRef.current);
    // if(viewModeRef.current === 'device') return;
    
    // // 若上面marker.dispose()沒有刪好 這段強制清除所有幽靈標記
    // const existingMarkers = document.querySelectorAll('.bim-marker-label');
    // existingMarkers.forEach((el) => {
    //     el.remove();
    // });

    
    const hider = components.get(OBC.Hider);
    if (!Object.keys(selection).length) return;
        
    console.log("Floor Mode 專屬點擊邏輯:", selection);

    try{
        await hider.isolate(selection);
        
        //提取expresId from selection
        const modelId = Object.keys(selection);
        const expressIdSet = selection[modelId[0]];
        const expressId = Array.from(expressIdSet)[0];
        
        if(modelId[0]) {
            const model = fragmentsRef.current?.list.get(modelId[0]);
            if(model && expressId){
                // 2. 使用 getItemsData 查詢該 ID 的屬性
                // 這會回傳一個陣列，包含該元件的所有屬性資料
                const itemData = await model.getItemsData([expressId]);

                if (itemData && itemData[0]) {
                    // 3. 提取 Name 屬性的值 (IFC 屬性通常包在 .value 裡)
                    const attributes = itemData[0];
                    if(attributes && attributes.Name){
                        // 叫ts閉嘴
                        const deviceName = (attributes.Name as any).value;
                        setSelectedDeviceName(deviceName);
                        setSearchText(deviceName);
                        console.log("選中",deviceName);
                    }
                }
            }
        }  

        console.log("選中",expressId);
        console.log("選中",modelId[0]);
        

        console.log("清理畫面上所有標記");

        markerRef.current?.dispose();
        outlinerRef.current?.dispose();

        setIsCCTVOn(false);
        setIsEACOn(false);
        setIsHVACOn(false);
        

        if (setSelectedDevice) setSelectedDevice(expressId);
        if (setSelectedFragId) setSelectedFragId(modelId[0]);
        // if (handleSwitchViewMode) handleSwitchViewMode('device');
        console.log("切換至設備模式:", modelId[0]);

        await cameraRef.current?.fitToItems(selection);
        await highlighterRef.current?.clear();
        

        

    }catch (e){
        console.log("選中失敗",e);
    }
}, []);

const floorOptions = [
    { key: "", label: "全部" }, 
    ...availableFloors.map(floor => ({ key: floor, label: floor }))
];
// 當搜尋文字改變時，自動展開所有有結果的分組 避免使用者查詢後看不到結果
useEffect(() => {
    if (debouncedSearch) {
        const allCategoriesWithResults = Object.keys(groupedDevices);
        setExpandedCategories(new Set(allCategoriesWithResults));
    } else {
        // 如果清空搜尋，則恢復全部收合（或是保留現狀）
        setExpandedCategories(new Set());
    }
}, [debouncedSearch, groupedDevices]);

// --- 當搜尋結果改變時，同步過濾 3D 畫面 ---
useEffect(() => {
    const syncVisualSearch = async () => {
        const hider = components.get(OBC.Hider);
        
        // 1. 如果有搜尋文字，且有搜尋結果 -> 只顯示搜尋到的結果
        if (debouncedSearch && displayDevices.length > 0) {
            const searchResultMap: { [id: string]: Set<number> } = {};
            
            displayDevices.forEach(device => {
                if (!searchResultMap[device.fragmentId]) {
                    searchResultMap[device.fragmentId] = new Set();
                }
                searchResultMap[device.fragmentId].add(device.expressID);
            });

            await hider.isolate(searchResultMap);
        } 
        // 2. 如果搜尋文字被清空 -> 恢復顯示目前選中的樓層 (或是全部)
        else if (!debouncedSearch) {
            // 注意：要確保這不會造成無窮迴圈，或者手動還原 hider 狀態
            if (filteredDevices.length > 0) {
                 // 還原成該樓層所有物件
                const floorMap: { [id: string]: Set<number> } = {};
                filteredDevices.forEach(d => {
                if (!floorMap[d.fragmentId]) floorMap[d.fragmentId] = new Set();
                floorMap[d.fragmentId].add(d.expressID);
                });
                await hider.isolate(floorMap);
        }
        }
    };

    syncVisualSearch();
}, [debouncedSearch, displayDevices, components, filteredDevices]);

// 2. 生命週期管理
useEffect(() => {
    if (!highlighterRef?.current) return;
    const highlighter = highlighterRef.current;

    // 掛載子監聽器
    highlighter.events.select.onHighlight.add(floorHighlightHandler);
    console.log("✅ 已掛載 FloorMode 專屬監聽器");

    return () => {
        // 重要：卸載子監聽器，否則切換回 Global 時會發生重複執行
        highlighter.events.select.onHighlight.remove(floorHighlightHandler);
        console.log("❌ 已卸載 FloorMode 專屬監聽器");
    };
}, [highlighterRef, floorHighlightHandler]);

return (
    <div className="flex flex-col h-full gap-1 p-4">
        <h3 className="text-2xl font-semibold mb-4">{viewMode === 'floor'? "單層模式" : "設備模式"}</h3>
        <div className="flex items-center gap-2">
            <label className="text-lg font-medium shrink-0">樓層</label>
            <Select
                aria-label="floor selector"
                placeholder="全部"
                className="max-w-xs"
                selectedKeys={selectedFloor ? [selectedFloor] : []}
                items={floorOptions}
                onChange={(e) => onSelectChange(e)}
                classNames={{
                trigger: "rounded-none bg-white/10 backdrop-blur-md border border-white/20 data-[hover=true]:bg-white/20", // 觸發按鈕：半透明+毛玻璃
                popoverContent: "hud-panel rounded-none bg-black/10 backdrop-blur-xl border border-white/10", // 下拉選單本身：深色半透明
                value: "text-white group-data-[has-value=true]:text-white",
                }}
                disallowEmptySelection
            >
                {(item) => (
                    <SelectItem key={item.key} className="text-white">
                        {item.label}
                    </SelectItem>
                )}
            </Select> 
        </div>

        <div className="relative flex items-center gap-2">
            <label className="text-lg font-medium shrink-0">查詢</label>
            <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={"在目前條件查詢..."}
            className={`w-full p-2 pl-10 border ${
                darkMode ? "text-white border-white/20 bg-white/10 backdrop-blur-md" : "bg-light-background text-gray-900 border-gray-300"
            }`}
            />
            <Search size={18} className="absolute left-1/5 top-50/100 -translate-y-1/2 opacity-50" />
            {(searchText !== "") && <X size={18} onClick={()=>{setSearchText("");setSelectedDevice(null);setSelectedDeviceName(null);}} className="absolute right-3 top-50/100 -translate-y-1/2 opacity-50 cursor-pointer"/>}
        </div>

        <div className="flex-grow overflow-y-auto">
            <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
            {"設備列表"} ({displayDevices.length})
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            </h4>

            {displayDevices.length === 0 ? (
                <p className="text-sm text-white/80 text-center py-8">
                    {isLoading ? "載入中..." : "未找到設備"}
                </p>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedDevices).map(([category, devices]) => {
                        const isExpanded = expandedCategories.has(category);
                        
                        return (
                            <div key={category} className="flex flex-col border-b border-gray-500/30 pb-2">
                                {/* 分組標題列 */}
                                <div 
                                    onClick={() => toggleCategory(category)}
                                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-500/10 rounded transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-[#2BC3EC]">[{category}]</span>
                                        <span className="text-xs opacity-50">({devices.length})</span>
                                    </div>
                                    {/* 展開收合圖示 */}
                                    <ChevronRight 
                                        size={18} 
                                        className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} 
                                    />
                                </div>

                                {/* 該種類下的設備列表 */}
                                {isExpanded && (
                                    <ul className="mt-1 space-y-1 pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {devices.map((device) => (
                                            <li
                                                key={device.id}
                                                onClick={() => handleDeviceClick(device)}
                                                onMouseEnter={() => handleMouseEnter(device)}
                                                onMouseLeave={() => handleMouseLeave()}
                                                className={`p-3 rounded cursor-pointer transition-colors text-sm ${
                                                    darkMode ? "bg-gray-700/50 hover:bg-gray-600" : "bg-gray-200/50 hover:bg-gray-300"
                                                }`}
                                            >
                                                <div className="font-medium truncate">{device.name}</div>
                                                <div className="text-[10px] opacity-60">ID: {device.expressID}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
);
};

export default FloorModePanel;