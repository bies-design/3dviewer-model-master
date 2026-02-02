"use client";

import React from "react";
import {Card, Tab, Tabs} from "@heroui/react";
import { ResponsiveContainer, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, AreaChart, Area, Bar} from "recharts";

interface RightsideDataPanelProps {
  darkMode: boolean;
}

const last30DaysData = [
  { day: "12-15", value: 5000 },
  { day: "12-20", value: 6500 },
  { day: "12-25", value: 4000 },
  { day: "12-30", value: 5500 },
  { day: "01-04", value: 4500 },
  { day: "01-09", value: 8500 },
  { day: "01-14", value: 3000 },
];

const trendData = [
  { month: "1月", value: 100000 },
  { month: "2月", value: 115000 },
  { month: "3月", value: 130000 },
  { month: "4月", value: 150000 },
  { month: "5月", value: 220000 },
  { month: "6月", value: 270000 },
  { month: "7月", value: 120000 },
  { month: "8月", value: 240000 },
  { month: "9月", value: 230000 },
  { month: "10月", value: 180000 },
  { month: "11月", value: 160000 },
  { month: "12月", value: 150000 },
];

const RightsideDataPanel: React.FC<RightsideDataPanelProps> = ({ darkMode }) => {
  return (
    <div className="absolute right-4 top-25 bottom-10 min-w-[270px] w-[20%] h-[85%] z-10 flex flex-col gap-4 pointer-events-none">
      {/*上段: 本月and本年用電 */}
      <div className="relative hud-panel h-[12%] flex gap-2 items-center justify-center">
        <div className="flex flex-col items-center px-4 border-r border-white/10">
          <span className="text-md 2xl:text-xl uppercase min-[1734px]:tracking-[0.7em]"><span className="text-orange-400 font-semibold">本月</span>用電</span>
          <span className="text-md 2xl:text-xl font-bold text-[#84ebf8]">11,121 <small className="text-8 font-normal">kWh</small></span>
        </div>
        <div className="flex flex-col items-center px-4">
          <span className="text-md 2xl:text-xl uppercase min-[1734px]:tracking-[0.7em]"><span className="text-orange-400 font-semibold">本年</span>用電</span>
          <span className="text-md 2xl:text-xl font-bold text-[#84ebf8]">111,121 <small className="text-8 font-normal">kWh</small></span>
        </div>
      </div>
      {/*中段：需量監控 */}
      <Card className={`rounded-none hud-panel h-[16%] p-4 relative pointer-events-auto ${darkMode ? 'bg-transparent' : 'bg-white/40'}`}>
        <h3 className="text-md 2xl:text-xl font-bold mb-[0.5dvh] flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
          需量監控
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-md 2xl:text-xl">即時需量</span>
            <span className="text-md 2xl:text-xl font-bold text-[#84ebf8]">430.157 <small className="text-8 font-normal">kW</small></span>
          </div>
          <div className="flex flex-col">
            <span className="text-md 2xl:text-xl">本月最大需量</span>
            <span className="text-md 2xl:text-xl font-bold text-[#84ebf8]">436.562 <small className="text-8 font-normal">kW</small></span>
          </div>
        </div>
      </Card>

      {/* 中下段：能耗指標 */}
      <Card className={`rounded-none hud-panel h-[20%] p-4 pointer-events-auto relative overflow-hidden ${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>
        <h3 className="text-md 2xl:text-xl font-bold mb-[0.5dvh] flex items-center gap-2 text-white">
          <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
          能耗指標
        </h3>
        <div className="flex flex-col gap-2 overflow-y-auto">
          <div className="flex justify-between items-end border-b border-white/5 pb-2">
            <span className="text-sm 2xl:text-md">本月單位面積能耗</span>
            <span className="text-md font-bold text-[#84ebf8]">174.647 <small className="text-8 font-normal text-cyan-400">kWh/m²</small></span>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-2">
            <span className="text-sm 2xl:text-md ">本月人均能耗</span>
            <span className="text-md font-bold text-[#84ebf8]">698.587 <small className="text-8 font-normal text-cyan-400">kWh/人</small></span>
          </div>
        </div>
      </Card>
      {/* 下段：趨勢圖切換 */}
      <Card className={`rounded-none hud-panel h-[52%] p-4 pointer-events-auto relative overflow-hidden ${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>
        {/* HUD Corner Accents */}
        
        
        <Tabs
          variant="underlined"
          aria-label="Trend Tabs"
          classNames={{
            base: "h-[15%] ",
            tabList: "gap-4 w-full relative rounded-none p-0 border-b border-white/10",
            cursor: "w-full bg-cyan-500",
            tab: "max-w-fit px-0 h-8",
            tabContent: "group-data-[selected=true]:text-[#84ebf8] text-md 2xl:text-xl font-semibold"
          }}
        >
          <Tab
            key="annual"
            title={
              <div className="flex items-center gap-2">
                <span className="w-1 h-3 bg-cyan-500 rounded-full"></span>
                <span>年度用電量趨勢圖</span>
              </div>
            }
          >
            <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{top:0,right:0,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="month" axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255)' }} />
                  <YAxis width={"auto"} axisLine={true} tickLine={true} tick={{ fontSize: 10, fill: 'rgba(255,255,255)' }} 
                    tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}/>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Bar dataKey="value" fill="#f97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Tab>
          <Tab
            key="monthly"
            title={
              <div className="flex items-center gap-2">
                <span className="w-1 h-3 bg-cyan-500 rounded-full"></span>
                <span>近30日用電量趨勢圖</span>
              </div>
            }
          >
            <div className="h-[200px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last30DaysData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#84ebf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.5)" vertical={false} />
                  <XAxis dataKey="day" axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,1)' }} />
                  <YAxis width={"auto"} axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,1)' }} 
                    tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}/>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#84ebf8" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Tab>
        </Tabs>
      </Card>
      
    </div>
  );
};

export default RightsideDataPanel;
