# IFC Viewer 技術文件

## 📑 目錄
[TOC]

---

## 1. 核心架構

本專案採用 Next.js (React) 框架，並整合 `@thatopen/components` (OBC) 來實現 IFC/BIM Viewer 功能。

-   **核心容器**: `containers/IFCViewerContainer.tsx` 是整個 Viewer 的主容器，負責初始化 `OBC.Components`、管理世界 (World)、渲染器 (Renderer)、相機 (Camera)，並整合所有子組件。
-   **狀態管理**: 主要使用 React 的 `useState` 和 `useRef` 來管理狀態。複雜的 Viewer 物件 (如 `components`, `world`) 被存儲在 `useRef` 中以避免在每次渲染時重新創建。
-   **組件化**: 功能被拆分為多個子組件 (位於 `components/IFCViewer/`)，例如 `ToolBar`、`SearchElement`、`CollisionDetector` 等。父子組件之間通過 props 傳遞狀態和回調函式。

---

## 2. 主要功能流程分析

### 2.1 Viewer 初始化與模型加載

這是應用程式啟動時最關鍵的流程，負責建立 3D 環境並準備好所有必要的工具。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    A[React `useEffect` 觸發] --> B{初始化 `OBC.Components`};
    B --> C[創建 `World`、`Scene`、`Renderer`、`Camera`];
    C --> D{設置相機初始位置};
    D --> E[初始化 `Components` (components.init())];
    E --> F{加載並設置 `IfcLoader` 的 WASM};
    F --> G{初始化 `FragmentsManager` 並設置 Worker};
    G --> H[設置事件監聽器];
    H --> H1[   - `camera.controls.on('update', ...)`];
    H --> H2[   - `fragments.list.onItemSet.add(...)`];
    H --> H3[   - `viewer.addEventListener('click', ...)`];
    H --> I[初始化各種工具 (Highlighter, Hider, Clipper, etc.)];
    I --> J[將 `components` 實例存入 React State];
    J --> K[Viewer 準備就緒];

    subgraph 模型加載流程
        L[使用者上傳 IFC 檔案] --> M{`IfcUpload` 函式};
        M --> N[讀取檔案為 `Uint8Array`];
        N --> O{調用 `ifcLoader.load()`};
        O -- 觸發 --> P[`fragments.list.onItemSet` 事件];
        P --> Q[事件處理函式執行];
        Q --> Q1[   - `model.useCamera(...)`];
        Q --> Q2[   - `world.scene.three.add(model)`];
        Q --> R[模型顯示在畫面上];
    end
```

#### 相關程式碼片段

**1. Viewer 初始化 (`IFCViewerContainer.tsx`)**

在 `useEffect` hook 中執行一次，以設置整個 Viewer 環境。

```typescript
// containers/IFCViewerContainer.tsx

useEffect(() => {
  if (!viewerRef.current) return;

  const init = async () => {
    // 1. 初始化核心 Components
    const components = new OBC.Components();
    componentsRef.current = components;

    // 2. 創建 3D 世界和場景
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create();
    worldRef.current = world;
    const scene = new OBC.SimpleScene(components);
    world.scene = scene;
    scene.setup();

    // 3. 設置渲染器和相機
    const renderer = new OBCF.PostproductionRenderer(components, viewerRef.current!);
    world.renderer = renderer;
    const camera = new OBC.OrthoPerspectiveCamera(components);
    world.camera = camera;
    await camera.controls.setLookAt(3, 3, 3, 0, 0, 0);
    
    // 4. 初始化所有已註冊的組件
    components.init();

    // 5. 設置 IFC 加載器 (WASM)
    const ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
    });

    // 6. 設置 Fragments 管理器 (Worker)
    const fragments = components.get(OBC.FragmentsManager);
    // ... (此處省略了獲取 worker URL 的程式碼)
    fragments.init(workerUrl);
    fragmentsRef.current = fragments;

    // 7. 綁定核心事件
    // 當模型被添加到 fragments 列表時，自動將其添加到場景
    fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      fragments.core.update(true);
    });

    // 8. 初始化其他工具
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });
    components.get(OBC.Hider);
    // ...

    // 9. 將 components 實例存儲起來，供其他子組件使用
    setComponents(components);

    // ... (此處省略了點擊、resize 等事件監聽器的綁定和清理)
  };

  init();
}, []);
```

**2. IFC 模型加載 (`IFCViewerContainer.tsx`)**

當使用者通過 UI 上傳檔案時，`IfcUpload` 函式會被調用。

```typescript
// containers/IFCViewerContainer.tsx

const IfcUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !ifcLoaderRef.current) return;

  try {
    // ... (進度條相關邏輯)

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 調用 ifcLoader.load()，這是觸發模型處理的關鍵
    // 注意：此處不應再手動將返回的 fragModel 添加到場景，
    // 因為 `fragments.list.onItemSet` 事件會自動處理。
    await ifcLoaderRef.current.load(uint8Array, false, modelId, {
      // ...
    });

    // ... (更新 UI 狀態)

  } catch (err) {
    console.error("Failed to load IFC:", err);
  } finally {
    // ... (關閉進度條)
  }
};

