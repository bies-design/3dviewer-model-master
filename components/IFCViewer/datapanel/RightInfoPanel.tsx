import React ,{useState,useEffect}from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
    Thermometer, Droplets, Wind, Zap, Activity, Video, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface RightInfoPanelProps{
    floor: string;
}

// 定義我們篩選後要存的資料結構
interface FilteredCamera {
    id: string;
    name: string;   // 對應 cam.elementName
    status?: string; 
}

// 模擬數據：HVAC 出回水溫度 (溫差是效率關鍵)
const hvacData = [
    { time: '10:00', supply: 7.2, return: 11.5 },
    { time: '11:00', supply: 7.5, return: 12.0 },
    { time: '12:00', supply: 7.8, return: 13.2 }, // 中午負載高，回水溫升
    { time: '13:00', supply: 7.6, return: 13.0 },
    { time: '14:00', supply: 7.4, return: 12.5 },
    { time: '15:00', supply: 7.2, return: 12.0 },
    { time: '16:00', supply: 7.1, return: 11.8 },
];

// CCTV 列表模擬
const cameraList = [
    { id: 'C-01', loc: '大廳入口', status: 'active' },
    { id: 'C-02', loc: '機房通道', status: 'active' },
    { id: 'C-03', loc: '貨梯前室', status: 'warning' }, // 異常
];




