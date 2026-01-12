# Ifc Viewer 疑難解決

## 🗂️ MetaData

- **📄 類型**：技術筆記, 疑難解決
- **📅 日期**：2025-09-17
- **🏷️ 標籤**：Ifc.js, OpenBIM, Fragments, Three.js, Next.js
- **🆚 版本**：v1.0
---

## 📑 目錄

[TOC]

> 這些筆記整理了在開發 Ifc Viewer 過程中遇到的常見問題與解決方案。我已檢視過您提供的邏輯，整體上都是正確且實用的，反映了處理 IFC.js / OpenBIM Components (OBC) 時的標準實踐。以下將您提供的內容整理成文件，並在適當時機加入一些補充說明以增強清晰度。

---
## ifc loader setup問題

當出現以下 error
```
IFCViewer.tsx:138 Failed to load IFC via IfcLoader: TypeError: callbacks.shift(...) is not a function
```
或

```
Failed to load IFC via IfcLoader: BindingError: _emval_take_value has unknown type N3glm3vecILi4EdLNS_9qualifierE0EEE
```
這很有可能是 `ifcLoader.setup` 的 WASM 路徑問題。

**說明**：IFC.js 核心功能依賴 WebAssembly (WASM) 檔案。如果 Viewer 找不到或無法載入正確版本的 WASM 檔案，就會導致底層模組初始化失敗，出現這類錯誤。

#### 遠端路徑 (CDN)
```javascript
await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: "https://unpkg.com/web-ifc@0.0.70/", // 這個 URL 可能會因版本更新而失效
      absolute: true,
    },
  });
```
**注意**：`unpkg` 上的路徑和版本會變動，建議鎖定在一個可用的版本，或在更新 library 時同步檢查此路徑。

#### 本地路徑
如果將 WASM 檔案放在專案中（例如 `public` 資料夾），可以這樣設定：
```javascript
await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: "/wasm/", // 假設 WASM 檔案放在 /public/wasm/
      absolute: false, // 使用相對路徑
    },
  });
```
*註：在 Next.js 或類似框架中，`public` 資料夾下的內容會被當作根目錄 (`/`) 來提供。*

---


## camera 模型更新問題
如果在拖曳 / 滾輪縮放時，發現模型沒有即時更新，可能是 `camera.controls` 沒有持續告訴 `fragment model` `camera` 已更新。
###  背後機制
*   `fragModel.useCamera(camera)` 會讓 model 跟相機「綁定」，它會根據相機的矩陣去更新裁剪、投影等。
*   當你只是透過程式碼呼叫 `camera.controls.setLookAt(...)` 或旋轉畫面，而沒有手動觸發渲染，`fragModel` 內部不會馬上重繪，必須等到下一個 canvas 互動（如點擊、拖曳）才被驅動。

####  為什麼點 canvas 就會更新？

因為點擊或拖曳 canvas 會觸發 `controls` 內部的 `"update"` 或 `"change"` 事件，進而驅動 `world` 重新渲染，此時 `fragModel` 的相機綁定才會生效並更新畫面。但程式碼主動呼叫 `setLookAt` 或更改 `aspect` 比較像「靜態更新」，如果沒有主動通知 `fragments`，它就會等待下一次事件才刷新。

### ✅ 解法

監聽 camera controls 的 `update` 事件，每當相機更新就強制刷新 `fragments`：

```javascript
camera.controls.addEventListener("update", () => {
  // 強制 fragments 核心進行更新
  fragments.core.update(true);
});
```
這樣可以確保無論是使用者互動還是程式碼驅動的相機變化，模型都能即時更新。

---
## Heroui component無法顯示

這個問題通常與組件的依賴或樣式導入不完整有關。

**解決方向**：直接參考官方文件，將其提供的 Template 完整轉移並整合到專案中。

1.  **檢查相依性**：確保所有需要的 `npm` 套件都已安裝。
2.  **樣式導入**：Heroui 可能依賴特定的 CSS 檔案或 Tailwind CSS 配置，需確保這些都已正確設定。
3.  **檔案結構**：按照 Template 的結構來組織你的 Component 檔案。

