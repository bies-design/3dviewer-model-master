"use client";

import React,{useMemo,useState} from "react";
import { Card, Tabs, Tab } from "@heroui/react";
import {Pie,Cell,PieChart, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";

interface LeftsideDataPanelProps {
  darkMode: boolean;
}

const usage = [
  {instant: 10, daily: 1010, monthly: 11121, yearly: 111121},
];
const pieData = [
  { name: "製程系統(含電熱製程)", value: 69.6, color: "#ef4444" },
  { name: "照明系統", value: 20.2, color: "#eab308" },
  { name: "其他系統", value: 10.1, color: "#22d3ee" },
];

const softPalette = [
  "#60A5FA", // 柔和藍
  "#34D399", // 柔和青綠
  "#FBBF24", // 柔和琥珀黃
  "#A78BFA", // 柔和紫
  "#F472B6", // 柔和粉紅
  "#22D3EE", // 亮青 (呼應主題色)
  "#A3E635", // 柔和萊姆綠
  "#FB923C", // 柔和橘
  "#E879F9", // 柔和洋紅
];

const Data1 = [
  // --- 2025年 12月 ---
  { name: "南港廠生產中心", value: 135455.6, date: "2025-12-01T08:30:00.000+00:00" },
  { name: "汐止研發總部", value: 98234.2, date: "2025-12-02T10:15:22.123+00:00" },
  { name: "台中營運處", value: 45678.9, date: "2025-12-03T14:44:53.437+00:00" },
  { name: "高雄物流中心", value: 112340.5, date: "2025-12-05T07:44:53.437+00:00" },
  { name: "南港廠生產中心", value: 128900.1, date: "2025-12-06T09:20:11.000+00:00" },
  { name: "汐止研發總部", value: 102345.8, date: "2025-12-08T16:05:44.555+00:00" },
  { name: "台中營運處", value: 48900.3, date: "2025-12-10T11:30:00.000+00:00" },
  { name: "南港廠生產中心", value: 142000.7, date: "2025-12-12T08:00:00.000+00:00" },
  { name: "高雄物流中心", value: 105660.2, date: "2025-12-13T13:15:22.000+00:00" },
  { name: "汐止研發總部", value: 95400.4, date: "2025-12-15T10:44:53.437+00:00" },
  { name: "台中營運處", value: 46780.1, date: "2025-12-17T09:00:00.000+00:00" },
  { name: "南港廠生產中心", value: 138550.6, date: "2025-12-18T14:20:33.111+00:00" },
  { name: "高雄物流中心", value: 118900.9, date: "2025-12-20T17:44:53.437+00:00" },
  { name: "汐止研發總部", value: 101200.3, date: "2025-12-21T08:30:00.000+00:00" },
  { name: "台中營運處", value: 49200.5, date: "2025-12-23T11:15:00.000+00:00" },
  { name: "南港廠生產中心", value: 145600.2, date: "2025-12-25T10:00:00.000+00:00" },
  { name: "高雄物流中心", value: 110450.8, date: "2025-12-26T15:44:53.437+00:00" },
  { name: "汐止研發總部", value: 97800.6, date: "2025-12-28T09:30:00.000+00:00" },
  { name: "台中營運處", value: 47100.4, date: "2025-12-29T14:05:22.000+00:00" },
  { name: "南港廠生產中心", value: 140200.9, date: "2025-12-31T23:59:59.999+00:00" },

  // --- 2026年 1月 ---
  { name: "南港廠生產中心", value: 132455.6, date: "2026-01-01T08:44:53.437+00:00" },
  { name: "汐止研發總部", value: 99400.2, date: "2026-01-02T10:30:00.000+00:00" },
  { name: "台中營運處", value: 44200.8, date: "2026-01-03T16:15:44.000+00:00" },
  { name: "高雄物流中心", value: 115600.4, date: "2026-01-04T09:00:00.000+00:00" },
  { name: "南港廠生產中心", value: 129800.3, date: "2026-01-05T14:44:53.437+00:00" },
  { name: "汐止研發總部", value: 103200.1, date: "2026-01-07T11:20:00.000+00:00" },
  { name: "台中營運處", value: 48500.6, date: "2026-01-08T08:30:33.000+00:00" },
  { name: "南港廠生產中心", value: 144200.7, date: "2026-01-10T10:05:44.222+00:00" },
  { name: "高雄物流中心", value: 112100.5, date: "2026-01-11T13:44:53.437+00:00" },
  { name: "汐止研發總部", value: 96500.9, date: "2026-01-12T15:00:00.000+00:00" },
  { name: "台中營運處", value: 45300.2, date: "2026-01-14T09:15:22.000+00:00" },
  { name: "南港廠生產中心", value: 137400.4, date: "2026-01-15T17:44:53.437+00:00" },
  { name: "高雄物流中心", value: 119800.8, date: "2026-01-16T08:44:53.437+00:00" },
  { name: "汐止研發總部", value: 100400.6, date: "2026-01-18T10:30:00.000+00:00" },
  { name: "台中營運處", value: 49800.3, date: "2026-01-19T14:00:00.000+00:00" },
  { name: "南港廠生產中心", value: 141200.1, date: "2026-01-20T11:44:53.437+00:00" },
  { name: "高雄物流中心", value: 108900.5, date: "2026-01-21T09:20:11.000+00:00" },
  { name: "汐止研發總部", value: 98100.2, date: "2026-01-22T16:44:53.437+00:00" },
  { name: "台中營運處", value: 46200.7, date: "2026-01-24T10:15:44.000+00:00" },
  { name: "南港廠生產中心", value: 146800.4, date: "2026-01-25T08:30:00.000+00:00" },
  { name: "高雄物流中心", value: 114500.9, date: "2026-01-26T13:44:53.437+00:00" },
  { name: "汐止研發總部", value: 104200.3, date: "2026-01-27T09:00:00.000+00:00" },
  { name: "台中營運處", value: 45900.1, date: "2026-01-28T14:20:00.000+00:00" },
  { name: "南港廠生產中心", value: 133400.8, date: "2026-01-29T10:15:22.000+00:00" },
  { name: "高雄物流中心", value: 117600.2, date: "2026-01-29T16:44:53.437+00:00" },
  { name: "汐止研發總部", value: 99100.5, date: "2026-01-30T08:00:00.000+00:00" },
  { name: "台中營運處", value: 44800.9, date: "2026-01-30T13:30:00.000+00:00" },
  { name: "南港廠生產中心", value: 139500.2, date: "2026-01-31T09:44:53.437+00:00" },
  { name: "高雄物流中心", value: 113200.4, date: "2026-01-31T15:20:00.000+00:00" },
  { name: "汐止研發總部", value: 101800.7, date: "2026-01-31T20:00:00.000+00:00" }
];


const LeftsideDataPanel: React.FC<LeftsideDataPanelProps> = ({ darkMode }) => {

  const availableYears = useMemo(() => {
    const years = Data1.map(item => new Date(item.date).getFullYear());
    return Array.from(new Set(years)).sort((a, b) => b - a);
  },[]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]?.toString() || "");
  const [selectedMonth, setSelectedMonth] = useState("");

  const filteredRankingData = useMemo(() => {
    if (!selectedYear) return [];

    // 第一步：過濾年份
    const yearData = Data1.filter(item => new Date(item.date).getFullYear() === parseInt(selectedYear));

    // 第二步：歸檔計算 (按廠區名稱 Group By 並加總 Value)
    const grouped = yearData.reduce((acc, item) => {
      const month = new Date(item.date).getMonth() + 1;
      
      // 如果有選擇特定月份，就只保留該月資料
      if (selectedMonth && month !== parseInt(selectedMonth)) return acc;

      const name = item.name;
      if (!acc[name]) {
        acc[name] = 0;
      }
      acc[name] += item.value;
      return acc;
    }, {} as Record<string, number>);

    // 第三步：轉回陣列並排序 (由大到小)
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedYear, selectedMonth]);
  
  const totalValue = useMemo(() => {
    return filteredRankingData.reduce((sum, item) => sum + item.value, 0);
  }, [filteredRankingData]);

  return (
    <div className="absolute left-4 top-25 bottom-10 min-w-[270px] w-[20%] h-[85%] z-10 flex flex-col gap-4 pointer-events-none group">      
        {/* 上段: 即時and本日用電 (保持不變) */}
        <div className="relative hud-panel h-[12%] flex gap-2 items-center justify-center"> 
          <div className="flex flex-col items-center px-4 border-r border-white/10 relative">
            <span className="text-md 2xl:text-xl uppercase min-[1734px]:tracking-[0.7em]"><span className="text-orange-400 font-semibold">即時</span>用電</span>
            <span className="text-md 2xl:text-xl font-bold text-[#84ebf8]">10 <small className="text-8 font-normal">kWh</small></span>
          </div>
          <div className="flex flex-col items-center px-4">
            <span className="text-md 2xl:text-xl uppercase min-[1734px]:tracking-[0.7em]"><span className="text-orange-400 font-semibold">本日</span>用電</span>
            <span className="text-md 2xl:text-xl font-bold text-[#84ebf8]">1,010 <small className="text-8 font-normal">kWh</small></span>
          </div>
        </div> 

      {/* 3. 中段修改：將下拉選單與計算後的資料放入 */}
      <Card className={`rounded-none hud-panel h-[30%] p-4 pointer-events-auto relative overflow-hidden ${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>
        
        {/* 標題與選單區塊 */}
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-md 2xl:text-xl font-bold flex items-center gap-2 text-white">
            <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
            區域用電量
            </h3>

            {/* 下拉選單群組 */}
            <div className="flex gap-1 max-xl:flex-col">
                {/* 年份選單 */}
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-white/10 text-white text-xs border border-white/20 rounded px-1 py-1 outline-none backdrop-blur-md cursor-pointer hover:bg-white/20"
                >
                    {availableYears.map(year => (
                    <option key={year} value={year} className="bg-slate-800 text-white">{year}年</option>
                    ))}
                </select>

                {/* 月份選單 */}
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white/10 text-white text-xs border border-white/20 rounded px-1 py-1 outline-none backdrop-blur-md cursor-pointer hover:bg-white/20"
                >
                    <option value="" className="bg-slate-800 text-white">全月</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m} className="bg-slate-800 text-white">{m}月</option>
                    ))}
                </select>
            </div>
        </div>

        {/* 資料列表區塊 (使用 filteredRankingData) */}
        <div className="flex flex-col gap-2 overflow-y-auto h-[calc(100%-40px)]">
          {/* 如果沒有資料顯示提示 */}
          {filteredRankingData.length === 0 && (
            <div className="text-center text-white/80 mt-4">無資料</div>
          )}

          {filteredRankingData.map((item, index) => {
            // 計算百分比
            const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0.0";
            const color = softPalette[index % softPalette.length];

            return (
                <div key={item.name} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                <span className={`w-5 h-5 flex items-center justify-center rounded text-8 font-bold`}
                      style={{backgroundColor : color}}>
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="text-l truncate text-white">{item.name}</div>
                    <div className="text-[12px] text-white/80">{percentage}%</div>
                </div>
                <div className="text-xl font-mono text-[#84ebf8]">
                    {/* 數值格式化 (加逗號) */}
                    {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                </div>
            );
          })}
        </div>
      </Card>

      {/* 下段：圓餅圖 (保持不變) */}
      {/* 下段：圓餅圖 (依照篩選資料連動) */}
      <Card className={`rounded-none hud-panel flex-1 p-4 pointer-events-auto relative overflow-hidden ${darkMode ? 'bg-transparent' : 'bg-white/60'}`}>
        <h3 className="text-md 2xl:text-xl font-bold mb-2 flex items-center gap-2 text-white">
          <span className="w-1 h-4 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] rounded-full"></span>
          {selectedYear}年 {(selectedMonth === "") ? "" : `${selectedMonth}月`} 全館電能平衡圖
        </h3>

        <div className="flex-1 min-h-0 relative flex flex-col">
          {filteredRankingData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/50">
              無資料
            </div>
          ) : (
            <>
              {/* 圓餅圖區塊 */}
              <div className="flex-1 min-h-0 w-full relative ">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={filteredRankingData} // 直接傳入篩選後的資料
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {filteredRankingData.map((entry, index) => {

                        const color = softPalette[index % softPalette.length];
                        return <Cell key={`cell-${index}`} fill={color} stroke={darkMode ? "rgba(0,0,0,0.5)" : "white"} />;
                      })}
                    </Pie>
                    <Tooltip
                      // 自定義 Tooltip 內容，顯示數值與百分比
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0.0";
                          return (
                            <div className="bg-slate-800/90 border border-white/20 p-2 rounded text-xs text-white shadow-xl backdrop-blur-md">
                              <p className="font-bold mb-1">{data.name}</p>
                              <p>數值: <span className="text-[#84ebf8] font-mono">{data.value.toLocaleString()}</span></p>
                              <p>佔比: <span className="text-yellow-400 font-mono">{percent}%</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* 中央總計文字 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] opacity-60 text-white">總計</span>
                  <span className="text-lg font-bold text-white">100%</span>
                </div>
              </div>

              {/* 底部 Legend 列表 (連動資料) */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[200px] pr-1">
                {filteredRankingData.map((item, index) => {
                  const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0.0";
                  const color = softPalette[index % softPalette.length];

                  return (
                    <div key={item.name} className="flex items-center justify-between text-sm hover:bg-white/5 p-1 rounded transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}></div>
                        <span className="text-white truncate max-w-[120px]" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-[#84ebf8] font-mono ml-2">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LeftsideDataPanel;