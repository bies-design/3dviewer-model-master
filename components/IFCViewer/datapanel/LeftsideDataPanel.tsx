"use client";

import React from "react";
import { Card, Tabs, Tab } from "@heroui/react";
import {Pie,Cell,PieChart, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";

interface LeftsideDataPanelProps {
  darkMode: boolean;
}

const pieData = [
  { name: "製程系統(含電熱製程)", value: 69.6, color: "#ef4444" },
  { name: "照明系統", value: 20.2, color: "#eab308" },
  { name: "其他系統", value: 10.1, color: "#22d3ee" },
];




const rankingData = [
  { rank: 1, name: "南港廠生產中心", value: "135,455.6", percent: "89.9%" },
  { rank: 2, name: "新竹廠生產中心", value: "15,253.4", percent: "10.1%" },
];



const LeftsideDataPanel: React.FC<LeftsideDataPanelProps> = ({ darkMode }) => {
  return (
    <div className="absolute left-4 top-25 bottom-10 min-w-[300px] min-h-[600px] w-[20%] h-[85%] z-10 flex flex-col gap-4 pointer-events-none group">      
        {/*上段: 即時and本日用電 */}
        <div className="relative hud-panel h-[12%] flex gap-2 items-center justify-center"> 
          
          <div className="flex flex-col items-center px-4 border-r border-white/10 relative">
            <span className="text-xl uppercase tracking-[0.7em]"><span className="text-orange-400 font-semibold">即時</span>用電</span>
            <span className="text-xl font-bold text-[#84ebf8]">10 <small className="text-8 font-normal">kWh</small></span>
          </div>
          <div className="flex flex-col items-center px-4">
            <span className="text-xl uppercase tracking-[0.7em]"><span className="text-orange-400 font-semibold">本日</span>用電</span>
            <span className="text-xl font-bold text-[#84ebf8]">1,010 <small className="text-8 font-normal">kWh</small></span>
          </div>
        </div> 
      {/* 中段：區域用電量排名 */}
      <Card className={`rounded-none hud-panel h-[30%] p-4 pointer-events-auto relative overflow-hidden ${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>
                
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
          區域用電量情況
        </h3>
        <div className="flex flex-col gap-2 overflow-y-auto">
          
          {rankingData.map((item) => (
            <div key={item.rank} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-8 font-bold ${item.rank === 1 ? 'bg-red-500' : 'bg-orange-400'}`}>
                {item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-l truncate">{item.name}</div>
                <div className="text-[20px]">{item.percent}</div>
              </div>
              <div className="text-xl font-mono text-[#84ebf8]">{item.value}</div>
            </div>
          ))}
        </div>
      </Card>
      {/* 下段：圓餅圖 (全館電能平衡) */}
      <Card className={`rounded-none hud-panel flex-1 p-4 pointer-events-auto relative overflow-hidden ${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>

        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
          <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
          全館電能平衡圖
        </h3>
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-8 opacity-80">總計</span>
            <span className="text-lg font-bold">100%</span>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-white">{item.name}</span>
              </div>
              <span className="font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default LeftsideDataPanel;