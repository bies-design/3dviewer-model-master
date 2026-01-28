"use client";

import React,{useEffect,  useState } from "react";
import Image from "next/image";
import { Tooltip } from "@heroui/react";
import { Menu,Undo2 } from "lucide-react";

import { AppContext } from "next/app";
import { useAppContext } from "@/contexts/AppContext";

interface TopsideDataPanelProps {
  darkMode: boolean;
  onFocus: () => void;
}
{/*  */}
const TopsideDataPanel: React.FC<TopsideDataPanelProps> = ({ darkMode, onFocus}) => {
  const {viewMode} = useAppContext(); 
  const [width, setWidth] = useState(1920);

  useEffect(() => {
    console.log("當前檢視模式切換為:", viewMode);
  }, [viewMode]);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 計算邏輯範例 (假設中心點對齊)
  const centerX = width / 2;
  const gap = 200; // 下陷區段的一半寬度
  
  const pathData = [
    `M ${centerX - gap - 400} 20`, // 左起點
    `L ${centerX - gap - 50} 20`,  // 左轉折1
    `L ${centerX - gap} 80`,       // 下陷開始
    `L ${centerX + gap} 80`,       // 下陷結束
    `L ${centerX + gap + 50} 20`,  // 右轉折2
    `L ${centerX + gap + 400} 20`, // 右終點
  ].join(" ");

  return (
    // left
    <div className="flex justify-between items-center h-[96px] w-full px-5 absolute top-0 z-30 pointer-events-auto">
      <div className="absolute top-0 left-0 w-full z-0 pointer-events-none">
        <svg 
          width={width} 
          height="100"
          className=" w-full h-full drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]"
          preserveAspectRatio="none">
            
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="10%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="90%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <path 
            d={pathData}
            fill="none" 
            stroke="url(#line-gradient)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {/* left side :漢堡 and 返回 */}
        <div className="pointer-events-auto">
          <div className="flex gap-8">
            {/* <Tooltip content={isSidebarVisible ? "收起側邊欄" : "展開側邊欄"}>
              <button
                type="button"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className={`rounded-lg shadow-lg transition-all duration-300 ${
                  darkMode
                    ? "bg-transparents "
                    : " hover:bg-indigo-600 border border-indigo-400"
                } ${isSidebarVisible ? "text-white":"text-[#2EC2EA]"}`}
              >
                <Menu size={40} className="" />
              </button>
            </Tooltip> */}
            <Tooltip content={"回上一頁"}>
              <button
                type="button"
                onClick={() => window.location.href="https://tecomcnm.push-server.info/moduleList"}
                className={`rounded-lg shadow-lg transition-all duration-300 ${
                  darkMode
                    ? "bg-transparent text-[#2EC2EA]"
                    : " hover:bg-indigo-600 border border-indigo-400"
                }`}
              >
                <Undo2 size={40} className="" />
              </button>
            </Tooltip>
          </div>
        </div>
        {/* middle side*/}
        <div className={`${darkMode ? 'bg-transparent' : 'bg-white/60'} absolute inset-0 w-full h-full flex justify-center items-center pointer-events-none`}>
          <div className={`
            font-bold text-cyan-400 transition-all duration-200
            absolute left-1/2 -translate-x-1/2
            ${(viewMode === 'floor' || viewMode === 'device') 
              ? "top-4 text-2xl" 
              : "top-4/10 -translate-y-1/2 text-[40px]"
            }
          `}>
            3D EMS電能管理平台
          </div>
        </div>
        {/* right side*/}
        <div className={`${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>       
            <Image src="/白-1-png.png" width={150} height={150} alt="TECO" className="mt-2"/>
        </div>
        
    </div>
  );
};

export default TopsideDataPanel;