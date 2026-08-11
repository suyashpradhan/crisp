# Crisp Responsive Specification

One product on iOS, Android and Web. Breakpoints change **spacing, column width and where navigation lives** — never the feature set, never the interaction, never the component tree. There are no desktop-only features and no mobile-only compromises.

---

## 1. Phone

**Reference viewport used by the designs: 390 × 844** (the landing hero uses 390 × 800). All fixed pixel values in the handoff are authored at this width.

**Horizontal padding** 24px on the content region and the dock. The recording board insets to 22px so its cards, once offset, optically align with the 24px text column.

**Max content width** none — the column is the viewport minus 24px gutters. Task titles wrap to a second line rather than truncating.

**Vertical structure**
- Header band 58px, fixed. Wordmark left, one text affordance right ("Done" / "Back").
- Content region `top: 58px → bottom: 0`, scrolls, 6px inner top padding, 210px bottom padding so the last row clears the dock.
- Recording board `top: 52px → bottom: 196px`, scrolls independently, padding `16px 22px 8px`.
- Dock pinned to the bottom, `z-index: 8`, padding `0 24px 30px`, column gap 14px.

**Recording control location** horizontally centred in the dock, 30px above the bottom edge plus the safe-area inset — inside comfortable one-handed reach on a 6.1" phone. The mic is the only control the product requires while recording; nothing else needs to be hit, and no gesture is needed at all.

**Safe-area treatment** add `env(safe-area-inset-bottom)` to the dock's 30px padding; the 118 × 4px home indicator in the design is a mock and must be replaced by the real inset. Add `env(safe-area-inset-top)` above the 58px header. Left/right insets apply in landscape.

**Scrolling** two independent scroll regions, never both at once: the permanent list (idle) and the recording board (session). Both use a top/bottom mask (`transparent → #000 14px → #000 74% → transparent`; the board uses 16px / 82%) so content dissolves rather than clipping at a hard edge. The header and dock never scroll. Momentum scrolling, no pull-to-refresh, no sticky sub-headers.

**Keyboard** represented only in the edit sheet, whose 22px underlined title input takes focus on open. The sheet must translate up by the keyboard height; the scrim stays. The keyboard is never involved in a voice session — if it is visible when the mic is tapped, dismiss it as part of the 340ms environment change.

**Orientation** portrait is the design target. In landscape, keep the dock pinned and let the content region shrink; do not move the mic to a side.

**Density / text size** honour the OS text-size setting. Rows grow to two lines; the 58px header and the dock's fixed heights hold, with status copy wrapping to a second line rather than clipping.

---

## 2. Tablet

**Not explicitly designed.** Derive the minimum adaptation from the phone and web layouts without adding anything.

- **What stays constrained:** the task column at **660px**, centred. Type scale, row height, card radius, mic size, meter geometry, gutters (26px) and every timing value stay exactly as authored — a tablet is not a small desktop and not a large phone.
- **What stretches:** the canvas around the column, which takes `color.canvas.light` (`#1B1713` while recording) so the workspace still reads as a distinct plane.
- **Navigation:** the web header row (wordmark left, three text items right), not the 212px rail — a rail at this width would steal focus from the column.
- **Recording control:** the web dock pill, centred over the column and pinned to the bottom, since a tablet is not held one-handed. Keep the 54px control.
- **Recording width:** allow the same proportional widening, 660 → 720px.
- Do **not** add a second column, a split view, a sidebar, or any feature that only exists here.

---

## 3. Desktop Web

**Outer canvas** `#EFE9E1` (`#1B1713` recording) — full bleed, no max width, no pattern, no illustration.

**Central workspace** `#F6F1EA` (`#15120F` recording), **max-width 712px**, centred in the space remaining after the rail. Separation from the canvas is **tonal only** — no shadow, no border, no rounded corners. It must not read as a white card floating in a browser.

**Task-list width** the full workspace column minus 46px gutters (~620px of text). Rows put the title left and the time right on the same baseline, `−12px` horizontal margin so the hover background bleeds past the text.

**Recording workspace width** **788px** — a ~76px widening over 550ms, returning on commit. The extra width is breathing room for the session, not more content.

**Rail** present at **≥1000px**: 212px wide, 30px/26px padding, `1px rgba(0,0,0,0.06)` right edge, sticky full height. Contents: the wordmark and exactly three items — **Today, Later, Done**. No counts, no icons, no sections, no add button, no settings link, no search. Opacity `0` while recording.

**Header behaviour** there is no desktop header. Below 1000px the wordmark and the three nav items become a single row above the list, and it scrolls away with the content.

