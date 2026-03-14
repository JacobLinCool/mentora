# Role Selection & Onboarding Redesign

## Summary

將現有的「登入後在設定頁切換身份」改為「首次登入時選擇角色」。角色（老師/學生）在建立帳號時決定，之後不可變更。同時調整 RWD 策略：老師介面 desktop-first，學生介面 mobile-first。

## User Flow

### All Users (Single Entry Point)

```
/auth 頁面
  → Google OAuth 登入
  → 檢查 Firestore 有無 profile
    → [有 profile（回訪用戶）] → Dashboard → 設備檢查
    → [無 profile（新用戶）] → 角色選擇頁
      → [學生] → 建立 profile(role: "student") → Dashboard → 設備檢查
      → [老師] → 輸入 MENTOR_ACCESS_CODE → 驗證通過 → 建立 profile(role: "mentor") → Dashboard → 設備檢查
```

### Already Logged In

```
任意頁面 → 偵測 Firebase Auth 已登入且有 profile → 直接進 Dashboard → 設備檢查
```

### Edge Case: OAuth Done But No Profile

```
任意頁面 → 偵測 Firebase Auth 已登入但無 profile → 導回 /auth 角色選擇流程
```

## Auth Page (`/auth`)

- **第一步**: Google OAuth 登入按鈕（中性風格頁面）
- **第二步**: OAuth 完成後，若為新用戶，進入角色選擇流程（同頁面內切換狀態）

## Role Selection UI (New Users Only)

- **風格**: 中性設計，淺灰白底 (`#f5f5f5`)，不偏向老師或學生色系
- **佈局**: 置中卡片式，RWD 適配手機和電腦
- **內容**:
    1. Logo / Mentora 品牌標識
    2. 兩個角色選擇卡片（電腦並排，手機上下排列）
        - **學生卡片** — 圖示 + 「我是學生」+ 簡短描述
        - **老師卡片** — 圖示 + 「我是老師」+ 簡短描述
    3. 點擊老師卡片 → 展開 inline 輸入框要求驗證碼 → 驗證通過後建立 profile → Dashboard
    4. 點擊學生卡片 → 直接建立 profile → Dashboard

## Device Recommendation Modal

- **觸發位置**: `src/routes/dashboard/+page.svelte`（統一處理 mentor/student）
- **觸發時機**: 進入 Dashboard 時檢查，每個 browser session 只彈一次（用 `sessionStorage` 記錄已顯示）
- 透過 `navigator.userAgent` 或 `window.innerWidth` 判斷設備類型
- **設備不匹配時才顯示**（阻擋式 modal，需點「我知道了，繼續」才能繼續）:
    - 老師用手機 → 「建議使用電腦或平板以獲得最佳體驗」
    - 學生用電腦 → 「建議使用手機以獲得最佳體驗」
- 設備匹配時不顯示，直接進入 Dashboard
- **注意**: 登入前的頁面（auth、角色選擇）完整支援雙設備 RWD，不做設備限制

## Data Model Changes

### Firestore UserProfile

```typescript
// Remove
activeMode: "mentor" | "student";

// Add
role: "mentor" | "student"; // Set on create, immutable thereafter
```

### Firestore Rules

- `role` field: allow on `create` only, block on `update`
- Rule: `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role'])`

## Removed Features

- `switchActiveMode()` and `persistActiveMode()` functions
- Settings page "switch role" UI and verification modal
- localStorage `mentora:active-mode` cache mechanism
- `/api/verify-mentor` endpoint repurposed for pre-login verification

## Role Detection Changes

- `getProfileMode()` / `isMentorMode()` → read `profile.role` instead of `activeMode`
- No more localStorage fallback, read from Firestore profile only
- All references to `activeMode` replaced with `role`

## Token Verification

- Role selection page calls `/api/verify-mentor`（此時用戶已完成 Google OAuth，有 auth session）
- On success, frontend stores "mentor verified" state in memory
- 驗證通過後，建立 profile with `role: "mentor"`，設備檢查在進入 Dashboard 時才觸發

## RWD Strategy

### Mentor Interfaces: Desktop-first

- Base styles target desktop layout
- Use Tailwind `max-md:`, `max-lg:` variants for smaller screen adaptations
- Affected: `MentorDashboard`, `MentorLayout`, `MentorSettings`, `CourseSettings`, mentor course pages

### Student Interfaces: Mobile-first

- Current mobile-first design (Tailwind default `md:`, `lg:`) largely unchanged
- Ensure mobile experience is optimal

### Pre-login Pages

- Standard mobile-first Tailwind (both mobile and desktop should look good equally)

## Files to Modify

### Rewrite

| File                                       | Change                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/routes/auth/+page.svelte`             | Google OAuth → profile check → (new user) role selection → token verification → create profile |
| `src/lib/components/auth/LoginCard.svelte` | Simplify to pure OAuth trigger or remove                                                       |

### Modify

| File                                              | Change                                                     |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `packages/firebase/src/firestore/userProfiles.ts` | `activeMode` → `role`, remove switch functions             |
| `src/lib/features/routing/role.ts`                | Read `role`, remove localStorage logic                     |
| `src/lib/features/settings/actions.ts`            | Remove `switchActiveMode()`, `persistActiveMode()`         |
| `src/routes/settings/StudentSettings.svelte`      | Remove "switch role" button and verification modal         |
| `src/routes/settings/+page.svelte`                | `activeMode` → `role`                                      |
| `src/routes/dashboard/+page.svelte`               | `activeMode` → `role`                                      |
| `src/routes/api/verify-mentor/+server.ts`         | Adjust for pre-login verification                          |
| `packages/firebase/sync/firestore.rules`          | Add `role` field immutability rule                         |
| `messages/en.json`, `messages/zh-tw.json`         | Add i18n strings for role selection, device recommendation |
| All mentor components                             | RWD to desktop-first (`max-md:` strategy)                  |
