import React from 'react';

interface LiquidFillGaugeProps {
    percent: number;      // 0 ~ 100
    title?: string;       // 例如 "預警"
    subTitle?: string;    // 例如 "運行狀況"
    darkMode?: boolean;
    size: number;
}

const LiquidFillGauge: React.FC<LiquidFillGaugeProps> = ({ 
    percent, 
    subTitle = "運行狀況" ,
    size,
    }) => {
    // 計算波浪高度位移 (Y 軸)
    // 100% 時 Y 在底部，0% 時 Y 在頂部
    const translateY = 50-percent/2;

    const getStatusConfig = (val: number) => {
        switch (true) {
            case (val >= 80):
                return { 
                    title: "預警", 
                    fillClass: "fill-red-500", 
                    bgClass: "fill-red-400", 
                    shadow: "rgba(239, 68, 68, 0.3)" // 紅色陰影
                };
            case (val > 50):
                return { 
                    title: "普通", 
                    fillClass: "fill-yellow-500", 
                    bgClass: "fill-yellow-400", 
                    shadow: "rgba(234, 179, 8, 0.3)" // 黃色陰影
                };
            default:
                return { 
                    title: "良好", 
                    fillClass: "fill-green-500", 
                    bgClass: "fill-green-400", 
                    shadow: "rgba(34, 197, 94, 0.3)" // 綠色陰影
                };
        }
    };

    const config = getStatusConfig(percent);

    return (
        <div className="relative rounded-sm"
            style={{
                width:`${size}px`,
                height:`${size}px`,
            }}
            >

        {/* 3. 核心圓球容器 */}
        <div className="relative w-full h-full flex items-center justify-center">
            <div 
                className="relative w-40 h-40 rounded-full border-5 border-slate-800/0 overflow-hidden"
                style={{ 
                        boxShadow: `0 0 20px ${config.shadow}, inset 0 0 20px ${config.shadow}` 
                    }}
                >
                
            {/* 波浪動畫層 */}
            <div 
                className="absolute left-0 w-[400%] h-[200%] transition-transform duration-1000 ease-in-out"
                style={{ 
                transform: `translate(-25%, ${translateY}%)`, 
                bottom: '0' 
                }}
            >
                <svg 
                    viewBox="0 0 2000 1000" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={`absolute w-full h-full ${config.fillClass} opacity-80 animate-wave-slow`}
                >
                <path d="M0 500 Q500 400 1000 500 T2000 500 V1000 H0 Z" />
                </svg>
                <svg 
                    viewBox="0 0 2000 1000" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={`absolute w-full h-full ${config.bgClass} opacity-60 animate-wave-fast`}
                    style={{ bottom: '2px' }}
                >
                <path d="M0 500 Q500 600 1000 500 T2000 500 V1000 H0 Z" />
                </svg>
            </div>

            {/* 4. 中心文字 */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-white text-5xl tracking-tighter drop-shadow-md">
                {config.title}
                </span>
            </div>
            </div>
        </div>
        </div>
    );
};

export default LiquidFillGauge;