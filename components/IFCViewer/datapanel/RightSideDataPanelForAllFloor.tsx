"use client";

import React from "react";
import { Card, Tab, Tabs, ButtonProps, CardProps } from "@heroui/react";
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell, PolarAngleAxis, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, AreaChart, Area, Bar} from "recharts";
import KPIFloorTable from "@/components/KPIFloorTable";

interface RightSideDataPanelForAllFloorProps {
  loadedModelIds: string[];
  floor: string | null;
  darkMode: boolean;
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

const RightSideDataPanelForAllFloor: React.FC<RightSideDataPanelForAllFloorProps> = ({ loadedModelIds, floor, darkMode }) => {
  return (
    <div className="absolute hud-panel right-4 top-25 bottom-10 z-10 flex flex-col gap-4 min-w-[350px] min-h-[600px] w-[20%] h-[85%] pointer-events-none">
      <KPIFloorTable loadedModelIds={loadedModelIds}/>
    </div>
  );
}
  
export default RightSideDataPanelForAllFloor;