const RightInfoPanel: React.FC<RightInfoPanelProps> = ({floor}) => {
    const {setToast} = useAppContext();

    const [floorCameras, setFloorCameras] = useState<FilteredCamera[]>([]);

    useEffect(() => {
        if (floor) {
            getFloorCameras();
        }
    }, [floor]);

    const getFloorCameras = async() => {
        try{
            const response = await fetch("/api/cameras");
            let latestCameras = []; 

            if (response.ok) {
                const data = await response.json();
                latestCameras = data;
            }
            const validCameras = latestCameras.filter((cam: any) => cam.elementName && cam.elementName.trim() !== "");

            // 4. 核心邏輯：篩選樓層 + 轉換格式
            const matchedCameras = validCameras
                // (A) 篩選: 檢查 elementName 是否包含目前的 floor 字串
                .filter((cam: any) => cam.elementName.includes(floor))
                // (B) 轉換: 轉成 { id, name } 格式 (這裡我多補了 status 以配合 UI)
                .map((cam: any) => ({
                    id: cam.id || cam._id, // 確保抓到 ID
                    name: cam.elementName,
                    status: 'active' // 預設為 active，若 API 有回傳 status 可改為 cam.status
                }));

            if (matchedCameras.length === 0) {
                setToast({ message: "目前沒有已關聯 BIM 元件的監視器", type: "warning" });
                return;
            }

            console.log(`樓層 ${floor} 配對到的攝影機:`, matchedCameras);
            setFloorCameras(matchedCameras);

        }catch(error) {
            console.error("Failed to fetch cameras:", error);
            setToast({ message: "獲取攝影機列表失敗", type: "error" });
        }

    }

    return (
        <div className="w-full h-full flex flex-col gap-3 p-2 pointer-events-auto">
        
        {/* --- 區塊 1: 環境舒適度綜覽 (最頂端 Summary) --- */}
        <div className="w-full h-[15%] flex gap-2">
            {/* 溫度 */}
            <div className=" flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    <Thermometer size={14} className="text-[#2BC3EC]" />
                    <span className="text-[10px] text-gray-400">平均溫度</span>
                </div>
                <span className="text-3xl font-mono text-white font-bold mt-2">24.5<span className="text-sm ml-1 text-gray-400">°C</span></span>
            </div>
            {/* 濕度 */}
            <div className=" flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    <Droplets size={14} className="text-[#2BC3EC]" />
                    <span className="text-[10px] text-gray-400">相對濕度</span>
                </div>
                <span className="text-3xl font-mono text-white font-bold mt-2">58<span className="text-sm ml-1 text-gray-400">%</span></span>
            </div>
            {/* CO2 (空氣品質) */}
            <div className=" flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    <Wind size={14} className="text-[#2BC3EC]" />
                    <span className="text-[10px] text-gray-400">CO2</span>
                </div>
                <span className="text-3xl font-mono text-green-400 font-bold mt-2">420<span className="text-sm ml-1 text-gray-400">ppm</span></span>
            </div>
        </div>

        {/* --- 區塊 2: HVAC 系統核心 (重點數據) --- */}
        <div className="w-full h-[40%]  p-3 flex flex-col">
            <div className="flex justify-between items-center mb-2 border-b border-gray-600/30 pb-2">
                <h3 className="text-[#2BC3EC] font-bold flex items-center gap-2">
                    <Activity size={18} /> HVAC 冰水系統
                </h3>
                <span className="text-xs text-green-400 border border-green-500/50 px-2 rounded bg-green-900/20">運行最佳化</span>
            </div>

            <div className="flex-1 flex gap-2">
                {/* 左側：負載儀表 (這裡放你的 LiquidFillGauge) */}
                <div className="w-1/3 flex flex-col items-center justify-center relative">
                    {/* 模擬 Liquid Gauge 的位置 */}
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center relative overflow-hidden bg-blue-900/20">
                        <div className="absolute bottom-0 w-full h-[65%] bg-blue-500/60 animate-pulse"></div>
                        <span className="relative z-10 text-xl font-bold text-white">65%</span>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">系統負載率</span>
                </div>

                {/* 右側：出回水溫差圖表 (AreaChart) */}
                <div className="w-2/3 flex flex-col">
                    <div className="flex justify-end gap-3 text-[10px] mb-1">
                        <span className="flex items-center gap-1 text-gray-300"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>回水</span>
                        <span className="flex items-center gap-1 text-gray-300"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>出水</span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hvacData}>
                                <defs>
                                    <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis domain={[5, 15]} stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={25}/>
                                <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #333'}} itemStyle={{fontSize: '12px'}}/>
                                <Area type="monotone" dataKey="return" stroke="#eab308" fillOpacity={1} fill="url(#colorReturn)" strokeWidth={2} />
                                <Area type="monotone" dataKey="supply" stroke="#06b6d4" fillOpacity={1} fill="url(#colorSupply)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* 底部小數據列 */}
            <div className="flex justify-between mt-2 pt-2 border-t border-gray-600/30">
                <div className="text-center">
                    <p className="text-[10px] text-gray-400">即時功耗</p>
                    <p className="text-sm font-mono text-white">45.2 <span className="text-[10px]">kW</span></p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-gray-400">運轉效率</p>
                    <p className="text-sm font-mono text-[#2BC3EC]">0.78 <span className="text-[10px]">kW/RT</span></p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-gray-400">溫差 (ΔT)</p>
                    <p className="text-sm font-mono text-yellow-400">5.0 <span className="text-[10px]">°C</span></p>
                </div>
            </div>
        </div>

        {/* --- 區塊 3: CCTV 監控與安全 (影像與狀態) --- */}
        <div className="w-full flex-1 p-3 flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-[#2BC3EC] font-bold flex items-center gap-2">
                    <Video size={18} /> 安全監控
                </h3>
                <span className="text-[10px] text-gray-400 animate-pulse">LIVE ●</span>
            </div>

            <div className="flex gap-2 flex-1">
                {/* 左側：即時影像畫面 (Placeholder) */}
                <div className="w-3/5 h-full bg-black/40 rounded border border-gray-600/50 relative overflow-hidden group cursor-pointer">
                    {/* 模擬攝像頭畫面內容 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid grid-cols-8 grid-rows-8 w-full h-full opacity-20">
                            {/* 網格線裝飾 */}
                            {[...Array(64)].map((_,i) => <div key={i} className="border-[0.5px] border-green-500/10"></div>)}
                        </div>
                        <span className="text-xs text-gray-500 z-10">NO SIGNAL / SELECT CAM</span>
                    </div>
                    
                    {/* UI 覆蓋層 */}
                    <div className="absolute top-2 left-2 text-[10px] bg-red-600 text-white px-1 rounded">REC</div>
                    <div className="absolute bottom-2 left-2 text-[10px] text-green-400 font-mono">CAM-03 [機房]</div>
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#2BC3EC]/50 transition-colors pointer-events-none"></div>
                </div>

                {/* 右側：攝像頭列表 */}
                <div className="w-2/5 h-full flex flex-col gap-1 overflow-y-auto">
                    {floorCameras.length === 0 ? (
                        <div className="text-gray-500 text-xs text-center mt-4">此樓層無攝影機</div>
                    ) : (
                        floorCameras.map((cam) => (
                            <div key={cam.id} className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-white/5 transition-colors ${
                                cam.status === 'warning' ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-800/30 border-gray-700'
                            }`}>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[10px] text-gray-300 truncate" title={cam.id}>
                                        {cam.id}
                                    </span>
                                    {/* 顯示名稱 (cam.name) */}
                                    <span className="text-xs font-bold text-white truncate" title={cam.name}>
                                        {cam.name}
                                    </span>
                                </div>
                                {cam.status === 'warning' ? (
                                    <AlertTriangle size={14} className="text-red-500 animate-bounce flex-shrink-0" />
                                ) : (
                                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        </div>
    );
};

export default RightInfoPanel;