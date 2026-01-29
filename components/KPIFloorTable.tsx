import React,{useMemo,useEffect,useState} from "react";

interface FloorData {
  floor: string;
  kw: number | string;
  temp: number | string;
  humi: number | string;
  co2: number | string;
}

interface KPIFloorTableProps {
  loadedModelIds: string[];
  darkMode?: boolean;
}


const KPIFloorTable: React.FC<KPIFloorTableProps> = ({ loadedModelIds,darkMode = true }) => {

  const [availableFloors, setAvailableFloors] = useState<string[]>([]);
  
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
  
  // 1. 準備模擬或即時數據
    const data = useMemo(() => {
      // 將樓層列表排序 (從高樓層往低樓層排列比較符合直覺)
      const sortedFloors = [...availableFloors].sort((a, b) => 
        b.localeCompare(a, undefined, { numeric: true })
      );
  
      return sortedFloors.map(floor => ({
        floor: floor,
        kw: (Math.random() * 10 + 2).toFixed(2), // 這裡換成您的即時 API 數據
        temp: (Math.random() * 5 + 22).toFixed(1),
        humi: Math.floor(Math.random() * 20 + 40),
        co2: Math.floor(Math.random() * 500 + 300),
      }));
    }, [availableFloors]);

  return (
    <div className="flex flex-col w-full p-4 select-none">
      {/* 標題與標籤 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <h3 className="text-white text-lg font-bold">KPI All Floor</h3>
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
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {data.map((item, index) => (
          <div 
            key={item.floor} 
            className={`grid grid-cols-5 items-center py-2 px-1 hover:bg-white/5 transition-colors ${
              index !== data.length - 1 ? "border-b border-blue-500/10" : ""
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