**Microphone position** fixed dock pill at the bottom, offset left by the rail width (`left: 212px; right: 0`) so it centres over the column, 32px above the bottom. Always visible, never behind content — it sits on a `transparent → app background 44%` gradient. Contents in order: status text, timer, meter (0 → 80px), 54px control. A mono hint sits below: "PRESS SPACE TO START" / "ESC TO STOP · NOTHING IS SAVED UNTIL YOU DO".

**Keyboard** `Space` (from the document body) starts and stops a session; `Esc` stops one. Visible focus ring on everything, `2px #A85A2C` / `2px #E8894C` in Dusk.

**Scrolling** the page scrolls; the rail is sticky at full viewport height and the dock is fixed. One scroll region only, with a 200px bottom padding so the last row clears the dock.

**Use of empty space** above 1440px the rail and the column hold their widths and the surplus becomes canvas. **Never** add a third column, an inspector, a calendar, projects, filters, tags, priorities, a dashboard, or a chat panel. The empty space is the product's confidence, not an opportunity.

---

## 4. Breakpoints

| Breakpoint | What changes |
|---|---|
| **< 480px** (phone, reference 390) | 24px gutters. Title 16.5px, metadata 13px. Mic 72px, centred, 30px + safe area above the bottom. 58px header with one text affordance. Session card padding 14/16px, radius 15px, offset formula `dir × (8 − (i mod 3) × 4)`. Meter 9 × 4.5px bars, 5px gaps, 30px container. |
| **480 – 999px** (large phone / small tablet) | Gutters 26px. Column max **660px**, centred, canvas visible either side. Navigation becomes the header row (wordmark + three text items). Dock becomes the pill, centred over the column. Type scale unchanged. |
| **≥ 1000px** (desktop) | Rail appears at 212px; header row disappears. Column **712px**, padding `34px 40px 0` → `34px 46px 0` while recording. Titles step up to 18px, metadata 14px and moves to the right of the row on the same baseline. Rows gain a 10px hover pill. Dock offsets left by 212px; control 54px; meter animates 0 → 80px. Recording column widens to **788px**. |
| **≥ 1440px** (wide desktop) | Nothing changes structurally. Rail and column hold their widths; extra space becomes canvas. No new region is introduced. |
| **Landing ~900px** | The hero's two columns (`1 1 430px` + `1 1 390px` with 56px gap) wrap to one column; the phone demo keeps its full 390 × 800 size; the three feature columns reflow from three to two to one; gutters 40px → 26px; hero headline follows `clamp(52px, 6.2vw, 88px)` continuously. |

Implement these as spacing and layout changes on a single component tree. Do not fork components per breakpoint: `TaskRow` at 390px and at 1440px is the same component with different tokens.

---

## 5. Shared experience rule

These must be **identical in behaviour, wording and timing** on iOS, Android and Web. Only pixel scale and where navigation lives may differ.

| Behaviour | Contract on every platform |
|---|---|
| **Record** | One tap on the mic starts recording immediately. Never hold-to-talk. Web adds `Space` as an equivalent, not a replacement. |
| **Stop** | One tap stops and commits immediately. No Review, Confirm, Save or summary screen exists anywhere. Web adds `Esc`. |
| **Temporary session** | Items created while recording are session-scoped and are not persisted. The permanent list recedes to 5–6% and is non-interactive. Voice may only manipulate items from the current session. |
| **Task creation** | One spoken phrase → one card, ~260ms after the phrase resolves, entering with the same 440ms motion. |
| **Task correction** | Only the changed field animates; the card keeps its identity; no duplicate is created; no toast; recording is not interrupted. |
| **Task deletion** | Ordinal reference ("the second one", "the last one") deletes without confirmation; neighbours close by layout; Undo for 4.2s. |
| **Clear** | All cards leave on a 45ms stagger; `Cleared · Undo` for 5s; **the session keeps recording.** |
| **Undo** | Available by tap and by voice; restores via the identical entry motion; toast `Restored`, no action. |
| **Commit** | Offsets resolve, numbers scale out, card chrome dissolves, environment returns to light, rows land on a 26ms stagger, `3 added` for 2.2s. No user action. |
| **Silence** | 5s → meter at rest and breath ring. ~4.2s of near-silence → softened copy. ~30s → auto-commit. No countdown on any platform. |
| **Today / Later** | Two sections in that order on the home surface; Later is a section and a filter, never a second information architecture. |
| **Complete** | Ring toggles, row drops to 58% with a strike; reached from the header/rail, never occupying home. |
| **Environment** | Light while organizing, Dusk while recording, 340ms between them — derived from state on every platform, and never exposed as a theme setting. |
| **Empty state** | "Nothing here yet." / "Tap and say one thing. Or ten." plus the mic. Identical copy everywhere; no onboarding carousel on any platform. |
| **Errors** | Inline, one line plus one action, never a modal, never red text. |
