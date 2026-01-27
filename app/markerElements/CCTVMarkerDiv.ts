interface MarkerOptions {
  color?: string;       // 可選：自訂背景色
  onClick?: (elementName?:string) => void; // 可選：點擊後的動作
}

export const createMarkerElement = (text: string, options?: MarkerOptions): HTMLElement => {
    const { color = "#9519c2", onClick } = options || {};

    const element = document.createElement("div");
    element.className = "bim-marker-label"; // 給一個 class 名稱方便全域 CSS 覆蓋

    // 使用 Object.assign 或直接設定 style 屬性
    Object.assign(element.style, {
        background: color,
        color: "white",
        padding: "6px 12px",
        borderRadius: "8px",
        fontWeight: "bold",
        fontSize: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transform: "translateY(-20px)", // 往上浮一點
        pointerEvents: "auto",          // 確保可以被點擊
        cursor: "pointer",
        whiteSpace: "nowrap",           // 防止文字換行
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(4px)",
        transition: "transform 0.2s, background 0.2s" // 加入一點互動動畫
    });

    // 加入內容 (可以包含 emoji)
    element.innerText = `${text}`;

    // 加入滑鼠互動效果 (Hover)
    element.onmouseenter = () => {
        element.style.transform = "translateY(-25px) scale(1.1)";
        element.style.zIndex = "10";
    };
    
    element.onmouseleave = () => {
        element.style.transform = "translateY(-20px) scale(1.0)";
        element.style.zIndex = "1";
    };

    // 綁定點擊事件
    if (onClick) {
        element.onclick = (e) => {
        e.stopPropagation(); // 防止事件冒泡到 3D 場景
        onClick(text);
        };
    }

    return element;
};