---

### 2.2 元素查詢 (Element Search)

此功能允許使用者根據屬性 (如 Category, Name) 查找模型中的元素。它由 `SearchElement.tsx` 組件實現，核心依賴 `OBC.ItemsFinder`。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    A[使用者在 `SearchElement` UI 中輸入查詢條件] --> B{點擊 "Search" 按鈕};
    B --> C{`handleSearch` 函式觸發};
    C --> D[遍歷所有查詢行 (Query Rows)];
    D --> E{For each row...};
    E --> F[根據 `operator` 建立 RegExp];
    F --> G[根據 `attribute` 建立 `queryPart`];
    G --> H[使用 `finder.create()` 創建臨時查詢];
    H --> I{調用 `query.test()` 執行查詢};
    I --> J[獲取 `currentQueryResult` (ModelIdMap)];
    J --> K{根據 `logic` (AND/NOT) 與 `finalResult` 進行集合運算};
    K --> L[更新 `finalResult`];
    L --> E;
    E -- all rows processed --> M{檢查 `finalResult`};
    M -- 有結果 --> N{調用 `hider.isolate(finalResult)`};
    N --> O[在 Viewer 中僅顯示匹配的元素];
    M -- 無結果 --> P{調用 `hider.set(true)`};
    P --> Q[顯示所有元素並提示 "No elements found"];
```

#### 相關程式碼片段

**1. 執行搜索 (`SearchElement.tsx`)**

`handleSearch` 是此功能的核心，它將 UI 上的查詢條件轉換為 `ItemsFinder` 的查詢，並處理多個條件之間的邏輯。

```typescript
// components/IFCViewer/SearchElement.tsx

const handleSearch = useCallback(async () => {
  setIsSearching(true);
  try {
    const finder = components.get(OBC.ItemsFinder);
    const highlighter = components.get(OBCF.Highlighter);
    const hider = components.get(OBC.Hider);

    // ... (此處省略了 intersect 和 difference 輔助函式)

    const activeQueries = queryRows.filter(row => row.value);
    if (activeQueries.length === 0) {
      await hider.set(false); // 如果沒有查詢，則隱藏所有
      return;
    }

    let finalResult: ModelIdMap | null = null;

    // 1. 遍歷所有有效的查詢條件
    for (let i = 0; i < activeQueries.length; i++) {
      const row = activeQueries[i];

      // 2. 根據操作符創建正則表達式
      let regex;
      switch (row.operator) {
        case "equal": regex = new RegExp(`^${row.value}$`, "i"); break;
        // ... 其他 case
        default: regex = new RegExp(row.value, "i"); break;
      }

      // 3. 構建查詢體
      const queryPart = row.attribute === "Category"
        ? { categories: [regex] }
        : { attributes: { queries: [{ name: new RegExp(row.attribute, "i"), value: regex }] } };
      
      // 4. 創建並執行查詢
      const queryName = `query-row-${i}`;
      finder.create(queryName, [queryPart]);
      const query = finder.list.get(queryName);
      if (!query) continue;
      const currentQueryResult = await query.test();
      finder.list.delete(queryName); // 清理臨時查詢

      // 5. 處理 AND/NOT 邏輯
      if (i === 0) {
        if (row.logic === "NOT") {
          const allItems = await getAllItems(); // 獲取所有元素以計算差集
          finalResult = difference(allItems, currentQueryResult);
        } else { // AND
          finalResult = currentQueryResult;
        }
      } else {
        if (finalResult) {
          if (row.logic === "NOT") {
            finalResult = difference(finalResult, currentQueryResult);
          } else { // AND
            finalResult = intersect(finalResult, currentQueryResult);
          }
        }
      }
    }

    // 6. 根據最終結果更新視圖
    if (finalResult && Object.keys(finalResult).length > 0) {
      await hider.isolate(finalResult);
    } else {
      await hider.set(true); // 如果沒有結果，則顯示所有元素
      setNotification(t("no_elements_found"));
    }
  } finally {
    setIsSearching(false);
  }
}, [components, queryRows]);
```

---

### 2.3 碰撞檢測 (Collision Detection)

此功能用於檢測兩組元素之間是否存在幾何碰撞。它由 `CollisionDetector.tsx` 組件實現，核心依賴 `OBC.BoundingBoxer` 來獲取元素的包圍盒並進行比較。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    A[使用者打開碰撞檢測面板] --> B{選擇元素組 A 和 B};
    B --> B1[通過選擇 Category 或];
    B --> B2[通過高亮當前選擇];
    B --> C{點擊 "Detect Collisions" 按鈕};
    C --> D{`handleDetectCollision` 函式觸發};
    D --> E[檢查 A 組和 B 組是否為空];
    E -- 不為空 --> F{異步獲取 A 組所有元素的包圍盒};
    F --> G{`getItemsWithBoxes(groupA)`};
    G --> H[遍歷 A 組每個元素，逐一獲取 BoundingBox];
    H --> I{異步獲取 B 組所有元素的包圍盒 (如果 A!=B)};
    I --> J{`getItemsWithBoxes(groupB)`};
    J --> K[執行嵌套循環，比較 A 組和 B 組的包圍盒];
    K --> L{`itemA.box.intersectsBox(itemB.box)`};
    L -- 碰撞 --> M[將碰撞對添加到 `collisions` 列表];
    L -- 不碰撞 --> K;
    K -- 循環結束 --> N[更新 UI，顯示碰撞結果列表];
    N --> O[使用者點擊某個碰撞結果];
    O --> P{`handleCollisionClick` 函式};
    P --> Q[使用 `hider` 隔離碰撞的兩個元素];
    Q --> R[使用 `highlighter` 或 `fragments.highlight` 分別高亮這兩個元素];
    R --> S[移動相機以聚焦到碰撞位置];
```

