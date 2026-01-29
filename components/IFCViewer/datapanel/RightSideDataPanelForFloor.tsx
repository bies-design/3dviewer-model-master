"use client";

import React from "react";
import { Card, Tab, Tabs, ButtonProps, CardProps } from "@heroui/react";
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell, PolarAngleAxis, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, AreaChart, Area, Bar} from "recharts";
import RightInfoPanel from "./RightInfoPanel";

interface RightSideDataPanelForFloorProps {
  floor: string | null;
  darkMode: boolean;
  onLocate?: (elementName: string) => void;
}
// 1. 準備圖表數據 (chartData)
// name 會顯示在圓環中心上方，value 控制進度條長度
const chartData = [
  {
    name: "AQI",
    value: 75, // 當前數值
    fill: "orange", // 這裡可以定義顏色
    max:100,
  },
];
const chartData2 = [
  {
    name: "Temp",
    value: 23, // 當前數值
    fill: "#009100", // 這裡可以定義顏色
    max:50,
  },
];
// 2. 定義總量 (total)
// 這是進度條滿載時的數值，PolarAngleAxis 的 domain 會用到
const total = 100;

// 3. 格式化總量顯示 (formatTotal)
// 控制圓環中心大數字的顯示格式
const formatTotal = (value: number) => {
  return `${value}`; // 例如：75% 或 1,234 kW
};

// 4. 定義顏色變數 (如果你組件外部沒定義 color)
const color = "primary"; // 或 "success", "warning", "danger", "default"

const last30DaysData = [
  { day: "12-15", value: 5000 },
  { day: "12-20", value: 6500 },
  { day: "12-25", value: 4000 },
  { day: "12-30", value: 5500 },
  { day: "01-04", value: 4500 },
  { day: "01-09", value: 8500 },
  { day: "01-14", value: 3000 },
];

const RightSideDataPanelForFloor: React.FC<RightSideDataPanelForFloorProps> = ({ floor, darkMode,onLocate }) => {
  console.log("父層接收到的 floor:", floor);
  return (
    <div className="absolute hud-panel right-4 top-25 bottom-10 z-10 flex flex-col gap-4 min-w-[300px] min-h-[600px] w-[20%] h-[85%] pointer-events-none">
      
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
  
export default RightSideDataPanelForFloor;