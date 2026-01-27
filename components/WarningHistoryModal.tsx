'use client';
import React, { useState, useEffect } from 'react';
import { X, FileDown, Loader2 } from 'lucide-react';
import { useAppContext } from "@/contexts/AppContext";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import dayjs from 'dayjs'; // 建議使用 dayjs 處理時間格式

// 定義資料介面
interface WarningLog {
    _id: string;
    elementId: string;
    authorId: string;
    title: string;
    description: string;
    status: string;      // API 回傳 "Active"
    priority: string;
    type: string;
    labels: string;
    assignedTo: string;
    dueDate: string;
    createdAt: string;   // API 回傳 "2025-11-10T02:36:08.207Z"
    stage: string;
}

// // 模擬資料 (依照您的圖片內容)
// const mockData: WarningLog[] = [
//     {
//         id: '1',
//         status: '未處理',
//         time: '2025-07-10 14:30:19',
//         device: '新竹廠生產中心--一樓照明(1L)',
//         cause: '一樓照明(1L) 有功功率1 告警(25.30)/預警(25.30);'
//     },
//     {
//         id: '2',
//         status: '未處理',
//         time: '2025-07-14 08:13:16',
//         device: '新竹廠生產中心--一樓照明(1L)',
//         cause: '一樓照明(1L) 有功功率1 告警(49.50)/預警(49.50);'
//     },
//   // 您可以再增加更多測試資料...
// ];

interface Props {
    componentsRef: React.MutableRefObject<OBC.Components | null>;
    onClose: () => void;
}

