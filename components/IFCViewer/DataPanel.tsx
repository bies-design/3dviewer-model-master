"use client";

import type { ButtonProps, CardProps } from "@heroui/react";
import React, { useRef, useEffect, useState, useMemo } from "react";
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell, PolarAngleAxis, Area, AreaChart, CartesianGrid, Tooltip, XAxis, } from "recharts";
import { Card, Chip, Tab, Tabs } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

type RadialChartData = { name: string; value: number; fill: string };
type TimeSeriesData = { time: number; value: number };

type CircleChartProps = {
  title: string;
  color: ButtonProps["color"];
  chartData: RadialChartData[];
  timeSeriesData: TimeSeriesData[];
  total: number;
};

type AreaChartData = { month: string; value: number; lastYearValue: number };
type Chart = {
  key: string;
  title: string;
  value: number;
  suffix: string;
  type: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  chartData: AreaChartData[];
};

const generateInitialTimeSeries = (initialValue: number): TimeSeriesData[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    time: i,
    value: initialValue + (Math.random() - 0.5) * (initialValue * 0.1) + (Math.random() - 0.5) * 2,
  }));
};

const initialSensorData: CircleChartProps[] = [
  { title: "KW", color: "primary", total: 500, chartData: [{ name: "KW", value: 248.18, fill: "hsl(var(--heroui-primary))" }], timeSeriesData: generateInitialTimeSeries(248.18) },
  { title: "TEMP", color: "secondary", total: 40, chartData: [{ name: "TEMP", value: 26.74, fill: "hsl(var(--heroui-secondary))" }], timeSeriesData: generateInitialTimeSeries(26.74) },
  { title: "HUMI", color: "success", total: 100, chartData: [{ name: "HUMI", value: 34.36, fill: "hsl(var(--heroui-success))" }], timeSeriesData: generateInitialTimeSeries(34.36) },
  { title: "CO2", color: "warning", total: 1000, chartData: [{ name: "CO2", value: 436.26, fill: "hsl(var(--heroui-warning))" }], timeSeriesData: generateInitialTimeSeries(436.26) },
];

const initialAnalytics: Chart = {
  key: "unique-visitors",
  title: "Unique Visitors",
  suffix: "visitors",
  value: 147000,
  type: "number",
  change: "12.8%",
  changeType: "positive",
  chartData: [
    { month: "Jan", value: 98000, lastYearValue: 43500 },
    { month: "Feb", value: 125000, lastYearValue: 38500 },
    { month: "Mar", value: 89000, lastYearValue: 58300 },
    { month: "Apr", value: 156000, lastYearValue: 35300 },
    { month: "May", value: 112000, lastYearValue: 89600 },
    { month: "Jun", value: 167000, lastYearValue: 56400 },
    { month: "Jul", value: 138000, lastYearValue: 45200 },
    { month: "Aug", value: 178000, lastYearValue: 84600 },
    { month: "Sep", value: 129000, lastYearValue: 73500 },
    { month: "Oct", value: 159000, lastYearValue: 65900 },
    { month: "Nov", value: 147000, lastYearValue: 82300 },
    { month: "Dec", value: 127000, lastYearValue: 95000 },
  ],
};

const formatRadialTotal = (v?: number) => v?.toLocaleString() ?? "0";
const formatAreaValue = (v: number, t?: string) =>
  t === "number"
    ? v >= 1_000_000
      ? (v / 1_000_000).toFixed(1) + "M"
      : v >= 1_000
      ? (v / 1_000).toFixed(0) + "k"
      : v.toLocaleString()
    : t === "percentage"
    ? `${v}%`
    : v;

const formatMonth = (m: string) => {
  const map = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 } as const;
  const idx = map[m as keyof typeof map] ?? 0;
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2024, idx, 1));
};

