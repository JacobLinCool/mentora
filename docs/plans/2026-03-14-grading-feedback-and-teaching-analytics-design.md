# AI 自動評估與教學分析設計

> 日期：2026-03-14
> 狀態：已設計，待實作

## 目標

1. 在對話結束時由 AI 自動產生五維度結構化評估，寫入 submission
2. 修復 turn stance 數據缺口，讓現有 Analytics 圖表恢復運作
3. 強化教師端教學分析，新增評估統計與需關注學生識別
4. 新增學生端作業結果頁，顯示 AI 評估詳情

## 設計決策

| 決策            | 選擇                                | 理由                                     |
| --------------- | ----------------------------------- | ---------------------------------------- |
| 評分模式        | AI 自動評估為主，教師可覆寫         | Orchestrator 已有結構化數據，轉化成本低  |
| 評估時機        | 融入 Closure stage                  | 不增加 API call，不增加延遲              |
| 評估維度        | 5 維度（完整版）                    | 覆蓋論證、批判思考、原則、開放性、連貫性 |
| 分析受眾        | 教師 + 學生，教師優先               | 修復現有壞掉的圖表 + 新增學生回饋        |
| Stance 數據修復 | 每次 turn 寫入時填充                | 最小改動，現有 Analytics 立即生效        |
| 學生分析位置    | 嵌入對話結果頁 + Dashboard 摘要卡片 | 符合「做完作業 → 看回饋」的使用流程      |

---

## 一、資料結構

### 新增 `AssessmentResult` 型別

位置：`packages/firebase/src/firestore/submissions.ts`

```typescript
interface DimensionScore {
    score: number; // 1-5
    feedback: string; // 該維度的文字說明
}

interface AssessmentResult {
    dimensions: {
        argumentQuality: DimensionScore; // 論證品質
        criticalThinking: DimensionScore; // 批判思考
        principleExtraction: DimensionScore; // 原則提煉
        openness: DimensionScore; // 開放性
        coherence: DimensionScore; // 論述連貫性
    };
    overallScore: number; // 1-5, 五維度加權平均（四捨五入至一位小數）
    overallFeedback: string; // 整體文字回饋
    generatedAt: number; // timestamp
}
```

### 修改 Submission schema

```typescript
// 現有欄位保留
scoreCompletion: number | null; // 教師手動分數（可覆寫）
notes: string | null; // 教師手動回饋

// 新增
assessment: AssessmentResult | null; // AI 自動評估
assessmentError: string | null; // 評估失敗原因（供教師端顯示）
```

### 最終分數邏輯

學生看到的最終分數：`scoreCompletion ?? (assessment.overallScore * 20)`

`assessment` 和 `scoreCompletion` 分開存放，教師覆寫不會覆蓋 AI 評估原始數據。

---

## 二、Closure Stage 改造 — AI 評估生成

位置：`packages/mentora-ai/src/orchestrator/handlers/closure.ts`

### 流程

當學生確認 summary（`TR_CONFIRM` 路徑），改造 prompt 讓 LLM 同時輸出：

1. 對話總結（給學生看的自然語言）
2. 結構化評估（JSON 格式，五維度各 1-5 分及說明）

### Prompt 可用的評估依據（已存在於 DialogueState）

| DialogueState 欄位         | 評估維度                                |
| -------------------------- | --------------------------------------- |
| `stanceHistory`            | 論證品質 + 開放性（立場變化次數與方向） |
| `loopCount`                | 批判思考（經歷幾輪反論）                |
| `principleHistory`         | 原則提煉（原則的層次與分類）            |
| `conversationHistory`      | 論述連貫性（完整對話文本）              |
| `currentStance.confidence` | 開放性（信心變化）                      |

### 回傳值擴展

`StageResult` 新增 `assessment?: AssessmentResult`，讓 `ConversationService` 在對話結束時寫入 submission。

### 驗證

使用 Zod schema 驗證 LLM 輸出的 JSON，分數強制 `z.number().min(1).max(5)`。

---

## 三、Turn Stance 數據填充

位置：`packages/mentora-api/src/lib/server/application/conversation-service.ts`

### 做法

1. 在 `StageResult` 中新增 `stanceSnapshot?: { stance: MessageStance }` 欄位
2. 修改 3 個 stage handler（`asking-stance.ts`、`case-challenge.ts`、`closure.ts`），回傳時附帶當前 stance 分類
3. `ConversationService` 寫入 turn 時直接使用 `stageResult.stanceSnapshot` 填入 `turn.analysis`

### Fallback

映射失敗時 fallback 為 `"undetermined"`，不阻斷對話流程。Analytics 自動忽略 `"undetermined"` 的 turn。

### 影響

現有 Analytics 的 Spectrum 圖表和 Word Cloud sentiment 立即生效，無需改動 `AnalyticsService`。

---

## 四、教師端教學分析強化

位置：`packages/mentora-api/src/lib/server/application/analytics-service.ts` + `apps/mentora/src/routes/host/analytics/+page.svelte`

