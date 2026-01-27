import React from 'react';

const SciFiFloorBackground = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#000510] pointer-events-none">
      {/* 1. 放射狀地平線 (Radial Horizon / Sunrise Glow) */}
      <div 
        className="absolute top-0 left-0 w-full h-[60%] z-10"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0, 242, 255, 0.25) 0%, rgba(11, 120, 134, 0.15) 40%, transparent 80%)'
        }}
      />
      
      {/* 地平線亮線 */}
      <div className="absolute top-[60%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00F2FF]/40 to-transparent z-20 shadow-[0_0_15px_rgba(0,242,255,0.5)]" />

      {/* 2. 3D 透視地板 (3D Perspective Floor) */}
      <div 
        className="absolute w-[200%] h-[100%] left-[-50%] top-[40%]"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div 
          className="w-full h-full relative"
          style={{
            transform: 'rotateX(65deg)',
            backgroundImage: `
              linear-gradient(to right, rgba(0, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 255, 255, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)',
          }}
        >
          {/* 3. 發光區塊 (Glow Blocks) */}
          {/* 隨機分佈的發光矩形，模擬圖片中的效果 */}
          <div className="absolute top-[10%] left-[25%] w-[160px] h-[80px] bg-cyan-500/5 border border-cyan-400/30 shadow-[0_0_20px_rgba(0,242,255,0.2)]" />
          <div className="absolute top-[30%] left-[60%] w-[240px] h-[40px] bg-blue-600/5 border border-blue-400/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]" />
          <div className="absolute top-[15%] left-[75%] w-[100px] h-[100px] bg-cyan-400/10 border border-cyan-300/40 shadow-[0_0_25px_rgba(0,242,255,0.3)]" />
          <div className="absolute top-[45%] left-[15%] w-[200px] h-[60px] bg-cyan-500/5 border border-cyan-400/20 shadow-[0_0_15px_rgba(0,242,255,0.15)]" />
          <div className="absolute top-[5%] left-[45%] w-[120px] h-[120px] bg-blue-500/5 border border-blue-400/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]" />
          
          {/* 地面掃描線動畫 */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-[scan_4s_linear_infinite]" 
            style={{ 
              backgroundSize: '100% 200%',
              backgroundImage: 'linear-gradient(0deg, transparent 0%, rgba(0, 242, 255, 0.1) 50%, transparent 100%)'
            }}
          />
        </div>
      </div>

      {/* 覆蓋層：暗角與雜訊感 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000510_100%)] opacity-60 pointer-events-none" />
    </div>
  );
};

export default SciFiFloorBackground;