const CircleChartCard: React.FC<Omit<CardProps, "children"> & CircleChartProps & { showRing: boolean; showLine: boolean; darkMode: boolean; }> = ({
  className,
  title,
  darkMode,
  color,
  chartData,
  timeSeriesData,
  total,
  showRing,
  showLine,
  ...props
}) => (
  <Card
    isBlurred
    className={`h-full min-h-0 border-none ${darkMode ? "dark border-default-100 bg-default-100/30" : "bg-background/60"} ${className}`}
    {...props}
  >
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <h3 className="text-small text-default-500 font-medium">{title}</h3>
      </div>
      <div className="flex-grow relative">
        {showRing && (
          <ResponsiveContainer height="100%" width="100%">
            <RadialBarChart barSize={10} cx="50%" cy="50%" data={chartData} endAngle={-45} innerRadius={90} outerRadius={70} startAngle={225}>
              <PolarAngleAxis angleAxisId={0} domain={[0, total]} tick={false} type="number" />
              <RadialBar
                angleAxisId={0}
                animationDuration={800}
                background={{ fill: "hsl(var(--heroui-default-100))" }}
                cornerRadius={12}
                dataKey="value"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`hsl(var(--heroui-${color}))`} />
                ))}
              </RadialBar>
              <g>
                <text textAnchor="middle" x="50%" y="48%">
                  <tspan className="fill-default-500 text-tiny" dy="-0.5em" x="50%">
                    {chartData?.[0].name}
                  </tspan>
                  <tspan className="fill-foreground text-medium font-semibold" dy="1.5em" x="50%">
                    {formatRadialTotal(chartData?.[0].value)}
                  </tspan>
                </text>
              </g>
            </RadialBarChart>
          </ResponsiveContainer>
        )}
        {showLine && (
          <div className="absolute bottom-8 left-0 w-full h-1/3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 0, right: 36, left: 36, bottom: 12 }}>
                <defs>
                  <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`hsl(var(--heroui-${color}))`} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={`hsl(var(--heroui-${color}))`} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={`hsl(var(--heroui-${color}))`} fillOpacity={1} fill={`url(#color-${color})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  </Card>
);

const generateChartData = (numPoints: number, unit: string) => {
  const key = unit === 'hours' ? 'hour' : unit === 'days' ? 'day' : 'month';
  const unitLabel = unit === 'hours' ? 'H' : unit === 'days' ? 'D' : 'M';
  return Array.from({ length: numPoints }, (_, i) => ({
    [key]: `${unitLabel}${i + 1}`,
    value: Math.floor(Math.random() * (200000 - 50000 + 1)) + 50000,
    lastYearValue: Math.floor(Math.random() * (100000 - 30000 + 1)) + 30000,
  }));
};

const timeRangeData: { [key: string]: any[] } = {
  "6-months": generateChartData(6, 'months'),
  "3-months": generateChartData(3, 'months'),
  "30-days": generateChartData(30, 'days'),
  "7-days": generateChartData(7, 'days'),
  "24-hours": generateChartData(24, 'hours'),
};

const AnalyticsChart: React.FC<{ data: Chart; darkMode: boolean; fillHeight?: boolean }> = ({
  data,
  darkMode,
  fillHeight = false,
}) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<string | number>("6-months");
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState(data.chartData);
  const [xAxisKey, setXAxisKey] = useState("month");

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof timeRange === 'string' && timeRangeData[timeRange]) {
      setChartData(timeRangeData[timeRange]);
      if (timeRange.includes('hour')) {
        setXAxisKey('hour');
      } else if (timeRange.includes('day')) {
        setXAxisKey('day');
      } else {
        setXAxisKey('month');
      }
    }
  }, [timeRange]);

  const color =
    data.changeType === "positive" ? "success" : data.changeType === "negative" ? "danger" : "default";

  if (!isClient) {
    return null;
  }

  return (
    <Card
      as="dl"
      isBlurred
      className={[
        "border-none mt-2",
        darkMode ? "dark border-default-100 bg-default-100/70" : "bg-background/60",
        fillHeight ? "h-full flex flex-col min-h-0" : "",
      ].join(" ")}
    >
      <div className="p-6 flex-shrink-0">
        <Tabs size="sm" selectedKey={timeRange} onSelectionChange={setTimeRange}>
          <Tab key="6-months" title={t("6-months")} />
          <Tab key="3-months" title={t("3-months")} />
          <Tab key="30-days" title={t("30-days")} />
          <Tab key="7-days" title={t("7-days")} />
          <Tab key="24-hours" title={t("24-hours")} />
        </Tabs>
        <div className="mt-3 flex overflow-x-auto gap-3">
          <div className="rounded-medium flex flex-col gap-2 p-3 bg-default-100">
            <span className="text-small text-primary">{data.title}</span>
            <div className="flex items-center gap-x-3">
              <span className="text-foreground text-3xl font-bold">
                {formatAreaValue(data.value, data.type)}
              </span>
              <Chip
                color={color}
                radius="sm"
                size="sm"
                startContent={
                  data.changeType === "positive" ? (
                    <Icon height={16} icon="solar:arrow-right-up-linear" width={16} />
                  ) : data.changeType === "negative" ? (
                    <Icon height={16} icon="solar:arrow-right-down-linear" width={16} />
                  ) : (
                    <Icon height={16} icon="solar:arrow-right-linear" width={16} />
                  )
                }
                variant="flat"
              >
                {data.change}
              </Chip>
            </div>
          </div>
        </div>
      </div>

      <div className={fillHeight ? "flex-1 min-h-0" : ""}>
        <ResponsiveContainer height={fillHeight ? "100%" : 300} width="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 0 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="10%" stopColor={`hsl(var(--heroui-${color}-500))`} stopOpacity={0.3} />
              <stop offset="100%" stopColor={`hsl(var(--heroui-${color}-100))`} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--heroui-default-200))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ label, payload }) => (
              <div className="rounded bg-foreground text-tiny p-2 shadow">
                {payload?.map((p, i) => (
                  <div key={i}>
                    {formatAreaValue(p.value as number, data.type)} {data.suffix}
                  </div>
                ))}
                <div className="text-foreground-400 text-xs">{formatMonth(label as string)} 25, 2024</div>
              </div>
            )}
            cursor={{ stroke: "hsl(var(--heroui-default-400))", strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <Area
            dataKey="value"
            fill="url(#colorGradient)"
            stroke={`hsl(var(--heroui-${color}-500))`}
            strokeWidth={2}
            type="monotone"
          />
          <Area
            dataKey="lastYearValue"
            fill="transparent"
            stroke="hsl(var(--heroui-default-400))"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </Card>
  );
};

interface DataPanelProps {
  darkMode: boolean;
  showGauges: {
    kw: { ring: boolean; line: boolean; };
    temp: { ring: boolean; line: boolean; };
    humi: { ring: boolean; line: boolean; };
    co2: { ring: boolean; line: boolean; };
  };
  showVisitors: boolean;
  intervalMs: number;
}

const DataPanel: React.FC<DataPanelProps> = ({ darkMode, showGauges, showVisitors, intervalMs }) => {
  const [sensorData, setSensorData] = useState(initialSensorData);
  const [chart, setChart] = useState(initialAnalytics);

  useEffect(() => {
    const timer = setInterval(() => {
      setSensorData((prev) =>
        prev.map((s) => {
          let newValue = parseFloat((s.chartData[0].value + (Math.random() - 0.5) * (s.total * 0.05)).toFixed(2));
          if (s.title === "TEMP") {
            // Keep temperature around a lower central value, e.g., 25
            newValue = parseFloat((25 + (Math.random() - 0.5) * 10).toFixed(2));
            newValue = Math.max(10, Math.min(40, newValue));
          }
          if (s.title === "HUMI") {
            newValue = Math.max(30, Math.min(70, newValue));
          }
          if (s.title === "CO2") {
            newValue = Math.max(250, Math.min(1100, newValue));
          }
          const newTimeSeries = [...s.timeSeriesData.slice(1), { time: s.timeSeriesData.length, value: newValue }];
          return {
            ...s,
            chartData: [{ ...s.chartData[0], value: newValue }],
            timeSeriesData: newTimeSeries,
          };
        })
      );
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const monthCounterRef = useRef(13);
  useEffect(() => {
    const chartTimer = setInterval(() => {
      setChart((prev) => {
        const last = prev.chartData[prev.chartData.length - 1];
        const newValue = Math.max(50000, last.value + (Math.random() - 0.5) * 30000);
        const newLastYear = Math.max(30000, last.lastYearValue + (Math.random() - 0.5) * 20000);
        const newMonth = `M${monthCounterRef.current++}`;
        const updatedData = [...prev.chartData.slice(1), { month: newMonth, value: newValue, lastYearValue: newLastYear }];
        return { ...prev, chartData: updatedData, value: newValue };
      });
    }, intervalMs);
    return () => clearInterval(chartTimer);
  }, [intervalMs]);

  const visibleGaugesCount = Object.values(showGauges).filter(g => g.ring || g.line).length;

  if (visibleGaugesCount === 0 && !showVisitors) {
    return null;
  }

  return (
    <div className="absolute right-4 inset-y-2 z-10 w-[440px] h-[calc(100%-1rem)] overflow-hidden">
      <div className="h-full grid grid-rows-2 gap-2 min-h-0">
        {/* TOP 50%: Gauges */}
        <div className="min-h-0 overflow-hidden">
          <div className="h-full grid grid-cols-2 grid-rows-2 gap-2 min-h-0">
            {sensorData.slice(0, 4).map((item, i) => {
              const gaugeKey = item.title.toLowerCase() as keyof typeof showGauges;
              const v = showGauges[gaugeKey];
              if (!v || (!v.ring && !v.line)) return null;

              return (
                <CircleChartCard
                  key={i}
                  {...item}
                  showRing={v.ring}
                  showLine={v.line}
                  darkMode={darkMode}
                  className="h-full min-h-0"
                />
              );
            })}
          </div>
        </div>

        {/* BOTTOM 50%: Visitors */}
        <div className="min-h-0 overflow-hidden">
          {showVisitors ? (
            <AnalyticsChart data={chart} darkMode={darkMode} fillHeight />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DataPanel;