#### 相關程式碼片段

**1. 執行碰撞檢測 (`CollisionDetector.tsx`)**

`handleDetectCollision` 是核心計算函式。它首先獲取兩組元素的包圍盒，然後執行一個 O(n*m) 的循環來比較它們。

```typescript
// components/IFCViewer/CollisionDetector.tsx

const handleDetectCollision = async () => {
  // ... (前置檢查)
  setIsLoading(true);

  // 1. 獲取 A 組元素的包圍盒
  setStatus(t("getting_boxes_a"));
  const itemsA = await getItemsWithBoxes(groupA);

  // 2. 獲取 B 組元素的包圍盒
  let itemsB = areGroupsEqual ? itemsA : await getItemsWithBoxes(groupB);
  
  // ... (處理獲取失敗的情況)

  // 3. 執行核心比較邏輯
  setStatus(t("comparing_items"));
  const collisions: { item1: ItemWithBox; item2: ItemWithBox }[] = [];
  
  if (areGroupsEqual) {
    // 組內比較
    for (let i = 0; i < itemsA.length; i++) {
      for (let j = i + 1; j < itemsA.length; j++) {
        if (itemsA[i].box.intersectsBox(itemsA[j].box)) {
          collisions.push({ item1: itemsA[i], item2: itemsA[j] });
        }
        // ... (進度更新和主線程讓出)
      }
    }
  } else {
    // 組間比較
    for (const item1 of itemsA) {
      for (const item2 of itemsB) {
        if (item1.box.intersectsBox(item2.box)) {
          // ... (避免重複和自我比較)
          collisions.push({ item1, item2 });
        }
        // ... (進度更新和主線程讓出)
      }
    }
  }
  
  // 4. 更新結果
  setResults(collisions);
  setIsLoading(false);
};
```

---

### 2.5 測量工具 (Measurement Tools)

此功能包括長度測量和面積測量，允許使用者在 3D 場景中進行測量。這些工具由 `ToolBar.tsx` 中的按鈕觸發，其狀態和邏輯在 `IFCViewerContainer.tsx` 中管理，核心依賴 `OBCF.LengthMeasurement` 和 `OBCF.AreaMeasurement`。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    A[使用者在 `ToolBar` 中點擊 "Length" 或 "Area" 按鈕] --> B{`onSelectTool` 函式觸發};
    B --> C{`handleLength` 或 `handleArea` 函式};
    C --> D[設置 `activeTool` 狀態];
    D --> E{`useEffect` hook (依賴 `activeTool`)};
    E --> F[停用所有其他工具];
    F --> G[啟用對應的測量工具 (`measurer.enabled = true`)];
    G --> H[禁用 `Highlighter` 以避免衝突];
    H --> I[使用者在 Viewer 中點擊以放置測量點];
    I --> J{`dblclick` 事件觸發};
    J --> K[調用 `measurer.create()` 完成一次測量];
    I --> L{`keydown` (Delete) 事件觸發};
    L --> M[調用 `measurer.delete()` 刪除上一個測量點或測量];
    B -- 再次點擊 --> N[取消激活工具，並調用 `measurer.list.clear()` 清除所有測量];
```

#### 相關程式碼片段

**1. 工具激活與狀態管理 (`IFCViewerContainer.tsx`)**

`useEffect` hook 監聽 `activeTool` 的變化，以啟用或停用相應的測量工具。

```typescript
// containers/IFCViewerContainer.tsx

// 在初始化 useEffect 中
const length = componentsRef.current.get(OBCF.LengthMeasurement);
length.world = worldRef.current;
length.enabled = false;
measurerRef.current = length;

const area = componentsRef.current.get(OBCF.AreaMeasurement);
area.world = worldRef.current;
area.enabled = false;
areaMeasurerRef.current = area;

