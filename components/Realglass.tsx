import React from 'react';

const RealGlass = () => {
  return (
    // 1. 背景環境 (深色背景才能突顯玻璃質感)
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-10">
      
      {/* 2. 玻璃本體 */}
      <div 
        className="
          relative
          w-[500px] h-[400px]
          rounded-[40px] /* 配合原圖的大圓角 */
          
          /* --- 核心 1: 磨砂感 --- */
          backdrop-blur-[20px] 
          bg-white/[0.02] /* 極低透明度的填充，讓它不要全黑 */
          
          /* --- 核心 2: 邊框與混合模式 --- */
          /* 使用 border-white/10 做基礎輪廓，但重點在下面的 shadow */
          border border-white/10

          /* --- 核心 3: 模擬厚度與邊緣折射 (關鍵！) --- */
          shadow-[
            /* 1. 頂部高光 (模擬光線從上方打下來，產生銳利反光) */
            inset_0px_1px_0px_0px_rgba(255,255,255,0.5),
            
            /* 2. 內部柔光 (讓玻璃中間有通透感) */
            inset_0px_0px_20px_0px_rgba(255,255,255,0.05),
            
            /* 3. 底部反光 (模擬玻璃厚度的底部折射，帶一點青色/藍色) */
            inset_0px_-4px_6px_0px_rgba(100,200,255,0.2),
            
            /* 4. 外部陰影 (讓物體懸浮) */
            0px_20px_40px_-10px_rgba(0,0,0,0.6)
          ]
        "
      >
        {/* 3. 表面雜訊/刮痕 (選用，增加真實度) */}
        {/* 這裡用 noise 圖片或 CSS 漸層模擬表面質感 */}
        <div className="absolute inset-0 rounded-[40px] opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay"></div>

        {/* 4. 額外的高光 (Specular Highlight) */}
        {/* 模擬右上角或左上角的強烈反光 */}
        <div 
          className="
            absolute -top-[1px] left-[10%] right-[10%] h-[1px]
            bg-gradient-to-r from-transparent via-white/80 to-transparent
            opacity-50
          "
        />
        
        {/* 內容區域 */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white/80">
          <p className="text-lg font-light tracking-widest">GLASS PANE</p>
        </div>
      </div>
    </div>
  );
};

export default RealGlass;