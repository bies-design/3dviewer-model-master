"use client";

import React,{memo} from "react";
import { Card, Tab, Tabs, ButtonProps, CardProps } from "@heroui/react";
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell, PolarAngleAxis, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, AreaChart, Area, Bar} from "recharts";
import RightInfoPanel from "./RightInfoPanel";


interface RightSideDataPanelForFloorProps {
  floor: string | null;
  darkMode: boolean;
  onLocate?: (elementName: string) => void;
}

const RightSideDataPanelForFloor: React.FC<RightSideDataPanelForFloorProps> = ({ floor, darkMode,onLocate }) => {
  console.log("父層接收到的 floor:", floor);
  

  return (
    <div className="absolute hud-panel right-4 top-25 bottom-10 z-10 flex flex-col gap-4 min-w-[350px] min-h-[600px] w-[20%] h-[85%] pointer-events-none">
      
      {/* Header */}
      <h3 className="m-3 text-xl font-bold flex items-center gap-2 text-white"> 
        <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
        {floor ? `樓層 ${floor} 用電資料` : "請選擇一個樓層"}
      </h3>
      
      <div className={floor ? "w-full h-full" : "w-full h-full hidden"}>
        {floor && 
          <RightInfoPanel 
            key={floor} //加入key讓floor改變時 會重塑component
            floor={floor}
            onLocate={onLocate}
          />}
      </div>
    </div>
  );
}
// memo: is the props unchanged , the component won't be rerendered
export default memo(RightSideDataPanelForFloor);