### 修復

- Spectrum 圖表：Turn stance 數據填充後自動恢復運作
- Word Cloud sentiment：從 `analysis.stance` 映射 pro/con/neutral，取代硬編碼的 `'neutral'`

### 新增指標（擴展 getDashboard()）

```typescript
assessmentOverview: {
    avgScores: {
        argumentQuality: number;
        criticalThinking: number;
        principleExtraction: number;
        openness: number;
        coherence: number;
        overall: number;
    }
    scoreDistribution: Array<{ range: string; count: number }>;
    needsAttention: Array<{
        studentName: string;
        courseTitle: string;
        overallScore: number;
        weakestDimension: string;
    }>; // overallScore < 2.5 的學生
}
```

### 前端視覺化

- 五維度班級平均雷達圖
- 分數分佈長條圖
- 「需關注學生」列表卡片

### 不做的事

- 不做跨課程比較
- 不做歷史趨勢折線圖（先累積數據再迭代）

---

## 五、學生端 — 作業結果頁 + Dashboard 摘要

### 作業結果頁

位置：修改 `apps/mentora/src/routes/conversations/[id]/+page.svelte`

對話結束後，在對話 UI 下方展示評估結果區塊：

```
┌─────────────────────────────────────┐
│  對話已結束                          │
│                                     │
│  📊 學習評估                         │
│  ┌─────────────────────────────┐    │
│  │  ◆ 雷達圖（五維度）           │    │
│  └─────────────────────────────┘    │
│                                     │
│  整體分數：4.2 / 5                   │
│  整體回饋：「你在面對反論時展現了...」  │
│                                     │
│  ▸ 論證品質    4/5  「立場清晰且...」  │
│  ▸ 批判思考    5/5  「能有效回應...」  │
│  ▸ 原則提煉    3/5  「歸納出了...」   │
│  ▸ 開放性      4/5  「願意修正...」   │
│  ▸ 論述連貫性   5/5  「前後一致...」   │
│                                     │
│  （教師評語：尚未評分）               │
└─────────────────────────────────────┘
```

資料來源：讀取 `submission.assessment`，若教師已覆寫則同時顯示 `scoreCompletion` + `notes`。

### Dashboard 摘要卡片

位置：修改 `apps/mentora/src/lib/components/dashboard/StudentDashboard.svelte`

在已完成作業旁顯示：

- 小型分數 badge（如 `4.2/5`）
- 與上次作業的趨勢箭頭（↑ ↓ →）
- 點擊導向該對話的結果頁

### 不做的事

- 不做獨立學生分析頁面
- 不做跨作業趨勢圖
- 不做班級排名或與他人比較

---

## 六、錯誤處理

| 情境                         | 處理方式                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| AI 評估生成失敗              | 對話結束訊息照常回傳，`assessment` 保持 `null`，記錄 `assessmentError`，教師端顯示「AI 評估失敗，請手動評分」 |
| LLM 回傳 JSON 格式不合法     | Zod 驗證失敗 → 同上處理                                                                                       |
| 分數超出 1-5 範圍            | Zod 強制 `z.number().min(1).max(5)`，不合法則整個 assessment 視為失敗                                         |
| 對話中途放棄（未到 Closure） | 不產生評估，`assessment` 保持 `null`，submission 維持 `"in_progress"`                                         |
| Turn stance 映射失敗         | Fallback 為 `"undetermined"`，不阻斷對話，Analytics 忽略該 turn                                               |
| 不做自動重試                 | 避免額外 token 成本                                                                                           |

---

## 修改範圍摘要

| 檔案                                                                      | 變更類型                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/firebase/src/firestore/submissions.ts`                          | 新增 `AssessmentResult` 型別 + schema                |
| `packages/mentora-ai/src/orchestrator/handlers/closure.ts`                | 改造 prompt，回傳 assessment                         |
| `packages/mentora-ai/src/builder/types.ts`                                | `StageResult` 新增 `assessment` + `stanceSnapshot`   |
| `packages/mentora-ai/src/orchestrator/handlers/asking-stance.ts`          | 回傳 `stanceSnapshot`                                |
| `packages/mentora-ai/src/orchestrator/handlers/case-challenge.ts`         | 回傳 `stanceSnapshot`                                |
| `packages/mentora-api/src/lib/server/application/conversation-service.ts` | 寫入 turn 時填充 stance，對話結束時寫入 assessment   |
| `packages/mentora-api/src/lib/server/application/analytics-service.ts`    | 新增 `assessmentOverview`，修復 word cloud sentiment |
| `apps/mentora/src/routes/host/analytics/+page.svelte`                     | 新增雷達圖、分佈圖、需關注學生列表                   |
| `apps/mentora/src/routes/conversations/[id]/+page.svelte`                 | 新增評估結果區塊                                     |
| `apps/mentora/src/lib/components/dashboard/StudentDashboard.svelte`       | 新增分數 badge + 趨勢箭頭                            |