const WarningHistoryModal: React.FC<Props> = ({ componentsRef, onClose }) => {

    const {setToast} = useAppContext();
    const [logs, setLogs] = useState<WarningLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const w = window.screen.availWidth/2;
    const h = window.screen.availHeight/2;

    // 計算置中座標：(螢幕總寬 - 視窗寬) / 2
    const left = (window.screen.availWidth - w) / 2;

    const features = [
    `width=${w}`,
    `height=${h}`,
    `left=${left}`,
    `top=${top}`,
    "popup=yes",
    "noopener=yes",
    "noreferrer=yes",
    "resizable=yes",
    "scrollbars=yes"
    ].join(",");


    // --- 抓取 API 資料 ---
    useEffect(() => {
        const fragments = componentsRef.current?.get(OBC.FragmentsManager);
        if(fragments){
            const allFragmentIds = Array.from(fragments.list.keys());
            console.log(allFragmentIds);
        }
        const fetchIssues = async () => {
        try {
            setIsLoading(true);
            // 注意：這裡假設你已經修改 API 支援「不帶 elementId 抓取全部」
            const response = await fetch('/api/issues'); 
            if (!response.ok) throw new Error('Failed to fetch issues');
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error("Error loading issues:", error);
        } finally {
            setIsLoading(false);
        }
        };

        fetchIssues();
    }, []);

    return (
        // 背景遮罩 (點擊背景也可以關閉)
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 fade-in animate-in">
        
            {/* 主視窗容器 */}
            <div className="hud-panel w-full h-full max-w-7xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col  relative"
                onClick={(e) => e.stopPropagation()} // 防止點擊視窗時觸發關閉
            >
                {/* 1. 頂部篩選列 (依照圖二) */}
                <div className="w-full p-4 border-b border-blue-500/20 flex flex-wrap items-center justify-between gap-4 ">
                
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        {/* 異常類型 */}
                        <div className="flex items-center gap-2 ">
                        <span>異常類型</span>
                        <select className="bg-[#1a2c3e] border border-blue-500/30 rounded px-2 py-1 text-white focus:outline-none focus:border-[#2EC2EA]">
                            <option>全部</option>
                            <option>能耗異常</option>
                            <option>設備故障</option>
                        </select>
                        </div>

                        {/* 告警類型 */}
                        <div className="flex items-center gap-2">
                        <span>告警類型</span>
                        <select className="bg-[#1a2c3e] border border-blue-500/30 rounded px-2 py-1 text-white focus:outline-none focus:border-[#2EC2EA]">
                            <option>全部</option>
                        </select>
                        </div>

                        {/* 設備名稱 */}
                        <div className="flex items-center gap-2">
                        <span>設備名稱</span>
                        <input type="text" placeholder="一樓照明" className="bg-[#1a2c3e] border border-blue-500/30 rounded px-2 py-1 text-white placeholder-gray-500 w-32 focus:outline-none focus:border-[#2EC2EA]" />
                        </div>

                        {/* 時間範圍 */}
                        <div className="flex items-center gap-2">
                        <span>時間</span>
                        <div className="flex items-center bg-[#1a2c3e] border border-blue-500/30 rounded px-2 py-1">
                            <span className="text-gray-500 mr-2 text-xs">🕒</span>
                            <input type="text" placeholder="開始時間" className="bg-transparent text-white w-24 text-center focus:outline-none text-xs"/>
                            <span className="mx-1">-</span>
                            <input type="text" placeholder="結束時間" className="bg-transparent text-white w-24 text-center focus:outline-none text-xs"/>
                        </div>
                        </div>

                        {/* 查詢按鈕 */}
                        <button className="bg-[#2EC2EA] hover:bg-[#259cc5] text-white px-4 py-1 rounded transition-colors text-sm">
                        查詢
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ">
                        {/* 導出 CSV
                        <button className="border border-[#2EC2EA] text-[#2EC2EA] hover:bg-[#2EC2EA]/10 px-3 py-1 rounded flex items-center gap-1 text-sm transition-colors">
                        <FileDown size={14} />
                        導出CSV
                        </button> */}
                        {/* 關閉按鈕 */}
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors ml-4">
                        <X size={24} />
                        </button>
                    </div>
                </div>

                {/* 2. 表格標題列 */}
                <div className="grid grid-cols-12 border-b border-blue-500/20 gap-2 p-3 text-[#2EC2EA] text-sm font-bold ">
                    <div className="col-span-1 text-center">告警處理</div>
                    <div className="col-span-2">告警時間</div>
                    <div className="col-span-3">告警設備</div>
                    <div className="col-span-4">異常原因</div>
                    <div className="col-span-1">診斷結果</div>
                    <div className="col-span-1 text-center">操作</div>
                </div>

                {/* 3. 表格內容區 (可滾動) */}
                <div className="flex-1 overflow-y-auto ">
                    {isLoading? (
                        <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#2EC2EA]" /></div>   
                    ):(
                    <table className="w-full text-left text-sm text-gray-300">
                    <tbody>
                    {logs.map((log, index) => {
                        // 格式化日期：yyyy-mm-dd hh:mm:ss
                        const formattedDate = dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss');
                        
                        const handleIssueNav = async() => {
                            try{
                                const response = await fetch(`/api/elements/${log.elementId}`);
                                if (!response.ok) throw new Error("API request failed");
                                const elementData = await response.json();

                                if(elementData && elementData.attributes.ObjectType?.value){
                                    // 從object value中提取樓層 再去fragment.list內抓取fragId
                                    const ObjectName = elementData.attributes.ObjectType.value;
                                    const floorArr = ObjectName.match(/(\d+F)/);
                                    if(floorArr){
                                        const floor = floorArr[0];
                                        console.log("提取出的樓層為:", floor);
                                        // 3. 從 ThatOpen Components 獲取當前所有已載入的 fragId 清單
                                        const fragments = componentsRef.current?.get(OBC.FragmentsManager);
                                        if (!fragments) throw new Error("FragmentsManager not found");

                                        const allFragIds = Array.from(fragments.list.keys());

                                        // 4. 使用正則表達式尋找對應的 fragId
                                        // 規則：匹配 _11F. 或 _11F_ 這種格式
                                        const regex = new RegExp(`_${floor}(_|\\.)`);
                                        const targetFragId = allFragIds.find(id => regex.test(id));
                                    }




                                    const safeElementId = encodeURIComponent(log.elementId);
                                    const targetUrl = `/element/${fragId}/${safeElementId}`;
                                    console.log(`準備跳轉：模型=${fragId}, MongoID=${safeElementId}`);

                                    //開啟新分頁
                                    window.open(targetUrl, "IssueForm", features);
                                    console.log(`已在新分頁開啟設備表單：${targetUrl}`);
                                }else {
                                    throw new Error("找不到對應的資料庫記錄");
                                }
                            }catch(error){
                                console.error("獲取 ObjectId 失敗:", error);
                                setToast({ message: "無法讀取設備詳細資料", type: "error" });
                            }
                        }
                        
                        return(
                            <tr key={log._id} className={`grid grid-cols-12 gap-2 p-3 items-center border-b border-gray-700/30 hover:bg-white/5 transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-[#0F2132]/30'}`}>
                            
                            {/* 狀態 */}
                            <td className="col-span-1 flex justify-center">
                                <span className={`px-2 py-0.5 text-xs rounded border ${log.status === 'Active' ? 'text-red-300 border-red-400/30 bg-red-500/40' : 'text-green-400 border-green-400/30'}`}>
                                {log.status}
                                </span>
                            </td>
                            
                            {/* 時間 */}
                            <td className="col-span-2 font-mono text-gray-400 text-xs">{formattedDate}</td>
                            
                            {/* 設備 */}
                            <td className="col-span-3 text-gray-200">{log.elementId}</td>
                            
                            {/* 原因 (帶紅點) */}
                            <td className="col-span-4 flex items-start gap-2 text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                                <span>{`${log.title} - ${log.description}`}</span>
                            </td>
                            
                            {/* 診斷結果 */}
                            <td className="col-span-1 text-gray-500">-</td>
                            
                            {/* 操作 */}
                            <td className="col-span-1 flex justify-center">
                                <button className="text-blue-400 hover:text-blue-300 cursor-pointer underline text-xs" onClick={() => handleIssueNav()}>查看</button>
                            </td>
                            </tr>
                        );
                    })}
                    
                    
                    </tbody>
                </table>)}
                
                </div>

                {/* 底部資訊 (分頁等) */}
                <div className="p-2 border-t border-blue-500/20 text-xs text-gray-500 text-right">
                    共 {logs.length} 條紀錄
                </div>

            </div>
        </div>
    );
};

export default WarningHistoryModal;