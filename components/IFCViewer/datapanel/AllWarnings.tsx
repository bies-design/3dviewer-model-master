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


interface Props {
    components: OBC.Components;
}

const AllWarnings: React.FC<Props> = ({ components }) => {

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
        const fragments = components.get(OBC.FragmentsManager);
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
        <div className="w-full h-full flex flex-col overflow-y-auto scrollbar-hide">
            <div className="h-full min-w-[400px] shadow-2xl flex flex-col relative ">
                
                {/* 1. 頂部標題與篩選列 */}
                <div className="w-full p-4 border-b border-blue-500/20 bg-blue-500/5">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                        <span className="w-1 h-4 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] rounded-full"></span>
                        系統告警歷史紀錄
                    </h3>
                    
                    <div className="flex flex-col gap-3 text-xs text-gray-300">
                        <div className="flex gap-2">
                            <select className="flex-1 bg-black/40 border border-blue-500/30 rounded px-2 py-1 text-white focus:outline-none focus:border-[#2EC2EA]">
                                <option>異常類型: 全部</option>
                                <option>能耗異常</option>
                                <option>設備故障</option>
                            </select>
                            <input type="text" placeholder="設備名稱搜尋..." className="flex-1 bg-black/40 border border-blue-500/30 rounded px-2 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-[#2EC2EA]" />
                        </div>
                    </div>
                </div>

                {/* 2. 表格標題列 (縮小字體以適應側邊欄) */}
                <div className="grid grid-cols-12 border-b border-blue-500/20 gap-1 p-2 text-[#2EC2EA] text-sm font-bold bg-white/5">
                    <div className="col-span-2 text-center">狀態</div>
                    <div className="col-span-3">時間</div>
                    <div className="col-span-5">異常原因</div>
                    <div className="col-span-2 text-center">操作</div>
                </div>

                {/* 3. 表格內容區 */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#2EC2EA]" /></div>
                    ) : (
                        <div className="w-full">
                            {logs.map((log, index) => {
                                const formattedDate = dayjs(log.createdAt).format('MM-DD HH:mm'); // 縮短日期格式
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
                                            const fragments = components.get(OBC.FragmentsManager);
                                            if (!fragments) throw new Error("FragmentsManager not found");
    
                                            const allFragIds = Array.from(fragments.list.keys());
    
                                            // 4. 使用正則表達式尋找對應的 fragId
                                            // 規則：匹配 _11F. 或 _11F_ 這種格式
                                            const regex = new RegExp(`_${floor}(_|\\.)`);
                                            const targetFragId = allFragIds.find(id => regex.test(id));
                                        }
    
        
        
        
                                            // const safeElementId = encodeURIComponent(log.elementId);
                                            // const targetUrl = `/element/${fragId}/${safeElementId}`;
                                            // console.log(`準備跳轉：模型=${fragId}, MongoID=${safeElementId}`);
        
                                            // //開啟新分頁
                                            // window.open(targetUrl, "IssueForm", features);
                                            // console.log(`已在新分頁開啟設備表單：${targetUrl}`);
                                        }else {
                                            throw new Error("找不到對應的資料庫記錄");
                                        }
                                    }catch(error){
                                        console.error("獲取 ObjectId 失敗:", error);
                                        setToast({ message: "無法讀取設備詳細資料", type: "error" });
                                    }
                                }
                                return (
                                    <div key={log._id} className={`grid grid-cols-12 gap-1 p-2 items-center border-b border-gray-700/30 hover:bg-white/10 transition-colors text-sm ${index % 2 === 0 ? 'bg-transparent' : 'bg-[#0F2132]/30'}`}>
                                        <div className="col-span-2 flex justify-center">
                                            <span className={`px-1 py-0.5 rounded text-[12px] ${log.status === 'Active' ? 'text-red-300 border border-red-400/30 bg-red-500/20' : 'text-green-400 border border-green-400/30'}`}>
                                                {log.status}
                                            </span>
                                        </div>
                                        <div className="col-span-3 font-mono text-gray-400">{formattedDate}</div>
                                        <div className="col-span-5 flex items-center gap-1 text-gray-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                            <span className="truncate">{log.title}</span>
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <button className="text-blue-400 hover:text-white cursor-pointer underline" onClick={() => handleIssueNav()}>查看</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 底部資訊 */}
                <div className="p-2 border-t border-blue-500/20 text-[10px] text-gray-500 flex justify-between bg-black/20">
                    <span>Total: {logs.length} items</span>
                    <span className="cursor-pointer hover:text-[#2EC2EA]" onClick={() => setLogs([])}>清空紀錄</span>
                </div>
            </div>
        </div>
    );
};

export default AllWarnings;