// 監聽 activeTool 變化的 useEffect
useEffect(() => {
  if (!measurerRef.current || !areaMeasurerRef.current) return;

  // 預設停用所有工具
  measurerRef.current.enabled = false;
  areaMeasurerRef.current.enabled = false;
  // ...

  const highlighter = componentsRef.current?.get(OBCF.Highlighter);

  switch (activeTool) {
    case "length":
      measurerRef.current.enabled = true;
      if (highlighter) highlighter.enabled = false; // 禁用高亮
      break;
    case "area":
      areaMeasurerRef.current.enabled = true;
      if (highlighter) highlighter.enabled = false; // 禁用高亮
      break;
    // ... 其他工具
    default:
      if (highlighter) highlighter.enabled = true; // 恢復高亮
      break;
  }
}, [activeTool]);
```

**2. 事件處理 (`IFCViewerContainer.tsx`)**

通過 `dblclick` 和 `keydown` 事件來完成或刪除測量。

```typescript
// containers/IFCViewerContainer.tsx

useEffect(() => {
  // ...

  const handleDblClick = () => {
    if (activeTool === "length" && measurerRef.current?.enabled) {
      measurerRef.current.create(); // 完成當前長度測量
    } else if (activeTool === "area" && areaMeasurerRef.current?.enabled) {
      areaMeasurerRef.current.create(); // 完成當前面積測量的一個頂點
    }
    // ...
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (activeTool === "length" && measurerRef.current?.enabled) {
      if (e.code === "Delete" || e.code === "Backspace") {
        measurerRef.current.delete(); // 刪除上一個點或整個測量
      }
    }
    // ... 其他工具的按鍵處理
  };

  viewerRef.current?.addEventListener("dblclick", handleDblClick);
  window.addEventListener("keydown", handleKeyDown);

  return () => {
    viewerRef.current?.removeEventListener("dblclick", handleDblClick);
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [activeTool]); // 依賴 activeTool 以確保事件處理的上下文正確
```

**3. 工具欄 UI (`ToolBar.tsx`)**

`ToolBar` 是一個純 UI 組件，它接收當前激活的工具和回調函式來觸發狀態變更。

```typescript
// components/IFCViewer/ToolBar.tsx

// ...
<ToolBar
  // ...
  activeTool={activeTool}
  onSelectTool={(tool) => {
    if (tool === "length") handleLength();
    else if (tool === "area") handleArea();
    // ...
  }}
  // ...
/>
```

---

### 2.6 剖切工具 (Clipper)

此功能允許使用者在 3D 場景中創建剖切平面，以查看模型的內部結構。它由 `ToolBar.tsx` 中的按鈕觸發，邏輯在 `IFCViewerContainer.tsx` 中管理，核心依賴 `OBC.Clipper`。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    A[使用者在 `ToolBar` 中點擊 "Clipper" 按鈕] --> B{`onSelectTool` 函式觸發};
    B --> C{`handleClipper` 函式};
    C --> D[設置 `activeTool` 狀態為 "clipper"];
    D --> E{`useEffect` hook (依賴 `activeTool`)};
    E --> F[停用所有其他工具];
    F --> G[啟用 `Clipper` (`clipper.enabled = true`)];
    G --> H[禁用 `Highlighter` 以避免衝突];
    H --> I[使用者在 Viewer 中 `dblclick`];
    I --> J{`handleDblClick` 函式};
    J --> K[調用 `clipper.create()` 在點擊位置創建一個剖切面];
    I --> L{`keydown` (Delete) 事件觸發};
    L --> M[調用 `clipper.delete()` 刪除選中的剖切面];
    B -- 再次點擊 --> N[取消激活工具，並調用 `clipper.list.clear()` 清除所有剖切面];
```

#### 相關程式碼片段

**1. 工具激活與狀態管理 (`IFCViewerContainer.tsx`)**

與測量工具類似，`useEffect` hook 監聽 `activeTool` 的變化來管理 `Clipper` 的啟用狀態。

```typescript
// containers/IFCViewerContainer.tsx

// 在初始化 useEffect 中
const clipper = components.get(OBC.Clipper);
clipper.enabled = false;
clipperRef.current = clipper;

// 監聽 activeTool 變化的 useEffect
useEffect(() => {
  // ... (停用其他工具)

  switch (activeTool) {
    case "clipper":
      clipperRef.current.enabled = true;
      if (highlighter) highlighter.enabled = false;
      break;
    // ... 其他工具
  }
}, [activeTool]);
```

**2. 事件處理 (`IFCViewerContainer.tsx`)**

通過 `dblclick` 創建剖切面，通過 `keydown` (Delete) 刪除剖切面。

```typescript
// containers/IFCViewerContainer.tsx

useEffect(() => {
  // ...

  const handleDblClick = () => {
    if (activeTool === "clipper" && clipperRef.current?.enabled) {
      clipperRef.current.create(worldRef.current); // 創建剖切面
    }
    // ...
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (activeTool === "clipper" && clipperRef.current?.enabled) {
      if (e.code === "Delete" || e.code === "Backspace") {
        clipperRef.current.delete(worldRef.current); // 刪除剖切面
      }
    }
    // ...
  };

  viewerRef.current?.addEventListener("dblclick", handleDblClick);
  window.addEventListener("keydown", handleKeyDown);

  return () => {
    viewerRef.current?.removeEventListener("dblclick", handleDblClick);
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [activeTool]);
```

**3. 工具欄 UI (`ToolBar.tsx`)**

`ToolBar` 中的按鈕用於觸發 `handleClipper` 函式，該函式會切換 `activeTool` 的狀態。

```typescript
// containers/IFCViewerContainer.tsx

const handleClipper = () => {
  if (!clipperRef.current) return;
  const isActive = activeTool === "clipper";
  setActiveTool(isActive ? null : "clipper");
  
  // 如果是取消激活，則清除所有剖切面
  if (isActive) {
    clipperRef.current.list.clear();
  }
};
```

---

### 2.7 元素屬性面板 (InfoPanel)

此功能在使用者點擊模型中的元素時，顯示該元素的詳細屬性。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    A[使用者點擊 Viewer 中的元素] --> B{`handleClick` 事件觸發};
    B --> C{Raycasting 檢測};
    C -- 未擊中 --> D[關閉 InfoPanel];
    C -- 擊中元素 --> E{設置 `infoLoading` 為 true};
    E --> F[異步獲取元素屬性];
    F --> F1[`model.getItemsData()` 獲取 Attributes];
    F --> F2[`getItemPsets()` 獲取 Property Sets];
    F2 --> G[格式化 Psets 數據];
    G --> H[更新 React 狀態];
    H --> H1[   - `setInfoOpen(true)`];
    H --> H2[   - `setSelectedModelId(...)`];
    H --> H3[   - `setSelectedLocalId(...)`];
    H --> H4[   - `setSelectedAttrs(...)`];
    H --> H5[   - `setSelectedPsets(...)`];
    H --> I{`InfoPanel.tsx` 接收新 props 並渲染};
    I --> J[設置 `infoLoading` 為 false];
```

#### 相關程式碼片段

**1. 點擊事件與數據獲取 (`IFCViewerContainer.tsx`)**

```typescript
// containers/IFCViewerContainer.tsx

const handleClick = async (event: MouseEvent) => {
  // ... (Raycasting 邏輯以獲取 hit)

  if (!hit) {
    setInfoOpen(false); // 如果未擊中，關閉面板
    // ... (清空狀態)
    return;
  }

  const model = fragmentsRef.current.list.get(hit.modelId);
  if (!model) return;

  try {
    setInfoLoading(true);
    setInfoOpen(true);
    setSelectedModelId(hit.modelId);
    setSelectedLocalId(hit.localId);

    // 異步獲取屬性
    const [attrs] = await model.getItemsData([hit.localId], {
      attributesDefault: true,
    });
    setSelectedAttrs(attrs ?? null);

    // 異步獲取屬性集
    const psetsRaw = await getItemPsets(model, hit.localId);
    setSelectedPsets(formatItemPsets(psetsRaw));

  } finally {
    setInfoLoading(false);
  }
};
```

**2. 屬性集獲取與格式化 (`IFCViewerContainer.tsx`)**

`getItemPsets` 是一個自定義的輔助函式，用於查詢與元素關聯的屬性集。

```typescript
// containers/IFCViewerContainer.tsx

const getItemPsets = async (model: any, localId: number) => {
  const [data] = await model.getItemsData([localId], {
    attributesDefault: false,
    attributes: ["Name", "NominalValue"],
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
    },
  });
  return (data?.IsDefinedBy as FRAGS.ItemData[]) ?? [];
};

const formatItemPsets = (raw: FRAGS.ItemData[]) => {
  const result: PsetDict = {};
  for (const pset of raw) {
    const { Name: psetName, HasProperties } = pset as any;
    if (!(psetName && "value" in psetName && Array.isArray(HasProperties))) continue;
    const props: Record<string, any> = {};
    for (const prop of HasProperties) {
      const { Name, NominalValue } = prop || {};
      if (!(Name && "value" in Name && NominalValue && "value" in NominalValue)) continue;
      props[Name.value] = NominalValue.value;
    }
    result[psetName.value] = props;
  }
  return result;
};
```

**3. UI 展示 (`InfoPanel.tsx`)**

`InfoPanel.tsx` 是一個純展示組件，它接收處理好的屬性數據並將其渲染出來。

```typescript
// components/IFCViewer/InfoPanel.tsx

export default function IFCInfoPanel({ darkMode, infoLoading, attrs, psets, onClose }: IFCInfoPanelProps) {
  // ...
  return (
    // ... (渲染佈局)
    {infoLoading ? (
      <div className="text-sm opacity-70">Loading…</div>
    ) : (
      <>
        <h4 className="font-semibold mb-1">Attributes</h4>
        {attrs ? (
          // ... (遍歷並渲染 attrs)
        ) : (
          <div className="text-sm opacity-60 mb-4">No attributes.</div>
        )}

        <h4 className="font-semibold mb-1">Property Sets</h4>
        {psets && Object.keys(psets).length > 0 ? (
          // ... (遍歷並渲染 psets)
        ) : (
          <div className="text-sm opacity-60">No property sets.</div>
        )}
      </>
    )}
    // ...
  );
}
```

---

### 2.10 相機與導航控制 (Camera & Navigation)

此功能提供 UI 來切換相機的投影模式、導航模式以及快速定向到標準視圖。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    subgraph 相機控制 (CameraControls.tsx)
        A[使用者點擊 "Perspective" / "Orthographic"] --> B{觸發 `setProjection`};
        B --> C[在 `IFCViewerContainer` 中調用 `world.camera.projection.set(...)`];
        D[使用者點擊 "Orbit" / "First Person" / "Plan"] --> E{觸發 `setNavigation`};
        E --> F[在 `IFCViewerContainer` 中調用 `world.camera.set(...)`];
    end

    subgraph 視圖定向 (ViewOrientation.tsx)
        G[使用者點擊 "Top" / "Front" / "Left" 等按鈕] --> H{觸發 `viewOrientation.set(...)`};
        H --> I[相機平滑過渡到選定的標準視圖];
    end
```

#### 相關程式碼片段

**1. 相機控制 (`CameraControls.tsx`)**

這是一個純 UI 組件，直接調用從 `IFCViewerContainer` 傳入的 `worldRef` 上的相機方法。

```typescript
// components/IFCViewer/CameraControls.tsx

export default function CameraControls({
  projection,
  setProjection,
  navigation,
  setNavigation,
  worldRef,
}) {
  return (
    // ...
    <button
      onClick={() => {
        worldRef.current?.camera.projection.set("Perspective");
        setProjection("Perspective");
      }}
      // ...
    >
      Perspective
    </button>
    <button
      onClick={() => {
        worldRef.current?.camera.set("Orbit");
        setNavigation("Orbit");
      }}
      // ...
    >
      Orbit
    </button>
    // ...
  );
}
```

**2. 視圖定向 (`ViewOrientation.tsx`)**

這個組件在初始化時創建一個 `OBC.ViewOrientation` 實例，並將其按鈕與對應的方法綁定。

```typescript
// components/IFCViewer/ViewOrientation.tsx

export default function ViewOrientation({ components, world, fragments }) {
  const [viewOrientation, setViewOrientation] = useState<OBC.ViewOrientation | null>(null);

  useEffect(() => {
    if (components && world && fragments) {
      const orientation = new OBC.ViewOrientation(components, world, fragments);
      setViewOrientation(orientation);
    }
  }, [components, world, fragments]);

  return (
    <div>
      <button onClick={() => viewOrientation?.set("top")}>Top</button>
      <button onClick={() => viewOrientation?.set("front")}>Front</button>
      {/* ... 其他視圖按鈕 */}
    </div>
  );
}
```

---

### 2.9 視點管理 (Viewpoints)

此功能允許使用者創建、保存、加載和刪除相機視點，以便快速返回到特定的視圖。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    subgraph 創建視點
        A[使用者點擊 "Create Viewpoint"] --> B{`handleAddViewpoint` 觸發};
        B --> C[調用 props 傳入的 `createViewpoint`];
        C --> D[在 `IFCViewerContainer` 中執行];
        D --> E[調用 `viewpoints.create()`];
        E --> F[調用 `vp.takeSnapshot()` 獲取快照];
        F --> G[將新視點對象添加到 `storedViews` 狀態];
        G --> H[`Viewpoints.tsx` 接收新 props 並更新列表];
    end

    subgraph 應用視點
        I[使用者點擊列表中的某個視點] --> J{`selectViewpoint` 觸發};
        J --> K[調用 `view.viewpoint.go()`];
        K --> L[相機平滑過渡到視點位置];
    end
```

#### 相關程式碼片段

**1. 創建視點的邏輯 (`IFCViewerContainer.tsx`)**

創建視點的核心邏輯位於父組件，以確保狀態的統一管理。

```typescript
// containers/IFCViewerContainer.tsx

const createViewpoint = async (): Promise<OBC.Viewpoint | null> => {
  if (!viewpointsRef.current) return null;

  // 1. 創建視點對象
  const vp = viewpointsRef.current.create();
  if (!vp) return null;

  vp.title = `Viewpoint ${storedViews.length + 1}`;
  await vp.updateCamera(); // 捕獲當前相機狀態

  // 2. 獲取快照
  const snapshotData = getViewpointSnapshotData(vp) || "";

  // 3. 更新狀態
  setStoredViews((prev) => [
    ...prev,
    {
      id: vp.guid,
      title: vp.title || `Viewpoint ${prev.length + 1}`,
      viewpoint: vp,
      snapshot: snapshotData,
    },
  ]);

  setCurrentViewpoint(vp); // 注意：此處的 currentViewpoint 應為 currentViewId
  return vp;
};
```

**2. UI 與事件觸發 (`Viewpoints.tsx`)**

`Viewpoints.tsx` 組件負責觸發創建和應用視點的動作。

```typescript
// components/IFCViewer/Viewpoints.tsx

export default function Viewpoints({
  createViewpoint,
  setWorldCamera,
  storedViews,
  // ... other props
}) {
  // ...

  const handleAddViewpoint = async () => {
    // 直接調用父組件傳入的函式
    await createViewpoint();
  };

  const selectViewpoint = (view: StoredViewpoint) => {
    // setCurrentView(view); // 應由父組件管理
    view.viewpoint.go(); // 觸發相機移動
  };

  return (
    <div>
      <button onClick={handleAddViewpoint}>
        Create Viewpoint
      </button>
      
      {/* ... */}

      <div>
        {storedViews.map(view => (
          <div key={view.id} onClick={() => selectViewpoint(view)}>
            {/* ... 渲染視點列表 */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 2.8 模型管理器 (ModelManager)

此功能提供一個側邊欄 UI，用於上傳、下載和刪除模型。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    subgraph 上傳模型
        A[使用者點擊 "Upload IFC/Fragment"] --> B{觸發隱藏的 `<input type="file">`};
        B --> C{`onChange` 事件觸發};
        C --> D[調用 props 傳入的 `IfcUpload` / `handleFragmentUpload`];
        D --> E[在 `IFCViewerContainer` 中執行模型加載邏輯];
        E --> F[更新 `uploadedModels` 狀態];
        F --> G[`ModelManager` 接收新 props 並更新列表];
    end

    subgraph 刪除模型
        H[使用者點擊某個模型的 "Delete" 按鈕] --> I{觸發 `deleteSelectedModel`};
        I --> J[在 `IFCViewerContainer` 中執行];
        J --> K[調用 `fragments.core.disposeModel(model.id)`];
        K --> L[從 `uploadedModels` 狀態中過濾掉該模型];
        L --> M[`ModelManager` 接收新 props 並更新列表];
    end
```

#### 相關程式碼片段

**1. 邏輯傳遞 (`IFCViewerContainer.tsx`)**

所有模型操作的邏輯都定義在父組件 `IFCViewerContainer` 中，並通過 props 傳遞給 `ModelManager`。

```typescript
// containers/IFCViewerContainer.tsx

const deleteSelectedModel = (model: UploadedModel) => {
  if (!fragmentsRef.current) return;
  fragmentsRef.current.core.disposeModel(model.id);
  setUploadedModels((prev) => prev.filter((m) => m.id !== model.id));
  // ... (清空相關狀態)
};

// ...

return (
  // ...
  <ModelManager
    // ...
    IfcUpload={IfcUpload}
    handleFragmentUpload={handleFragmentUpload}
    deleteAllModels={deleteAllModels}
    deleteSelectedModel={deleteSelectedModel}
  />
  // ...
);
```

**2. UI 與事件觸發 (`ModelManager.tsx`)**

`ModelManager` 是一個純 UI 組件，它只負責渲染列表和按鈕，並在用戶交互時調用從 props 接收的函式。

```typescript
// components/IFCViewer/ModelManager.tsx

export default function ModelManager({ 
  IfcUpload, 
  handleFragmentUpload, 
  deleteSelectedModel,
  uploadedModels,
  // ... other props
}) {
  return (
    // ...
    <label>
      Upload IFC File
      <input type="file" accept=".ifc" onChange={IfcUpload} className="hidden" />
    </label>
    // ...
    <ul>
      {uploadedModels.map((model) => (
        <li key={model.id}>
          <span>{model.name}</span>
          <button onClick={() => deleteSelectedModel(model)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
    // ...
  );
}
```

**2. 獲取包圍盒 (`CollisionDetector.tsx`)**

`getItemsWithBoxes` 函式負責為一組中的每個元素計算其包圍盒。
**注意：** 當前的實現是逐一獲取，效能較低，這在 `ifc-viewer-troubleshooting.md` 中有詳細說明。

```typescript
// components/IFCViewer/CollisionDetector.tsx

const getItemsWithBoxes = async (group: Group): Promise<ItemWithBox[]> => {
  const boxer = boxerRef.current;
  if (!boxer) return [];

  const itemsWithBoxes: ItemWithBox[] = [];
  // ... (將 group 轉換為平坦的陣列)

  // 遍歷每個元素以獲取其包圍盒
  for (let i = 0; i < groupItems.length; i++) {
    const { modelId, itemId } = groupItems[i];
    try {
      const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set([parseInt(itemId, 10)]) };
      
      // 每次都清理、添加、獲取，效能瓶頸所在
      boxer.list.clear();
      await boxer.addFromModelIdMap(modelIdMap);
      const box = boxer.get();
      boxer.list.clear();

      if (box && !box.isEmpty()) {
        itemsWithBoxes.push({ modelId, itemId, box });
      }
    } catch (error) {
      // ...
    }
    // ... (進度更新)
  }
  return itemsWithBoxes;
};
```

---

### 2.4 BCF 議題管理 (BCF Topics Management)

此功能允許使用者創建、查看、編輯和導出 BCF (BIM Collaboration Format) 議題，用於協作和問題追蹤。它由 `BCFTopics.tsx` 組件實現，核心依賴 `OBC.BCFTopics`。

#### 流程圖 (Flowchart)

```mermaid
graph TD
    subgraph 創建議題
        A[使用者選擇元素] --> B{點擊 "Create" 按鈕};
        B --> C{`createTopic` 函式};
        C --> D[獲取高亮元素的 GUIDs];
        D --> E[打開 "New Topic" 模態框];
        E --> F{使用者填寫表單並提交};
        F --> G{`handleCreateTopic` 函式};
        G --> H[調用 `bcfTopics.create()` 創建 Topic];
        H --> I[創建 `Viewpoint` 並關聯元素 GUIDs];
        I --> J[將 `Viewpoint` GUID 添加到 Topic];
        J --> K[更新 UI 議題列表];
    end

    subgraph 查看議題
        L[使用者點擊議題列表中的某個 Topic] --> M{`onTopicClick` 函式};
        M --> N[獲取 Topic 關聯的第一個 Viewpoint];
        N --> O{調用 `viewpoint.go()`};
        O --> P[相機移動到視點位置];
        P --> Q[高亮視點中包含的元素];
    end

    subgraph 編輯與評論
        R[使用者點擊 "Edit" 或 "Add Comment"] --> S{打開對應的模態框或表單};
        S --> T[使用者提交更改];
        T --> U{`handleEditTopic` 或 `handleAddComment`};
        U --> V[直接修改 `selectedTopic` 對象的屬性];
        V --> W[手動觸發議題列表的重新渲染];
    end
```

#### 相關程式碼片段

**1. 創建 BCF 議題 (`BCFTopics.tsx`)**

創建議題時，會捕獲當前的相機視點和選中的元素。

```typescript
// components/IFCViewer/BCFTopics.tsx

const createTopic = async (e: React.MouseEvent) => {
  e.stopPropagation();
  const highlighter = components.get(OBCF.Highlighter);
  const currentSelection = structuredClone(highlighter.selection.select);

  if (Object.keys(currentSelection).length === 0) {
    alert(t("select_element_before_creating_topic"));
    return;
  }

  // 1. 將選中元素的 ModelIdMap 轉換為 GUIDs
  const fragments = components.get(OBC.FragmentsManager);
  const guids = await fragments.modelIdMapToGuids(currentSelection);
  const guidsSet = new Set([...guids]);

  // 2. 存儲 GUIDs 並打開創建模態框
  setSelectionForTopic(guidsSet);
  setCreateModalOpen(true);
};

const handleCreateTopic = async (formData: any) => {
  if (!bcfTopics || !selectionForTopic) return;

  // 3. 創建 Topic 核心數據
  const topic = bcfTopics.create({
    title: formData.title,
    // ... 其他屬性
  });

  // 4. 創建視點 (Viewpoint)
  const viewpoints = components.get(OBC.Viewpoints);
  const vp = viewpoints.create();
  if (vp) {
    vp.world = world;
    await vp.updateCamera(); // 捕獲當前相機狀態
    
    // 5. 將元素的 GUIDs 關聯到視點
    vp.selectionComponents.add(...selectionForTopic);
    
    // 6. 將視點關聯到 Topic
    topic.viewpoints.add(vp.guid);
  }

  setCreateModalOpen(false);
};
```

**2. 查看 BCF 議題 (`IFCViewerContainer.tsx`)**

當使用者點擊一個 BCF 議題時，`goToTopicViewpoint` 函式會被觸發，以還原議題關聯的視點。

```typescript
// containers/IFCViewerContainer.tsx

const goToTopicViewpoint = async (topic: OBC.Topic) => {
  if (!componentsRef.current || !topic.viewpoints.size) return;

  const viewpoints = componentsRef.current.get(OBC.Viewpoints);
  const highlighter = componentsRef.current.get(OBCF.Highlighter);
  const fragments = componentsRef.current.get(OBC.FragmentsManager);

  // 1. 獲取 Topic 關聯的第一個視點 GUID
  const firstViewpointGuid = topic.viewpoints.values().next().value;
  if (!firstViewpointGuid) return;

  const viewpoint = viewpoints.list.get(firstViewpointGuid);
  if (viewpoint) {
    // 2. 還原相機位置
    await viewpoint.go();
    await highlighter.clear();

    // 3. 如果視點包含元素選擇，則高亮它們
    if (viewpoint.selectionComponents.size > 0) {
      const guidArray = Array.from(viewpoint.selectionComponents);
      
      // 4. 將 GUIDs 轉換回 ModelIdMap 以便高亮
      const selection = await fragments.guidsToModelIdMap(guidArray);
      
      highlighter.selection.select = selection;
      await highlighter.highlight("select");
    }
  }
};
```
