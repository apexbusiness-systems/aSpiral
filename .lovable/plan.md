

# Breakthrough Gallery Page + E2E Verification

## 1. New Page: `/breakthroughs` — Breakthrough Gallery

Create `src/pages/Breakthroughs.tsx` with:

- **Data fetching**: Query `breakthroughs` table joined with session metadata, ordered by `achieved_at DESC`
- **Filtering**:
  - Date range filter using a date picker (Popover + Calendar component)
  - Text search across friction/grease/insight fields (client-side filter)
- **Card layout**: Grid of breakthrough cards showing friction/grease/insight with date, session link, and share/export actions
- **Empty state**: Encouraging message with CTA to start a session
- **Streak badge**: Same flame badge from Sessions page

## 2. Route Registration

Add `/breakthroughs` route in `App.tsx` as a protected lazy-loaded route.

## 3. Navigation

Add a link to the breakthrough gallery from the Sessions page header (e.g., "View Breakthroughs" button).

## 4. E2E Verification

After implementation, use browser tools to:
1. Verify landing page loads cleanly
2. Navigate to `/breakthroughs` and confirm it renders
3. Check Sessions page still works with streak badge

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Breakthroughs.tsx` | Create — gallery page with filters |
| `src/App.tsx` | Add lazy import + protected route |
| `src/pages/Sessions.tsx` | Add navigation link to breakthroughs |

## Technical Details

- Reuse existing `exportBreakthroughCard` from `pdfExport.ts` for sharing
- Use `@radix-ui/react-popover` + `Calendar` for date filtering (following shadcn datepicker pattern with `pointer-events-auto`)
- Client-side text search filter (no need for server-side search given typical breakthrough volume)
- Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop

