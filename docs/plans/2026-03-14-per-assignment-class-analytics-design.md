# 單一作業班級分析頁面設計

> 日期：2026-03-14
> 狀態：已設計，待實作

## 目標

讓教師能夠查看某門課某次作業的班級分析結果，包含立場分佈、代表性觀點、成績明細，以及 AI 產生的班級報告，作為課堂討論的教學情報。

## 設計決策

| 決策        | 選擇                                              | 理由                                               |
| ----------- | ------------------------------------------------- | -------------------------------------------------- |
| 入口位置    | 從課程管理頁的作業列表進入                        | 教師思維是「這門課→這次作業→看分析」，最自然的路徑 |
| 頁面模式    | 預設模式（課堂展示安全）+ 詳細模式（toggle 切換） | 老師上課投影時不能顯示學生個資和分數               |
| AI 報告觸發 | 教師手動按按鈕產生                                | 非 AI 區塊先呈現，AI 報告按需產生，節省 token 成本 |
| AI 報告儲存 | assignment document 的 `classReport` 欄位         | 最簡單，不新增 collection                          |
| 報告更新    | 有新提交時提示，教師可重新產生                    | 避免自動重新產生的 token 成本                      |

---

## 一、路由與存取控制

### 路由

```
/host/courses/[courseId]/assignments/[assignmentId]/analytics
```

### 入口

教師在 `/courses/[id]` 的 `MentorCourse.svelte` 作業列表中，每個作業旁新增「班級分析」按鈕/連結。

### 存取控制

只有該課程的 owner / instructor / TA 角色可以進入。頁面載入時驗證使用者的 roster 角色。

---

## 二、資料結構

### 新增 `ClassReport` 欄位

位置：assignment document

```typescript
classReport: {
  content: string;        // AI 產生的報告內容（markdown）
  generatedAt: number;    // 產生時間 timestamp
  submissionCount: number; // 產生時的已提交數，用來判斷是否過時
} | null
```

---

## 三、頁面結構 — 雙模式設計

### 預設模式（課堂展示安全）

教師上課投影時使用，不顯示任何學生個資或分數。

#### 區塊 A — 作業概覽

- 作業標題
- 截止日期
- 已提交 / 總人數（例如「18 / 25 已提交」）
- 班級平均分數

#### 區塊 B — 學生立場光譜圖

- 水平光譜圖，X 軸為立場光譜（強烈反對 ↔ 強烈支持）
- 每個學生一個點，顯示其最終立場
- **預設模式下匿名**，不標示學生姓名
- 可看出全班偏向一邊、兩極分化、或均勻分佈

資料來源：從各學生的 conversation turns 的 `analysis.stance` 計算最終立場。

#### 區塊 C — 代表性立場摘錄

- 從光譜兩側各擷取 2-3 個學生的原文片段
- 按 stance 分組，從每組中挑選代表性的 turn 文字
- 截取前 50-80 字，匿名呈現
- 不需要 AI，純資料篩選

#### 區塊 D — AI 班級報告

- 若 `classReport` 已存在：直接渲染 markdown 內容，顯示產生時間
- 若 `classReport` 不存在：顯示「尚未產生報告」+ 「產生班級報告」按鈕
- 若有新提交（`submissionCount < 目前提交數`）：提示「有 N 份新提交，報告可能已過時」+「重新產生」按鈕

### 詳細模式（教師點「顯示詳細資訊」toggle 後）

在預設模式基礎上額外顯示：

- 光譜圖的點標示學生姓名
- 學生成績列表（表格）：
    - 學生姓名
    - 總分（overallScore）
    - 5 維度各分數
    - 提交時間
    - 是否遲交
    - 可按任一欄位排序
    - 低分學生（< 2.5）用顏色標記
    - 點擊學生姓名跳轉到該學生的對話頁

---

## 四、AI 班級報告內容

### 報告結構（AI 產生的 markdown）

```markdown
## 立場分佈解讀

（全班立場的統計解讀，例如「60% 偏支持、30% 偏反對、10% 中立，
呈現明顯一邊倒的趨勢」）

## 主要觀點歸納

### 支持方主要論點

- 論點 A：...
- 論點 B：...

### 反對方主要論點

- 論點 X：...
- 論點 Y：...

### 獨特觀點

- ...（少數但有價值的角度）

## 班級討論動態

（全班整體的對話特徵，例如「多數學生在面對反論時選擇修正立場」
或「約半數學生堅持原始立場到最後」）

## 教學建議

（根據觀點分佈和對話表現，給老師課堂討論的切入建議，
例如「可以讓持 A 觀點的同學和持 X 觀點的同學互相辯論」）
```

### AI 輸入素材

| 素材                           | 來源                    | 用途         |
| ------------------------------ | ----------------------- | ------------ |
| 每個學生的最終立場             | `turn.analysis.stance`  | 立場分佈解讀 |
| 每個學生的 stance 變化軌跡     | `stanceHistory`         | 班級討論動態 |
| 每個學生對話中的關鍵 turn 內容 | conversation turns      | 觀點歸納     |
| 5 維度評估結果                 | `submission.assessment` | 整體表現參考 |

### 產生機制

1. 教師按「產生班級報告」按鈕
2. 前端呼叫 API：`POST /api/analytics/class-report`，帶 `assignmentId` + `courseId`
3. 後端收集該作業所有學生的對話數據
4. 組合 prompt 送 LLM，要求輸出上述 markdown 結構
5. 將結果存入 `assignment.classReport`
6. 回傳給前端渲染

### 報告更新邏輯

- 首次產生：`classReport` 從 `null` 變為有值
- 有新提交：前端比較 `classReport.submissionCount` 與目前實際提交數
    - 若不同，顯示提示「有 N 份新提交，報告可能已過時」
    - 教師按「重新產生」→ 覆蓋舊的 `classReport`

---

## 五、錯誤處理

| 情境                            | 處理方式                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------ |
| AI 報告產生失敗                 | 顯示錯誤提示，保留舊報告（若有），教師可重試                                   |
| 無任何提交                      | 非 AI 區塊顯示空狀態，報告按鈕 disabled                                        |
| 所有提交都沒有 assessment       | 光譜圖和摘錄正常顯示（stance 資料獨立於 assessment），成績列表顯示「尚未評估」 |
| 部分學生 stance 為 undetermined | 光譜圖忽略該學生，摘錄跳過                                                     |

---

## 六、修改範圍摘要

| 檔案                                                                                                | 變更類型                                                       |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/firebase/src/firestore/assignments.ts`                                                    | 新增 `ClassReport` 型別 + schema                               |
| `packages/mentora-api/src/lib/server/application/analytics-service.ts`                              | 新增 `getAssignmentAnalytics()` + `generateClassReport()` 方法 |
| `packages/mentora-api/src/lib/server/routes/analytics.ts`                                           | 新增 `POST /api/analytics/class-report` 端點                   |
| `apps/mentora/src/routes/host/courses/[courseId]/assignments/[assignmentId]/analytics/+page.svelte` | 新頁面                                                         |
| `apps/mentora/src/routes/host/courses/[courseId]/assignments/[assignmentId]/analytics/+page.ts`     | 資料載入                                                       |
| `apps/mentora/src/routes/courses/[id]/MentorCourse.svelte`                                          | 新增「班級分析」入口連結                                       |

---

## 七、不做的事

- 不做跨作業趨勢比較
- 不做學生端跨作業分析
- 不做班級排名或學生間比較
- 不做自動產生報告（一律教師手動觸發）
- 不做報告版本歷史（覆蓋即可）
