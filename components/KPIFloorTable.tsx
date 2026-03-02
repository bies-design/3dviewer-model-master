import React,{useMemo,useEffect,useState} from "react";
import { useEMS } from "@/contexts/EMSProvider";

interface KPIFloorTableProps {
  loadedModelIds: string[];
  darkMode?: boolean;
}


const KPIFloorTable: React.FC<KPIFloorTableProps> = ({ loadedModelIds,darkMode = true }) => {

  const { currentData } = useEMS();
  const [availableFloors, setAvailableFloors] = useState<string[]>([]);
  
  // --- 1. 樓層解析工具 ---
  const extractFloorFromModelId = (modelId: string): string | null => {
      // try {
      // let tempId = modelId.replace('.ifc.frag', '');
      // if (tempId.endsWith('_')) tempId = tempId.slice(0, -1);
      // const parts = tempId.split('_');
      // return parts[parts.length - 1];
      // } catch (e) {
      // return null;
      // }
      try {
        // 去除路徑前綴 (models/) 與 副檔名 (.ifc.frag)
        // 範例：models/1772094551333-13F-CurtainWall.ifc.frag 
        // -> 1772094551333-13F-CurtainWall
        const cleanId = modelId.split('/').pop()?.replace('.ifc.frag', '') || '';
        
        // 使用 '-' 進行分割
        // 分割後會得到：["1772094551333", "13F", "CurtainWall"]
        const parts = cleanId.split('-');
        
        // 樓層資訊固定在 index 1 的位置
        const floor = parts[1]; 
        
        return floor || null;
      } catch (e) {
          console.error("Parse floor error:", e);
          return null;
      }
  };
  // --- 2. 初始化樓層列表 ---
  useEffect(() => {
      const floors = loadedModelIds
      .map(extractFloorFromModelId)
      .filter((f): f is string => f !== null && f !== "" && f != 'all');

      const uniqueFloors = Array.from(new Set(floors));

      uniqueFloors.sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

      setAvailableFloors(uniqueFloors);
  }, [loadedModelIds]);
  // 數據合併邏輯
  const displayData = useMemo(() => {
    const sortedFloors = [...availableFloors].sort((a, b) => 
      b.localeCompare(a, undefined, { numeric: true })
    );
    return sortedFloors.map(floorName => {
      // 在 Context 數據中尋找對應的樓層資料
      const liveInfo = currentData.find(d => d.floor === floorName);

      return {
        floor: floorName,
        // 如果找不到資料則給予預設值
        kw: liveInfo?.kw ?? "--", 
        temp: liveInfo?.temp ?? "--",
        humi: liveInfo?.humi ?? "--",
        co2: liveInfo?.co2 ?? "--",
      };
    });
  },[availableFloors, currentData])
  // 1. 準備模擬或即時數據

  return (
    <div className="flex flex-col w-full p-4 overflow-y-auto">
      {/* 標題與標籤 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <h3 className="text-white text-lg font-bold">樓層KPI</h3>
      </div>

      {/* 表頭標籤 */}
      <div className="grid grid-cols-5 gap-1 mb-2 px-2">
        <div className="flex justify-center">
          <span className="px-3 py-1 border border-blue-500/50 text-sm text-white bg-blue-900/20">KW</span>
        </div>
        <div className="flex justify-center">
          <span className="px-3 py-1 border border-blue-500/50 text-sm text-white bg-blue-900/20">TEMP</span>
        </div>
        <div className="flex justify-center opacity-0">FLOOR</div> {/* 佔位 */}
        <div className="flex justify-center">
          <span className="px-3 py-1 border border-blue-500/50 text-sm text-white bg-blue-900/20">HUMI</span>
        </div>
        <div className="flex justify-center">
          <span className="px-3 py-1 border border-blue-500/50 text-sm text-white bg-blue-900/20">CO2</span>
        </div>
      </div>

      {/* 資料列容器 */}
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {displayData.map((item, index) => (
          <div 
            key={item.floor} 
            className={`grid grid-cols-5 items-center py-2 px-1 hover:bg-white/5 transition-colors ${
              index !== displayData.length - 1 ? "border-b border-blue-500/10" : ""
            }`}
          >
            {/* KW */}
            <div className="flex items-center justify-start gap-2 px-2">
              <div className="w-3 h-3 rounded-full bg-purple-500/80 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              <span className="text-white font-mono text-sm">{item.kw}</span>
            </div>

            {/* TEMP */}
            <div className="flex items-center justify-start gap-2 px-2">
              <div className="w-3 h-3 rounded-full bg-blue-500/80 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-white font-mono text-sm">{item.temp}</span>
            </div>

            {/* FLOOR (中心列) */}
            <div className="flex justify-center relative">
              <div className="absolute inset-0 bg-blue-500/30 -skew-x-12" />
              <span className="relative z-10 text-white/80 font-bold text-xs">{item.floor}</span>
            </div>

            {/* HUMI */}
            <div className="flex items-center justify-start gap-2 px-2">
              <div className="w-3 h-3 rounded-full bg-amber-500/80 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-white font-mono text-sm">{item.humi}</span>
            </div>

            {/* CO2 */}
            <div className="flex items-center justify-start gap-2 px-2">
              <div className="w-3 h-3 rounded-full bg-teal-500/80 shrink-0 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              <span className="text-white font-mono text-sm">{item.co2}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KPIFloorTable;