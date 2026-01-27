import React, { forwardRef } from "react";

/**
 * TechCard - 科技感裝飾邊框組件
 * 
 * 設計目標：
 * 1. 佈局中立：不包含內建 padding，不影響內部排版。
 * 2. 自動填滿：繼承父層寬高（建議父層設為 relative）。
 * 3. 屬性相容：支援所有原生 div 屬性與 ref 轉發。
 */
export interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const TechCard = forwardRef<HTMLDivElement, TechCardProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        // 使用 relative 作為角落定位基準，移除 p-6，確保不影響排版
        className={`relative bg-transparent ${className || ""}`}
        {...props}
      >
        {/* 直接渲染子元件，不加額外的包裹層 */}
        {children}

        {/* --- 四個角落裝飾 (使用 pointer-events-none 確保不干擾點擊) --- */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 左上 (Top-Left) */}
          <span className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-[#2BC3EC] rounded-tl-sm shadow-[inner_0_2px_0_#00ffff]" />

          {/* 右上 (Top-Right) */}
          <span className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-[#2BC3EC] rounded-tr-sm shadow-[inner_0_2px_0_#00ffff]" />

          {/* 左下 (Bottom-Left) */}
          <span className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-[#2BC3EC] rounded-bl-sm shadow-[inner_0_2px_0_#00ffff]" />

          {/* 右下 (Bottom-Right) */}
          <span className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-[#2BC3EC] rounded-br-sm shadow-[inner_0_2px_0_#00ffff]" />
        </div>
      </div>
    );
  }
);

TechCard.displayName = "TechCard";

export default TechCard;
