import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalLoaderProps{
    isLoadings:boolean;
    message?:string;
    darkMode?:boolean;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({
    isLoadings,
    message = "Loading...",
    darkMode = true
}) => {
    if(!isLoadings) return;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            // 防止滾動穿透
            style={{ touchAction: 'none' }}
        >
        <div className={`
            flex flex-col items-center justify-center p-8 rounded-2xl shadow-2xl border
            ${darkMode 
            ? 'bg-gray-900/90 border-gray-700 text-white' 
            : 'bg-white/90 border-gray-200 text-gray-800'
            }
        `}>
            {/* 旋轉動畫圖標 */}
            <Loader2 className="w-12 h-12 animate-spin text-[#2EC2EA] mb-4" />
            
            {/* 文字訊息 */}
            <h3 className="text-lg font-bold tracking-wider animate-pulse">
            {message}
            </h3>
        </div>
    </div>
    );
}

export default GlobalLoader