[參考資料](https://www.heroui.com/docs/guide/introduction)

---
## IfcLoader 跟 FragmentsManager 的區別

這兩者是用於處理不同類型檔案的核心組件。

### ✅ 上傳 IFC 檔案：使用 IfcLoader
當你需要載入 `.ifc` 格式的檔案時，`IfcLoader` 會負責解析檔案，並將其轉換為 `fragments` 格式。

✨ **Using The IfcLoader Component**

1.  **取得 `IfcLoader` 並設定 WASM**
    ```javascript
    const ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: {
        path: "https://unpkg.com/web-ifc@0.0.69/",
        absolute: true,
      },
    });
    ```

2.  **初始化 `FragmentsManager`**
    當 IFC 檔案轉換為 Fragments 時，`FragmentsManager` 會接手處理。因此，在載入 IFC 前必須先配置好它：
    ```javascript
    const fragments = components.get(OBC.FragmentsManager);
    
    // 設定 worker 以在背景執行密集運算，避免 UI 卡頓
    const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const fetchedUrl = await fetch(githubUrl);
    const workerBlob = await fetchedUrl.blob();
    const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
    const workerUrl = URL.createObjectURL(workerFile);
    fragments.init(workerUrl);

    // 當 Fragments 模型載入後，將其與世界相機綁定並加入場景
    fragments.list.onItemSet.add((model) => {
      world.scene.three.add(model);
    });
    ```

3.  **建立載入函式**
    ```javascript
    const loadIfc = async (file: File) => {
      const data = await file.arrayBuffer();
      const buffer = new Uint8Array(data);
      // `load` 函式會觸發轉換與 `onItemSet` 事件
      await ifcLoader.load(buffer, "example-model");
    };
    ```

[參考資料](https://docs.thatopen.com/Tutorials/Components/Core/IfcLoader)

### ✅ 直接載入 Fragments：使用 FragmentsManager
如果你已經有 `.frag` 和 `.json` 格式的 `fragments` 檔案，可以直接使用 `FragmentsManager` 載入，這樣可以跳過 IFC 解析的步驟，速度更快。

📂 **Loading Fragments Models**

```javascript
const loadFragments = async () => {
  const fragments = components.get(OBC.FragmentsManager);
  
  // 可以提供多個檔案路徑
  const fragPaths = [
    "https://thatopen.github.io/engine_components/resources/frags/school_arq.frag",
    "https://thatopen.github.io/engine_components/resources/frags/school_str.frag",
  ];

  // 同時載入多個模型以提升效率
  await Promise.all(
    fragPaths.map(async (path) => {
      const file = await fetch(path);
      const buffer = await file.arrayBuffer();
      // 這是直接載入 fragments 的主要函式
      return fragments.load(buffer);
    }),
  );
};
```

[參考資料](https://docs.thatopen.com/Tutorials/Components/Core/FragmentsManager)

***! 提醒：不要直接操作 `FragmentsModel` !***
`FragmentsModel` 是底層的資料結構。為了確保穩定性與效能，應優先使用 `IfcLoader` 或 `FragmentsManager` 這些高階 API 來管理模型，而不是手動建立或操作 `FragmentsModel` 實例。

---
## 檔案上傳後無法再次上傳同一檔案

**問題**：在 HTML 的 `<input type="file">` 中，如果使用者第一次上傳某個檔案後，不選擇其他檔案，而是再次選擇同一個檔案，`onChange` 事件不會觸發。

**原因**：這是瀏覽器的標準行為。只有當 `input.value` 發生改變時，`onChange` 事件才會被觸發。

**✅ 解法**：在 `onChange` 事件處理函式的最後，手動清空 `input` 的值。

```javascript
function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (file) {
    // ... 執行你的上傳邏輯 ...
    console.log("Uploading file:", file.name);
  }

  // 清空 input 的值，這樣下次選擇同一個檔案時 onChange 才會觸發
  event.target.value = "";
}
```

---
## Hider (隱藏器) 的邏輯

`Hider` 組件用於控制模型元素的可見性，以下是幾個常用方法的邏輯區別：

#### `hider.isolate(selection)`
- **作用**：隔離顯示。只顯示 `selection` 中包含的元素，其餘所有元素都會被隱藏。
- **範例**：`await hider.isolate(finalResult);`
- **結果**：畫面上只會看到 `finalResult` 中的物體。

#### `hider.set(visible, selection)`
- **作用**：設定指定元素的可見性。
- **參數**：
    - `visible` (boolean): `true` 為顯示，`false` 為隱藏。
    - `selection` (FragmentIdMap): 要操作的元素集合。
- **範例**：`await hider.set(false, finalResult);`
- **結果**：`finalResult` 中的物體會被隱藏，而場景中其他物體不受影響（與 `isolate` 相反）。

#### 搭配 `Highlighter`
為了讓使用者清楚看到操作的對象，通常會搭配 `Highlighter` 使用。

- **範例**：`await highlighter.highlightByID("select", finalResult);`
- **作用**：用名為 `"select"` 的樣式來高亮 `finalResult` 中的所有元素。

**總結**：
- `isolate` 是「只看這些」。
- `set(false, ...)` 是「不要看這些」。
- `highlight` 是「標示這些」。

---
## 程式碼邏輯潛在問題分析

以下是從專案 `IFCViewer.tsx` 中發現的一些潛在邏輯問題或可優化之處。

### ⚠️ IFC 加載後的手動模型操作

**問題**：在 `IfcUpload` 函式中，`ifcLoader.load` 完成後，程式碼手動將返回的 `fragModel` 加入場景並綁定相機。

```typescript
// IFCViewer.tsx
const fragModel = await ifcLoaderRef.current.load(uint8Array, ...);

// ...手動操作
worldRef.current.scene.three.add(fragModel.object);
fragmentsRef.current.core.update(true);
fragModel.useCamera(worldRef.current.camera.three);
```

**潛在風險**：這段程式碼是多餘的。在 `useEffect` 初始化時，已經設定了 `fragments.list.onItemSet` 事件監聽器，它的作用就是在任何 `Fragments` 模型（包括由 IFC 轉換而來的）被創建時，自動將其加入場景並綁定相機。

```typescript
// IFCViewer.tsx - useEffect
fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});
```

**正確邏輯**：`ifcLoader.load` 在內部會觸發 `onItemSet` 事件。因此，手動添加模型會導致重複操作，雖然在當前情況下可能不會引發嚴重錯誤，但在複雜場景下可能導致非預期的行為或效能問題。應移除 `IfcUpload` 中手動添加模型的程式碼，完全依賴 `onItemSet` 事件處理。

### ⚠️ 效率較低的 Raycasting (光線投射) 方式

**問題**：在 `handleClick` 事件中，為了檢測點擊到的物體，程式碼遍歷了 `fragmentsRef.current.list` 中的所有模型，並對每個模型單獨執行 `raycast`。

```typescript
// IFCViewer.tsx - handleClick
let hit: { modelId: string; localId: number } | null = null;
for (const [id, model] of fragmentsRef.current.list) {
  const result = await model.raycast(...);
  if (result) {
    hit = { modelId: id, localId: result.localId };
    break; // 找到第一個就停止
  }
}
```

**潛在風險**：當場景中模型數量增加時，這種遍歷方式的效能會下降。`OBC` (OpenBIM Components) 提供了一個更高效的全局 `Raycaster`。

**✅ 建議作法**：使用 `components.get(OBC.Raycaster)`。這個組件經過優化，可以一次性對世界中的所有 `Fragment` 模型進行光線投射，效能更好。

```typescript
// 建議的寫法
const raycaster = components.get(OBC.Raycaster);
const result = await raycaster.cast(world);

if (result) {
  // result.object, result.point, result.face, etc.
  // 從 result 中取得 model 和 element ID
}
```

### ⚠️ 潛在的內存洩漏 (Memory Leak)

**問題**：在 `useEffect` 中，為 `camera.controls` 添加了 `"update"` 事件的監聽器，但在組件卸載時的 cleanup 函式中沒有將其移除。

```typescript
// IFCViewer.tsx - useEffect
camera.controls.addEventListener("update", () => {
  fragments.core.update(true);
});

// cleanup 函式
return () => {
  viewerRef.current?.removeEventListener("click", handleClick);
  window.removeEventListener("resize", handleResize);
  components.dispose(); // dispose 會處理大部分，但顯式移除更安全
};
```

**潛在風險**：如果 `IFCViewer` 組件在應用程式生命週期中被多次掛載和卸載，舊的 `"update"` 事件監聽器將不會被清除，導致內存洩漏，並可能觸發不必要的 `update` 呼叫，影響效能。

**✅ 建議作法**：在 cleanup 函式中明確地移除事件監聽器。

```typescript
const onUpdate = () => fragments.core.update(true);
camera.controls.addEventListener("update", onUpdate);

return () => {
  // ... 其他 cleanup
  camera.controls.removeEventListener("update", onUpdate);
  components.dispose();
};
```

### ⚠️ 模擬的進度條與真實進度

**問題**：`IfcUpload` 和 `handleFragmentUpload` 中的進度條是使用 `setInterval` 模擬的，並非反映真實的載入進度。

```typescript
// IFCViewer.tsx - IfcUpload
let simulatedProgress = 0;
const progressInterval = setInterval(() => {
  simulatedProgress += Math.random() * 5;
  // ...
  setProgress(Math.floor(simulatedProgress));
}, 180);
```

**潛在風險**：對於大型模型，模擬進度條可能會在載入完成前就達到 98%，或者在載入很快時顯得卡頓，使用者體驗不佳。

**✅ 建議作法**：`ifcLoader.load` 函式支援 `onprogress` 回調，可以取得真實的載入進度。

```typescript
// 建議的寫法
await ifcLoaderRef.current.load(uint8Array, false, modelId, {
  onprogress: (event) => {
    const progress = Math.round((event.loaded / event.total) * 100);
    setProgress(progress);
  },
});
```
這樣可以提供更準-確、更流暢的使用者體驗。

### ⚠️ 複雜的 `useEffect` 依賴與副作用管理

**問題**：在 `IFCViewerContainer.tsx` 中，存在多個 `useEffect` hook，它們的依賴項和副作用處理可以進一步優化。例如，管理工具狀態的 `useEffect` 依賴於 `[activeTool]`，並在每次 `activeTool` 變更時，停用所有工具再啟用當前工具。

```typescript
// IFCViewerContainer.tsx
useEffect(() => {
    if (!measurerRef.current || !areaMeasurerRef.current || !clipperRef.current || !colorizeRef.current) return;

    clipperRef.current.enabled = false;
    measurerRef.current.enabled = false;
    // ...
    
    switch (activeTool) {
      case "length":
        measurerRef.current.enabled = true;
        break;
      // ...
    }
}, [activeTool]);
```

**潛在風險**：
1.  **不必要的重複執行**：當 `useEffect` 的依賴項過於寬泛或管理不當時，可能導致 hook 在每次渲染時都重新執行，影響效能。
2.  **副作用清理不完整**：在 `useEffect` 中註冊的事件監聽器（如 `dblclick`, `keydown`）如果沒有在 cleanup 函式中被正確移除，會導致內存洩漏和非預期的行為，特別是當組件重新渲染時。
3.  **狀態管理混亂**：將所有工具的啟用/停用邏輯放在一個 `useEffect` 中，隨著工具增加，會變得越來越難以維護。

**✅ 建議作法**：
1.  **單一職責原則**：為每個工具或相關聯的一組功能建立獨立的 `useEffect`，並精確管理其依賴項。
2.  **精簡依賴項**：只將真正需要觸發 effect 的變數放入依賴陣列。
3.  **徹底清理副作用**：確保每個 `useEffect` 的 cleanup 函式都能移除所有註冊的事件監聽器或其他副作用。

```typescript
// 建議的重構思路
useEffect(() => {
  const clipper = clipperRef.current;
  if (clipper) {
    clipper.enabled = activeTool === 'clipper';
  }
}, [activeTool]);

useEffect(() => {
  const handleDblClick = (e) => { /* ... */ };
  window.addEventListener('dblclick', handleDblClick);
  return () => window.removeEventListener('dblclick', handleDblClick);
}, [activeTool]); // 依賴項應更精確
```

### ⚠️ `onIsolate` 的實現方式可以更簡潔

**問題**：目前的 `onIsolate` 函式先隱藏所有物體，然後再顯示選中的物體。

```typescript
// IFCViewerContainer.tsx
const onIsolate = async () => {
  // ...
  await hider.set(false);
  await hider.set(true, selection);
};
```

**潛在風險**：雖然這個方法可行，但 `Hider` 組件本身提供了 `isolate` 方法，專門用於此功能。直接使用 `isolate` 不僅程式碼更簡潔，也更能表達其意圖，並且可能在未來版本中有更好的效能優化。

**✅ 建議作法**：直接使用 `hider.isolate()`。

```typescript
// 建議的寫法
const onIsolate = async () => {
  const highlighter = componentsRef.current?.get(OBCF.Highlighter);
  const hider = componentsRef.current?.get(OBC.Hider);
  if (!highlighter || !hider) return;
  const selection = highlighter.selection.select;
  await hider.isolate(selection);
};
```

### ⚠️ 顏色高亮邏輯的複雜性

**問題**：在 `IFCViewerContainer.tsx` 中，顏色高亮功能 (`colorize`) 的實現分散在多個地方：
- `handleClick` 中有專門的邏輯分支。
- `useEffect` 中根據 `activeTool` 啟用/停用。
- `handleColorizeToggle` 和 `handleClearColor` 處理狀態和清理。
- 使用 `useRef` (`coloredElements`) 來追蹤已著色的元素。

**潛在風險**：
1.  **狀態不同步**：`Highlighter` 組件本身有內建的樣式和高亮管理機制。手動用 `useRef` 追蹤狀態，可能與 `Highlighter` 的內部狀態產生不一致。
2.  **難以維護**：邏輯分散使得理解和修改顏色高亮功能變得困難。
3.  **清理不完全**：`handleClearColor` 清理了高亮，但如果使用者在未清理的情況下切換工具，高亮效果可能會殘留。

**✅ 建議作法**：
1.  **統一使用 `Highlighter`**：充分利用 `Highlighter` 的樣式系統。可以為不同的顏色創建不同的高亮樣式。
2.  **簡化狀態管理**：盡量避免手動追蹤已高亮的元素，讓 `Highlighter` 來管理。當需要清除時，直接呼叫 `highlighter.clear('style-name')`。
3.  **集中邏輯**：將與顏色高亮相關的邏輯封裝在一個或一組相關的函式中，而不是分散在各處。

```typescript
// 建議的思路
const handleColorizeElement = async (modelId, localId, color) => {
  const highlighter = components.get(OBCF.Highlighter);
  const styleName = `colorize-${color}`;
  
  // 如果樣式不存在，則動態創建
  if (!highlighter.styles.has(styleName)) {
    highlighter.styles.set(styleName, {
      color: new Color(color),
      // ... 其他樣式屬性
    });
  }
  
  // 使用新樣式進行高亮
  await highlighter.highlightByID(styleName, { [modelId]: new Set([localId]) });
}

const clearAllColorization = async () => {
  const highlighter = components.get(OBCF.Highlighter);
  // 遍歷所有樣式，清除所有顏色高亮
  for (const [name] of highlighter.styles) {
    if (name.startsWith('colorize-')) {
      await highlighter.clear(name);
    }
  }
}
```

---
## `SearchElement.tsx` 邏輯分析

`SearchElement.tsx` 組件實現了複雜的元素查詢功能，以下是一些關鍵邏輯的分析與潛在優化點。

### ⚠️ 複雜的交集 (Intersect) 與差集 (Difference) 手動實現

**問題**：在 `handleSearch` 函式中，為了處理 `AND` 和 `NOT` 邏輯，程式碼手動實現了 `intersect` 和 `difference` 函式來計算兩個 `ModelIdMap` 的交集與差集。

```typescript
// SearchElement.tsx
const intersect = (map1: ModelIdMap, map2: ModelIdMap): ModelIdMap => { /* ... */ };
const difference = (map1: ModelIdMap, map2: ModelIdMap): ModelIdMap => { /* ... */ };

// ... 在迴圈中使用
if (row.logic === "NOT") {
  finalResult = difference(finalResult, currentQueryResult);
} else { // AND
  finalResult = intersect(finalResult, currentQueryResult);
}
```

**潛在風險**：
1.  **效能問題**：手動遍歷和比較 `Set` 的效能可能不是最優的，特別是當 `ModelIdMap` 包含大量模型和元素 ID 時。
2.  **程式碼複雜度**：這些輔助函式增加了程式碼的複雜度和維護成本。
3.  **未來的相容性**：`OBC` 庫未來可能會提供內建的、更高效的集合運算方法。手動實現可能與未來的官方 API 不一致。

**✅ 建議作法**：`OBC.ItemsFinder` 的 `create` 方法本身就支援複雜的查詢條件，包括多個屬性查詢和正則表達式。可以嘗試將多個條件組合在一個查詢中，而不是手動進行多次查詢和集合運算。

```typescript
// 建議的思路：將多個 AND 條件合併到一個查詢中
const andQueries = activeQueries.filter(q => q.logic === 'AND');
const queryParts = andQueries.map(row => {
  // ... 根據 row 建立 queryPart
});

// 創建一個包含所有 AND 條件的查詢
finder.create('combined-and-query', queryParts);
const andResult = await finder.list.get('combined-and-query').test();

// 然後再處理 NOT 條件
// ...
```
雖然 `ItemsFinder` 目前的 API 對於 `NOT` 邏輯的直接支持有限，但將 `AND` 邏輯合併可以顯著簡化程式碼並可能提高效能。

### ⚠️ 每次搜索都重新獲取所有分類 (Categories)

**問題**：在 `SearchElement.tsx` 的 `useEffect` 中，每次組件掛載時都會執行 `getCategories` 函式，遍歷所有模型以獲取分類列表。

```typescript
// SearchElement.tsx
useEffect(() => {
  const getCategories = async () => {
    // ... 遍歷所有模型
  };
  getCategories();
}, [components]);
```

**潛在風險**：
1.  **重複計算**：如果 `IFCViewerContainer` 已經獲取了分類列表，`SearchElement` 就是在重複工作。
2.  **效能開銷**：當模型很大或很多時，`getItemsOfCategories([/.*/])` 是一個相對耗時的操作。每次打開搜索面板都執行一次，可能會導致短暫的 UI 卡頓。

**✅ 建議作法**：
- **狀態提升 (Lifting State Up)**：將 `categories` 的狀態提升到父組件 `IFCViewerContainer`。在模型加載完成後獲取一次，然後通過 props 傳遞給 `SearchElement` 和其他需要分類列表的子組件。
- 這樣可以確保分類只被計算一次，並在整個應用中共享，提高效能和程式碼的可維護性。

### ⚠️ 臨時查詢的創建與銷毀

**問題**：在 `handleSearch` 的迴圈中，為每個查詢條件都創建了一個臨時的 `finder` 查詢 (`query-row-${i}`), 然後在查詢結束後立即刪除。

```typescript
// SearchElement.tsx
const queryName = `query-row-${i}`;
if (finder.list.has(queryName)) finder.list.delete(queryName);
finder.create(queryName, [queryPart]);
const query = finder.list.get(queryName);
// ...
const currentQueryResult = await query.test();
finder.list.delete(queryName);
```

**潛在風險**：雖然這種模式可以確保每次查詢都是全新的，但頻繁地創建和銷-毀查詢對象可能會帶來微小的效能開銷。

**✅ 建議作法**：
- **重用查詢對象**：如果查詢的結構是固定的（例如，總是查詢某個屬性），可以考慮重用同一個查詢對象，只在每次搜索時更新其參數。`ItemsFinder` 的查詢對象是可變的。

---
## `BCFTopics.tsx` 邏輯分析

`BCFTopics.tsx` 處理 BCF 議題的創建、編輯和歷史記錄，其中包含一些值得注意的邏輯。

### ⚠️ 手動實現的 Topic 歷史記錄

**問題**：在 `handleEditTopic` 函式中，程式碼通過手動擴展 `OBC.Topic` 類型並附加一個 `history` 陣列來實現編輯歷史記錄。

```typescript
// BCFTopics.tsx
interface ExtendedTopic extends OBC.Topic {
  history?: HistoryRecord[];
}

// ... in handleEditTopic
const before = { ...selectedTopic };
// ... modify selectedTopic ...
const after = { ...selectedTopic };

if (!("history" in selectedTopic)) {
  (selectedTopic as ExtendedTopic).history = [];
}
(selectedTopic as ExtendedTopic).history!.push(changes);
```

**潛在風險**：
1.  **非標準擴展**：這種方式直接修改了從 `OBC` 庫中獲取的對象，屬於非標準的擴展。如果未來 `OBC` 庫更新了 `Topic` 的結構，或者其內部邏輯依賴於原始結構，這種手動擴展可能會導致非預期的錯誤。
2.  **數據持久性問題**：這個 `history` 陣列只存在於前端的記憶體中。當導出為 `.bcf` 檔案時，這個自定義的 `history` 欄位很可能不會被 `bcfTopics.export()` 方法識別和包含，導致歷史記錄丟失。同樣，從 `.bcf` 檔案加載時也無法還原。
3.  **狀態管理複雜**：需要手動進行類型斷言 (`as ExtendedTopic`)，增加了程式碼的複雜性和出錯的可能性。

**✅ 建議作法**：
- **分離狀態管理**：不要直接修改 `Topic` 對象，而是將歷史記錄存儲在一個獨立的 React state 或 `Map` 中，使用 `topic.guid` 作為鍵。

```typescript
// 建議的思路
const [topicHistories, setTopicHistories] = useState<Map<string, HistoryRecord[]>>(new Map());

const handleEditTopic = (formData) => {
  // ...
  const before = { ...selectedTopic };
  // ... modify selectedTopic ...
  const after = { ...selectedTopic };

  const newHistoryRecord = { before, after, ... };

  setTopicHistories(prevHistories => {
    const newHistories = new Map(prevHistories);
    const currentHistory = newHistories.get(selectedTopic.guid) || [];
    newHistories.set(selectedTopic.guid, [...currentHistory, newHistoryRecord]);
    return newHistories;
  });
  // ...
};

// 顯示歷史時
const history = topicHistories.get(selectedTopic.guid) || [];
```
- 這樣做可以將自定義的業務邏輯（歷史記錄）與 `OBC` 庫的數據結構完全分離，使程式碼更健壯、更易於維護。

### ⚠️ `structuredClone` 的潛在問題

**問題**：在 `createTopic` 函式中，使用了 `structuredClone` 來複製 `highlighter.selection.select`。

```typescript
// BCFTopics.tsx
const currentSelection = structuredClone(highlighter.selection.select);
```

**潛在風險**：`highlighter.selection.select` 的值是一個 `ModelIdMap`，即 `{[modelId: string]: Set<number>}`。`structuredClone` 可以正確地克隆 `Set` 對象，所以在這個情境下是安全的。然而，需要注意的是，`structuredClone` **不能** 克隆包含函式、DOM 節點、或某些內置類型（如 `Error`、`RegExp` 的某些屬性）的對象。如果未來 `Highlighter` 的選擇對象結構發生變化，包含了不可克隆的數據，這裡的程式碼就會出錯。

**✅ 建議作法**：
- **手動淺拷貝**：對於這種結構相對簡單的對象，手動進行淺拷貝通常更安全、更明確。

```typescript
// 建議的寫法
const selection = highlighter.selection.select;
const newSelection: OBC.ModelIdMap = {};
for (const modelId in selection) {
  newSelection[modelId] = new Set(selection[modelId]);
}
```
- 這種方式雖然程式碼稍長，但它不依賴於 `structuredClone` 的黑盒行為，對於未來可能的數據結構變化有更好的適應性。

### ⚠️ 事件監聽器與狀態更新

**問題**：在 `useEffect` 中，`onTopicsChanged` 函式被添加到 `onItemSet` 和 `onItemUpdated` 事件中。這個函式通過 `setTopicsList([...topics.list.values()])` 來觸發 React 的重新渲染。

```typescript
// BCFTopics.tsx
const onTopicsChanged = () => setTopicsList([...topics.list.values()]);
topics.list.onItemSet.add(onTopicsChanged);
topics.list.onItemUpdated.add(onTopicsChanged);
```

**潛在風險**：這是一種常見且可行的模式，但需要注意：
1.  **效能**：如果 `onItemSet` 或 `onItemUpdated` 事件被非常頻繁地觸發，每次都展開 `topics.list.values()` 並創建一個新陣列可能會帶來微小的效能開銷。
2.  **依賴清理**：如此處所示，在 `useEffect` 的 cleanup 函式中移除監聽器是**至關重要**的，否則會導致內存洩漏。這段程式碼已經正確地做到了這一點，但這是一個常見的錯誤點，值得在疑難解決文件中強調。

**✅ 建議作法**：
- 當前的實現是正確的。這裡的建議是，在開發複雜的事件驅動 UI 時，始終要確保在組件卸載時清理所有註冊的事件監聽器，以避免內存洩漏和非預期的副作用。

---
## `CollisionDetector.tsx` 邏輯分析

`CollisionDetector.tsx` 負責執行碰撞檢測，這是一個計算密集型任務。以下是從其程式碼中發現的潛在問題和優化建議。

### ⚠️ 低效的包圍盒 (Bounding Box) 獲取方式

**問題**：在 `getItemsWithBoxes` 函式中，程式碼遍歷每個元素，並為每個元素單獨調用 `boxer.addFromModelIdMap()` 來獲取其包圍盒。在每次調用之間，`boxer.list` 都會被清空。

```typescript
// CollisionDetector.tsx
for (let i = 0; i < groupItems.length; i++) {
  // ...
  const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set([numericId]) };
  
  boxer.list.clear();
  await boxer.addFromModelIdMap(modelIdMap);
  const box = boxer.get();
  boxer.list.clear();
  // ...
}
```

**潛在風險**：這種逐一獲取包圍盒的方式極其低效。`BoundingBoxer` 組件被設計用來一次性處理多個元素。對每個元素都進行 `clear -> add -> get -> clear` 的循環會產生巨大的效能開銷，特別是當組內元素數量很多時。

**✅ 建議作法**：一次性將整個組的所有元素添加到 `BoundingBoxer` 中，然後遍歷 `boxer.list` 來獲取每個元素的包圍盒。

```typescript
// 建議的寫法
const getItemsWithBoxes = async (group: Group): Promise<ItemWithBox[]> => {
  const boxer = boxerRef.current;
  if (!boxer) return [];

  boxer.list.clear();
  await boxer.addFromModelIdMap(group); // 一次性添加整個組

  const itemsWithBoxes: ItemWithBox[] = [];
  for (const [expressID, box] of boxer.list) {
    // 注意：這裡的 expressID 需要映射回 modelId 和 itemId
    // 這需要額外的邏輯來處理，但效能會好很多
    // ...
  }
  boxer.list.clear();
  return itemsWithBoxes;
};
```
*注意：`boxer.list` 的鍵是 `expressID`，需要一個反向映射來找到它屬於哪個模型，這增加了邏輯複雜性，但效能提升是顯著的。*

### ⚠️ 主線程阻塞 (Main Thread Blocking)

**問題**：碰撞檢測的核心邏輯是兩個嵌套的循環，其計算複雜度為 O(n*m)。當組內元素數量龐大時，即使使用了 `await new Promise(resolve => setTimeout(resolve, 0))` 來防止瀏覽器完全卡死，UI 響應仍然會變得非常遲鈍。

```typescript
// CollisionDetector.tsx
for (let i = 0; i < itemsA.length; i++) {
  for (let j = i + 1; j < itemsA.length; j++) {
    // ... 比較 ...
    if (comparisons % 10000 === 0) {
      // ... 更新進度並讓出主線程
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

**潛在風險**：對於成千上萬個元素的比較，即使頻繁地讓出主線程，總的計算時間仍然會佔用大量 CPU 資源，導致用戶體驗不佳。

**✅ 建議作法**：將整個碰撞檢測計算過程移至 **Web Worker** 中。
1.  **創建 Worker**：創建一個新的 `worker.js` 檔案。
2.  **傳遞數據**：將兩個組的元素列表（或其包圍盒數據）傳遞給 Worker。
3.  **在 Worker 中計算**：在 Worker 中執行嵌套循環比較。
4.  **返回結果**：當 Worker 計算完成後，將碰撞結果列表發送回主線程。
5.  **更新 UI**：主線程接收到結果後，更新 UI 狀態。

這樣可以完全釋放主線程，使其專注於 UI 渲染和用戶交互，從而提供流暢的體驗。

### ⚠️ 碰撞結果高亮邏輯複雜

**問題**：在 `handleCollisionClick` 中，為了高亮顯示碰撞的兩個物體，程式碼手動調用了 `hider.set` 來隔離，然後又調用了兩次 `fragments.highlight` 來分別用不同顏色高亮。

```typescript
// CollisionDetector.tsx
await hider.set(false);
await hider.set(true, selection);

await fragments.highlight({ color: new THREE.Color("red"), ... });
await fragments.highlight({ color: new THREE.Color("orange"), ... });
```

**潛在風險**：這種方式混合了 `Hider` 和 `FragmentsManager` 的 `highlight` 方法，邏輯不夠統一。`fragments.highlight` 是一個較底層的 API，直接使用它會繞過 `Highlighter` 組件的狀態管理。

**✅ 建議作法**：統一使用 `Highlighter` 組件。
1.  **創建樣式**：在初始化時為碰撞物體創建兩個高亮樣式，例如 `"collision-a"` 和 `"collision-b"`。
2.  **隔離與高亮**：先使用 `hider.isolate()` 隔離所有非碰撞物體。然後使用 `highlighter.highlightByID()` 分別對兩個碰撞物體應用不同的高亮樣式。

```typescript
// 建議的寫法
const highlighter = components.get(OBCF.Highlighter);
const hider = components.get(OBC.Hider);

// 假設 'collision-a' 和 'collision-b' 樣式已創建
await hider.set(false); // 隱藏所有
await highlighter.highlightByID("collision-a", { [item1.modelId]: new Set([id1]) });
await highlighter.highlightByID("collision-b", { [item2.modelId]: new Set([id2]) });
```
這樣邏輯更清晰，並且所有高亮狀態都由 `Highlighter` 統一管理。

---
## `Viewpoints.tsx` 邏輯分析

`Viewpoints.tsx` 組件負責管理視點，其邏輯相對直接，但仍有優化空間，尤其是在狀態管理和父子組件交互方面。

### ⚠️ 狀態管理的雙重來源 (Dual Source of Truth)

**問題**：`Viewpoints.tsx` 組件內部維護了一個 `currentView` 的本地狀態，同時也接收從父組件傳入的 `storedViews` 和 `setStoredViews`。

```typescript
// Viewpoints.tsx
const [currentView, setCurrentView] = useState<StoredViewpoint | null>(null);

// ...props
// storedViews: StoredViewpoint[];
// setStoredViews: React.Dispatch<React.SetStateAction<StoredViewpoint[]>>;
```

**潛在風險**：
1.  **狀態不同步**：當 `storedViews` 在父組件中因其他原因被修改時（例如，通過 BCF 議題加載視點），`Viewpoints.tsx` 內部的 `currentView` 可能不會相應更新，導致 UI 顯示與實際狀態不一致。
2.  **邏輯分散**：更新視點的邏輯分散在 `setCurrentView` 和 `setStoredViews` 兩個地方，增加了維護的複雜性。例如，在 `renameViewpoint` 中，需要同時更新兩個狀態。

**✅ 建議作法**：
- **移除本地狀態**：移除 `currentView` 本地狀態，使其成為一個派生狀態。可以從父組件傳入一個 `currentViewId`，然後在 `Viewpoints.tsx` 內部根據這個 ID 從 `storedViews` 陣列中找到當前選中的視點。

```typescript
// 在父組件 IFCViewerContainer.tsx 中
const [currentViewId, setCurrentViewId] = useState<string | null>(null);

// 傳遞給 Viewpoints.tsx
// <Viewpoints ... currentViewId={currentViewId} setCurrentViewId={setCurrentViewId} />

// 在 Viewpoints.tsx 中
const currentView = storedViews.find(v => v.id === currentViewId) || null;

const selectViewpoint = (view: StoredViewpoint) => {
  setCurrentViewId(view.id);
  view.viewpoint.go();
};
```
- 這樣可以確保狀態的單一數據源，簡化邏輯，並避免同步問題。

### ⚠️ `createViewpoint` 的職責劃分

**問題**：在 `handleAddViewpoint` 函式中，調用了從 props 傳入的 `createViewpoint`，然後又在組件內部處理 `snapshot` 的獲取和新視點對象的創建，最後才更新狀態。

```typescript
// Viewpoints.tsx
const handleAddViewpoint = async () => {
  const vp = await createViewpoint(); // 從父組件創建
  if (!vp) return;
  const snapshot = getViewpointSnapshotData(vp); // 在子組件獲取快照

  const newView: StoredViewpoint = { ... }; // 在子組件創建對象
  setCurrentView(newView); // 更新子組件狀態
};
```

**潛在風險**：創建一個完整視點的邏輯被分散在了父組件 (`createViewpoint` 創建核心對象) 和子組件 (`handleAddViewpoint` 處理快照和狀態更新) 之間。這使得整個流程不夠內聚。

**✅ 建議作法**：
- **將邏輯集中在父組件**：將創建完整 `StoredViewpoint` 對象的邏輯完全放在父組件 `IFCViewerContainer.tsx` 的 `createViewpoint` 函式中。`Viewpoints.tsx` 只負責調用這個函式並觸發狀態更新。

```typescript
// 在 IFCViewerContainer.tsx 中
const createViewpoint = async () => {
  const vp = viewpointsRef.current.create();
  if (!vp) return;
  
  await vp.takeSnapshot?.();
  const snapshot = getViewpointSnapshotData(vp);
  
  const newView: StoredViewpoint = {
    id: vp.guid,
    title: `Viewpoint ${storedViews.length + 1}`,
    snapshot,
    viewpoint: vp,
  };
  
  setStoredViews(prev => [...prev, newView]);
  setCurrentViewId(newView.id); // 更新當前選中視點的 ID
};

// 在 Viewpoints.tsx 中
const handleAddViewpoint = async () => {
  await createViewpoint(); // 只需調用，父組件會處理所有狀態更新
};
```
