# Mobile polish — PDF preview, dashboard, blank flash

Five focused fixes. No business logic changes.

## 1. PDF preview cuts off on mobile

**File:** `src/routes/_app.verifications.report.tsx` + `src/styles.css`

**Cause:** `viewportRef.clientWidth` is measured *before* the page's horizontal padding is subtracted, and the parent `main` has `p-4` (16px) on mobile. A4 width (794px) ÷ measured width gives a scale that is still slightly larger than the actual visible area, so the right edge clips.

**Fix (no horizontal scroll — true responsive fit):**
- Wrap the `viewportRef` in an extra `overflow-hidden` container with `w-full` and zero horizontal padding on mobile.
- Compute scale from `getBoundingClientRect().width` of the inner wrapper (post-padding), with a 4px safety margin: `scale = (w - 4) / 794`.
- Apply `transform-origin: top left` (already set) and set the scaled wrapper's `height` to `A4_PX * scale * pageCount + gaps` so vertical space collapses correctly and the page doesn't reserve unused width.
- On screens < 480px, drop the page's outer card padding to 8px so the A4 sheet uses the full viewport.

Result: full A4 page visible, no horizontal scroll, no clipping. Download/print logic untouched (it resets scale to 1 before capture).

## 2. "Good morning, Rahul" → real user name

**File:** `src/routes/_app.dashboard.tsx` (line 106)

Replace hardcoded "Rahul" with the logged-in user's first name, pulled from `Route.useRouteContext().user` (already provided by `_app.tsx`). Use `user.user_metadata.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there"`.

## 3. Remove "Today's Schedule" card

**File:** `src/routes/_app.dashboard.tsx` (around line 219)

Delete the entire Today's Schedule card block (the three dummy time entries). Keep Cases Overview card. Adjust the surrounding grid so Cases Overview spans full width on its row (or collapses cleanly).

## 4. Notification bell red dot

**File:** `src/routes/_app.tsx` (lines ~200-205)

Remove the red dot `<span>` for now. Keep the bell icon as a passive placeholder (no click handler change). When manager-approval notifications ship in a later phase, the dot will be re-added driven by real unread count.

## 5. Mobile blank-screen flash after login

**Cause:** `CaseSyncProvider` renders `"Loading your cases…"` as a full-block replacement while `query.isLoading && !isHydrated`. On mobile, the brief gap between hydration and the first query response shows as a blank/loading screen covering the whole `<main>`.

**Fix:** In `src/lib/case-sync-provider.tsx`, render `children` immediately and show the loading text as a subtle top-right toast/inline indicator only — never block the dashboard mount. The dashboard's own data (from the Zustand store) renders fine with empty/initial state during the brief sync.

## Files touched
- `src/routes/_app.verifications.report.tsx`
- `src/styles.css`
- `src/routes/_app.dashboard.tsx`
- `src/routes/_app.tsx`
- `src/lib/case-sync-provider.tsx`

## Not touched
PDF generation logic, pagination, signature placement, summary tables, store schema, auth, all module pages.

## Order
1 → 2 → 3 → 4 → 5 (one batch, verify on mobile viewport after).
