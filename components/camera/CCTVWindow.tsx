'use client';

import React, { useEffect, useState, useRef } from 'react';
import Draggable from 'react-draggable';
import CameraPlayer from '@/components/camera/CameraPlayer';
import { X, GripHorizontal } from "lucide-react"; // 引入 Grip 圖示
import { Spinner } from "@heroui/react";

interface CCTVWindowProps {
    isOpen: boolean;
    onClose: () => void;
    elementName: string | null;
}

const CCTVWindow: React.FC<CCTVWindowProps> = ({ isOpen, onClose, elementName }) => {
    const [camera, setCamera] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchCamera = async () => {
            if (!elementName) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/cameras?elementName=${elementName}`);
                const data = await response.json();
                if (data && data.length > 0) {
                    setCamera(data[0]);
                }
            } catch (error) {
                console.error("API Error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) fetchCamera();
    }, [elementName, isOpen]);

    if (!isOpen) return null;

    return (
        // 💡 使用 fixed 定位，層級設高 (z-50)
        <div className="fixed inset-0 pointer-events-none z-50">
            <Draggable 
                nodeRef={nodeRef} 
                handle=".drag-handle"
                // 💡 預設出現在螢幕中央偏右
                defaultPosition={{x: window.innerWidth / 2 - 200, y: 150}}
            >
                <div 
                    ref={nodeRef}
                    // 💡 pointer-events-auto 讓視窗本身可點擊，但外層 pointer-events-none 讓背景可穿透
                    className="pointer-events-auto w-[600px] bg-zinc-950/90 border border-zinc-700 shadow-2xl overflow-hidden flex flex-col"
                    style={{ transition: 'none' }} // 💡 徹底根除抖動
                >
                    {/* Header: 拖拽把手 */}
                    <div className="drag-handle cursor-move bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-800 select-none">
                        <div className="flex items-center gap-2">
                            <GripHorizontal size={16} className="text-zinc-500" />
                            <span className="text-white font-bold text-sm tracking-wide">
                                監控畫面: {elementName}
                            </span>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 rounded-md transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body: 影像區域 */}
                    <div className="bg-black aspect-video relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner color="primary" />
                            </div>
                        ) : !camera ? (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
                                找不到攝影機資料
                            </div>
                        ) : (
                            <div className="w-full h-full">
                                <CameraPlayer
                                    hlsUrl={camera.hlsUrl}
                                    webrtcUrl={camera.webrtcUrl}
                                    title={camera.title}
                                    elementName={camera.elementName}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Footer: 輔助資訊 (可選) */}
                    <div className="bg-zinc-900/50 px-4 py-1.5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-center">
                            Live Stream System
                        </p>
                    </div>
                </div>
            </Draggable>
        </div>
    );
};

export default CCTVWindow;