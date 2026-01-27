'use client';
import React, { useState, useEffect } from "react";
import dayjs from "dayjs"; // 建議使用你專案中已有的 dayjs

const DigitalClock = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // 每秒更新一次狀態
        const timer = setInterval(() => {
        setNow(new Date());
        }, 1000);

        // 清除計時器防止記憶體洩漏
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-end font-mono absolute tracking-wider">
        {/* 日期部分 */}
        <div className="text-[10px] text-[#2CEDED] uppercase">
            {dayjs(now).format("YYYY / MM / DD")}
        </div>
        {/* 時間部分 */}
        <div className="text-xl text-white font-bold leading-none">
            {dayjs(now).format("HH : mm : ss")}
        </div>
        </div>
    );
};

export default DigitalClock;