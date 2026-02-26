// components/providers/EMSProvider.js
"use client"; // 必須聲明為客戶端組件

import { createContext, useContext, useState, useEffect,useMemo, ReactNode } from "react";
// 匯入剛才生成的 12 筆模擬數據
import mockHistory from "../data/floorsKPI12.json"; 

export interface FloorData {
    floor: string;
    kw: number;
    temp: number;
    humi: number;
    co2: number;
    timestamp: string;
}

interface EMSContextType {
    currentData: any[]; // 這裡可以定義更細的型別
    baseDailyUsage:number;
    baseMonthlyUsage:number;
    baseYearlyUsage:number;
    maxRealTimeTotalKW:number;
}

const EMSContext = createContext<EMSContextType | undefined>(undefined);

export const EMSProvider = ({ children }:{ children:ReactNode }) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [baseDailyUsage, setBaseDailyUsage] = useState<number>(1010.0);
    const [baseMonthlyUsage, setBaseMonthlyUsage] = useState<number>(30300.0);
    const [baseYearlyUsage, setbaseYearlyUsage] = useState<number>(363600.0);
    const [maxRealTimeTotalKW, setMaxRealTimeTotalKW] = useState<number>(0);

    useEffect(() => {
        const timer = setInterval(() => {
            const nextIndex = (currentIndex + 1) % mockHistory.floorKPI_History.length;
            
            // 3. 取得當前的即時總功率 (floor: "all")
            const currentAllData = mockHistory.floorKPI_History[currentIndex].data.find(d => d.floor === "all");
            const currentKW = currentAllData ? Number(currentAllData.kw) : 0;

            setMaxRealTimeTotalKW(prevMax => (currentKW > prevMax ? currentKW : prevMax));

            // 4. 計算這 5 秒間消耗的 kWh (kW * 小時)
            // 公式：kW * (5秒 / 3600秒)
            const deltaKWh = (currentKW * 5) / 3600;

            // 5. 更新狀態
            setBaseDailyUsage(prev => prev + deltaKWh);
            setBaseMonthlyUsage(prev => prev + deltaKWh);
            setbaseYearlyUsage(prev => prev + deltaKWh);
            setCurrentIndex(nextIndex);
        }, 5000);

        return () => clearInterval(timer);
    }, [currentIndex]);

    // 取得當前這一秒的所有樓層數據
    const currentData = mockHistory.floorKPI_History[currentIndex].data;

    return (
        <EMSContext.Provider value={{ 
            currentData, 
            baseDailyUsage, 
            baseMonthlyUsage, 
            baseYearlyUsage,
            maxRealTimeTotalKW 
        }}>
            {children}
        </EMSContext.Provider>
    );
};

export const useEMS = () => {
    const context = useContext(EMSContext);
    if (!context) {
        throw new Error("useEMS must be used within an EMSProvider");
    }
    return context;
};