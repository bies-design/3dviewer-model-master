import React ,{useState,useEffect,memo,useMemo}from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
    Thermometer, Droplets, Wind, Zap, Activity, Video, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import CameraPlayer from '@/components/camera/CameraPlayer';
import { useEMS } from "@/contexts/EMSProvider";

interface RightInfoPanelProps{
    floor: string;
    onLocate?: (elementName: string) => void;
}

// 定義我們篩選後要存的資料結構
interface FilteredCamera {
    id:string;
    hlsUrl: string;
    webrtcUrl: string;
    title?: string;
    elementName?: string;
    isMinimized?: boolean;
    isAlarm?: boolean;
    onMinimizeToggle?: () => void;
    onLocate?: (elementName: string) => void;
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




const RightInfoPanel: React.FC<RightInfoPanelProps> = ({floor,onLocate}) => {
    const { setToast, currentFoundDevices } = useAppContext();

    const [floorCameras, setFloorCameras] = useState<FilteredCamera[]>([]);

    const [selectedCamera, setSelectedCamera] = useState<FilteredCamera | null>(null);
    
    const { currentData } = useEMS();

    const realTimeFloorInfo = useMemo(()=>{
        const floorData = currentData.find(d => d.floor === floor);
        return floorData;
    },currentData)

    // 只在值改變或是有新設備加入時才觸發
    const cams = useMemo(() => {
        if (!currentFoundDevices) return [];
        return currentFoundDevices.filter(e => e.floor === floor && e.name.includes("CAM"));
    }, [floor, currentFoundDevices]);

    useEffect(() => {

        console.log("子層獲取的樓層",floor);

        // 如果上層的總表還是空的，不要亂跳警告
        if (currentFoundDevices.length === 0) return;

        console.warn("第二個這裡",cams);

        const getCameras = async() =>{
            try{
                const response = await fetch("/api/cameras");
                let latestCameras = [];
                if (response.ok) {
                    const data = await response.json();
                    latestCameras = data;
                }
                const validCameras = latestCameras.filter((cam: any) => cam.elementName && cam.elementName.trim() !== "");
                const matchedCameras = validCameras
                .filter((dbCam:any) => {
                    return  cams.some((c:any) =>
                        dbCam.elementName === c.name
                    );
                })
                .map((cam:any) => ({
                    id: cam.id,
                    hlsUrl: cam.hlsUrl || "",
                    webrtcUrl: cam.webrtcUrl || "",
                    title: cam.title,
                    elementName: cam.elementName,
                    isAlarm: cam.isAlarm || false,
                }));

                console.log("最終配對到的 API 攝影機:", matchedCameras);

                if (matchedCameras.length > 0) {
                    setFloorCameras(matchedCameras);
                    setSelectedCamera(matchedCameras[0]); //預設選中第一台
                } else {
                    setFloorCameras([]);
                    console.log(`在資料庫中找不到對應 ${floor} 樓層的 CAM 攝影機設定`);
                }
            }catch(e){
                console.error("獲取攝影機 API 失敗:", e);
            }
        };

        if(cams.length > 0){
            getCameras();
        }else{
            setFloorCameras([]);
        }
        // setFloorCameras(cams);
        // // 可以取消上一筆請求
        // const controller = new AbortController();
        // const signal = controller.signal;
        // // 1. 定義在 useEffect 內部，確保它總是能存取到這次 render 的 floor
        // const getFloorCameras = async () => {
        //     try {
        //         const response = await fetch("/api/cameras",{signal});
        //         let latestCameras = [];

        //         if (response.ok) {
        //             const data = await response.json();
        //             latestCameras = data;
        //         }
                
        //         if(signal.aborted) return;
        //         // 只拿elementName 不為空的
        //         const validCameras = latestCameras.filter((cam: any) => cam.elementName && cam.elementName.trim() !== "");

        //         const matchedCameras = validCameras
        //             .filter((cam: any) => cam.elementName.includes(floor))
        //             .map((cam: any) => ({
        //                 id: cam.id,
        //                 hlsUrl: cam.hlsUrl || "",
        //                 webrtcUrl: cam.webrtcUrl || "",
        //                 title: cam.title,
        //                 elementName: cam.elementName,//去掉前面樓層
        //                 isAlarm: cam.isAlarm || false,
        //             }));

        //         if (matchedCameras.length === 0) {
        //             // 記得這裡也要處理空狀態，可能需要清空之前的資料
        //             setFloorCameras([]); 
        //             setSelectedCamera(null);
        //             setToast({ message: "該樓層未有監視器", type: "warning" }); // 建議不要在 useEffect 頻繁跳 toast，會很煩
        //             console.log(`樓層 ${floor} 無匹配攝影機`);
        //             return;
        //         }

        //         console.log(`樓層 ${floor} 配對到的攝影機:`, matchedCameras);
        //         setFloorCameras(matchedCameras);

        //         if (matchedCameras.length > 0) {
        //             setSelectedCamera(matchedCameras[0]);
        //         }

        //     } catch (error: any) {
        //         if(error.name === 'AbortError') {
        //             console.log('上一筆請求已取消 (React Strict Mode Cleanup)');
        //             return;
        //         }
        //         console.error("Failed to fetch cameras:", error);
        //         setToast({ message: "獲取攝影機列表失敗", type: "error" });
        //     }
        // };

        // // 2. 執行邏輯
        // if (floor) {
        //     console.log("偵測到樓層變更，開始獲取攝影機:", floor); // Debug 用
        //     getFloorCameras();
        // } else {
        //     // 如果 floor 為空，可能需要清空列表
        //     setFloorCameras([]);
        //     setSelectedCamera(null);
        // }

        // return()=>{
        //     controller.abort();
        // };
        
    }, [floor, currentFoundDevices.length, cams]); 

    

    return (
        <div className="w-full h-full flex flex-col gap-2 p-2 pointer-events-auto">
        
        {/* --- 區塊 1: 環境舒適度綜覽 (最頂端 Summary) --- */}
        <div className="w-full h-[15%] flex gap-2 ">
            {/* 溫度 */}
            <div className=" flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    <Thermometer size={14} className="text-[#2BC3EC]" />
                    <span className="text-[14px] text-white/80">平均溫度</span>
                </div>
                <span className="text-3xl font-mono text-white font-bold mt-2">{(realTimeFloorInfo.temp).toFixed(1)}<span className="text-sm ml-1 text-white/80">°C</span></span>
            </div>
            {/* 濕度 */}
            <div className=" flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    <Droplets size={14} className="text-[#2BC3EC]" />
                    <span className="text-[14px] text-white/80">相對濕度</span>
                </div>
                <span className="text-3xl font-mono text-white font-bold mt-2">{(realTimeFloorInfo.humi).toFixed(1)}<span className="text-sm ml-1 text-white/80">%</span></span>
            </div>
            {/* CO2 (空氣品質) */}
            <div className=" flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    <Wind size={14} className="text-[#2BC3EC]" />
                    <span className="text-[14px] text-white/80">CO2</span>
                </div>
                <span className="text-3xl font-mono text-green-400 font-bold mt-2">{(realTimeFloorInfo.co2).toFixed(0)}<span className="text-sm ml-1 text-white/80">ppm</span></span>
            </div>
        </div>

        {/* --- 區塊 2: HVAC 系統核心 (重點數據) --- */}
        <div className="w-full h-[40%] p-2 flex flex-col">
            <div className="flex justify-between items-center mb-2 border-b border-gray-600/30 pb-2">
                <h3 className="text-[#2BC3EC] font-bold flex items-center gap-2">
                    <Activity size={18} /> HVAC 
                </h3>
                <span className="text-xs text-green-400 border border-green-500/50 px-2 rounded bg-green-900/20">運行最佳化</span>
            </div>

            <div className="flex-1 flex gap-2">
                {/* 左側：負載儀表 (這裡放你的 LiquidFillGauge) */}
                <div className="w-1/3 flex flex-col items-center justify-center relative">
                    {/* 模擬 Liquid Gauge 的位置 */}
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center relative overflow-hidden bg-blue-900/20">
                        <div className="absolute bottom-0 w-full h-[65%] bg-blue-500/60 animate-pulse"></div>
                        <span className="relative z-10 text-xl font-bold text-white">65<span className='text-sm text-white/80'>%</span></span>
                    </div>
                    <span className="text-xs text-white/80 mt-2">系統負載率</span>
                </div>

                {/* 右側：出回水溫差圖表 (AreaChart) */}
                <div className="w-2/3 flex flex-col">
                    <div className="flex justify-end gap-3 text-[10px] mb-1">
                        <span className="flex items-center gap-1 text-white/80"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>回水</span>
                        <span className="flex items-center gap-1 text-white/80"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>出水</span>
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
                                <XAxis dataKey="time" stroke="#FFFFFFCC" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis domain={[5, 15]} stroke="#FFFFFFCC" fontSize={10} tickLine={false} axisLine={false} width={25}/>
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
                    <p className="text-[12px] text-white/80">即時功耗</p>
                    <p className="text-[16px] font-mono text-white">45.2 <span className="text-[10px]">kW</span></p>
                </div>
                <div className="text-center">
                    <p className="text-[12px] text-white/80">運轉效率</p>
                    <p className="text-[16px] font-mono text-[#2BC3EC]">0.78 <span className="text-[10px]">kW/RT</span></p>
                </div>
                <div className="text-center">
                    <p className="text-[12px] text-white/80">溫差 (ΔT)</p>
                    <p className="text-[16px] font-mono text-yellow-400">5.0 <span className="text-[10px]">°C</span></p>
                </div>
            </div>
        </div>

        {/* --- 區塊 3: CCTV 監控與安全 --- */}
            <div className="w-full flex-1 p-3 flex flex-col min-h-0"> {/* min-h-0 很重要，防止 flex 溢出 */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[#2BC3EC] font-bold flex items-center gap-2">
                        <Video size={18} /> 安全監控
                    </h3>
                    <span className="text-[10px] text-white/80 animate-pulse">LIVE ●</span>
                </div>

                <div className="flex gap-2 flex-1 h-full min-h-0">
                    
                    {/* 左側：即時影像畫面 (整合 CameraPlayer) */}
                    <div className="w-7/10 h-full bg-black rounded border border-gray-600/50 relative overflow-hidden flex flex-col">
                        {selectedCamera ? (
                            <CameraPlayer 
                                hlsUrl={selectedCamera.hlsUrl}
                                webrtcUrl={selectedCamera.webrtcUrl}
                                title={selectedCamera.title}
                                elementName={selectedCamera.elementName}
                                isMinimized={false} // 在這個布局中強制展開
                                isAlarm={selectedCamera.isAlarm} // 如果狀態是警告，開啟紅框閃爍
                                onLocate={onLocate}
                            />
                        ) : (
                            // 沒有選中攝影機時的 Placeholder
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
                                <div className="grid grid-cols-8 grid-rows-8 w-full h-full opacity-20 absolute inset-0 pointer-events-none">
                                    {[...Array(64)].map((_, i) => <div key={i} className="border-[0.5px] border-green-500/10"></div>)}
                                </div>
                                <span className="text-xs text-gray-500 z-10">NO SIGNAL / SELECT CAM</span>
                            </div>
                        )}
                    </div>

                    {/* 右側：攝像頭列表 (作為控制器) */}
                    <div className="w-3/10 h-full flex flex-col gap-1 overflow-y-auto pr-1">
                        {floorCameras.length === 0 ? (
                            <div className="text-white/80 text-xs text-center mt-4">此樓層無攝影機</div>
                        ) : (
                            floorCameras.map((cam) => {
                                // 判斷是否為當前選中的攝影機
                                const isSelected = selectedCamera?.id === cam.id;
                                
                                return (
                                    <div 
                                        key={cam.id} 
                                        // 5. 點擊事件：切換選中的攝影機
                                        onClick={() => setSelectedCamera(cam)}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${
                                            // 6. 樣式邏輯：選中時高亮，警告時紅色，普通時灰色
                                            isSelected 
                                                ? 'bg-[#2BC3EC]/20 border-[#2BC3EC] shadow-[0_0_10px_rgba(43,195,236,0.3)]' 
                                                : cam.isAlarm
                                                    ? 'bg-red-900/20 border-red-500/50 hover:bg-red-900/30' 
                                                    : 'bg-slate-800/30 border-gray-700 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex flex-col overflow-hidden">
                                            <span className={`text-[10px] truncate ${isSelected ? 'text-cyan-200' : 'text-gray-400'}`} title={cam.id}>
                                                {cam.id}
                                            </span>
                                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`} title={cam.elementName}>
                                                {cam.title}
                                            </span>
                                        </div>
                                        
                                        {/* 狀態圖示 */}
                                        {cam.isAlarm? (
                                            <AlertTriangle size={14} className="text-red-500 animate-bounce flex-shrink-0" />
                                        ) : isSelected ? (
                                            // 選中時顯示播放圖示
                                            <div className="w-2 h-2 bg-[#2BC3EC] rounded-full animate-pulse shadow-[0_0_5px_#2BC3EC]"></div>
                                        ) : (
                                            <CheckCircle size={14} className="text-green-500/50 flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default memo(RightInfoPanel);