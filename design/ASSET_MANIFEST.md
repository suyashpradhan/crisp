# Crisp Asset Manifest

The final designs contain **no bitmap images, no exported SVG files and no icon-font glyphs.** Every mark in the product is either type, a CSS/RN-styled shape, or a gradient. Nothing below needs to be exported from a design tool.

---

## 1. Fonts — the only true external assets

| Asset | Type | Where used | Status |
|---|---|---|---|
| **Instrument Sans** (400, 500; italic available, unused) | Variable web font, Google Fonts | All UI: task titles, metadata, status, buttons, body, nav | **Font asset required.** Bundle `.ttf`/`.otf` for React Native; `@font-face` or the Google Fonts stylesheet on web. |
| **Instrument Serif** (400 only) | Web font, Google Fonts | Wordmark "crisp", empty-state and sheet headlines, all marketing headlines | **Font asset required.** |
| **JetBrains Mono** (300, 400) | Web font, Google Fonts | Section labels, session timer, reference numbers, mono micro-hints | **Font asset required.** |

Current loader (web): `https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400&display=swap`, with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`.

Fallbacks to declare: sans → `system-ui, -apple-system, Segoe UI, sans-serif`; serif → `Georgia, Times New Roman, serif`; mono → `ui-monospace, SFMono-Regular, Menlo, monospace`. Ship the three families with the app rather than fetching them — the wordmark is Instrument Serif, so a fallback is visible brand damage.

---

## 2. Logo / wordmark

| Asset | Type | Where used | Status |
|---|---|---|---|
| **crisp wordmark** | Live text, Instrument Serif 400, lowercase, `letter-spacing: −0.01em` | App header 21px, web rail 24px, landing header 26px, landing mobile 22px | **No asset required.** It is set text, not artwork. If a lockup, app icon or favicon is needed for store submission, that is a new asset the project does not currently contain. |

---

## 3. Icons — all CSS/RN shapes, no icon files

| Asset | Type | Where used | Status |
|---|---|---|---|
| **Microphone glyph** | Two composed shapes: a 9 × 17px bar with `border-radius: 5px`, above a 15 × 7px element with 1.6px bottom/left/right borders and `border-radius: 0 0 9px 9px` (the capsule and its stand). Web variant 8 × 14px + 13 × 6px at 1.5px | Idle recording button; landing hero mic | **No asset required.** Reproduce with two `View`s. If a vector is preferred, use a standard library mic at 18 × 24px optical size — but match this proportion: it is noticeably narrower than most stock mic icons. |
| **Stop glyph** | 17 × 17px square, `border-radius: 4px` (14px at 3.5px on web) | Recording button while a session is active | **No asset required.** |
| **Completion indicator** | 21px circle, 1.4px border; when checked the circle fills and reveals an 8px inner circle | Every permanent task row | **No asset required — and note there is no checkmark in this design.** Completion is a filled ring with a dot, not a tick. Do not substitute a check icon. |
| **Reference number ring** | 21px circle (23px web), 1px border, containing JetBrains Mono 10.5px `1`–`5` | Temporary session cards | **No asset required.** Type inside a bordered circle. |
| **Back / close affordance** | Live text — "Done", "Back", "Close", "Not now" | App header; all three sheets | **No asset required. There is no back chevron in the design.** Navigation is textual. |
| **Delete affordance** | Live text — "Delete task" | Edit sheet | **No asset required. No trash icon exists in the design.** |
| **Undo affordance** | Live text — "Undo" inside a pill | Delete and clear toasts | **No asset required. No undo arrow exists in the design.** |
| **Account / settings entry** | Live text rows — "Account", "Sync", "Voice", "Haptics", "Dusk while recording", "Privacy" | Settings sheet | **No asset required. The design contains no gear or avatar icon.** |
| **Status separator** | 3px circle | Between status text and the timer | **No asset required.** |
| **Error indicator** | 7px circle, `#A2988C` (permission) or `#E8894C` (transcription) | Inline error rows | **No asset required.** |
| **Provider marks — Apple / Google** | Text-only buttons: "Continue with Apple", "Continue with Google" | Sync / sign-in sheet | **Assets required at implementation time, not present in the design.** Both providers mandate their official marks in sign-in buttons — take them from Apple's and Google's official brand resources; do not redraw them. |

**Icon-library guidance.** The product needs at most two glyphs (mic, stop) and both are simpler as styled views than as a dependency. If a library is introduced anyway, use one consistently, match the proportions above, and do not let it introduce a checkmark, a chevron, a trash can or a gear where the design has type.

---

## 4. CSS/RN-generated visual elements — no assets

| Element | Construction | Where used |
|---|---|---|
| **Audio meter** | Nine 4.5px-wide views, `9999px` radius, heights 4 → 30px, 5px gaps, driven by amplitude | Dock, both platforms; static nine-bar version in the landing mobile layout |
| **Amplitude halo** | 118px circle (54px web), `radial-gradient(circle, rgba(232,137,76,0.26) 24%, transparent 70%)` | Behind the recording mic |
| **Breath ring** | 92px circle (64px web), 1px `#E8894C` border, animated scale/opacity | Near-silence state |
| **Ambient recording wash** | ~700 × 340px ellipse, `radial-gradient(ellipse at 50% 66–68%, glow, transparent 66–68%)` | Behind the dock while recording |
| **Mic gloss** | `inset: 1px`, `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 42%)` | Inside the recording button |
| **Dock scrim** | `linear-gradient(180deg, transparent 0%, <app background> 34%)` (44% web) | Behind the dock so list content dissolves |
| **Scroll fades** | `mask-image: linear-gradient(180deg, transparent 0, #000 14px, #000 74%, transparent 100%)`; board variant 16px / 82% | List and recording board. On React Native use a small gradient overlay in the app background colour |
| **Home indicator** | 118 × 4px, `9999px`, `#211E1B` at 12% | Mock only — replace with the real safe-area inset |
| **Sheet scrim** | `rgba(24,20,16,0.26)` | Behind edit, settings and sync sheets |
| **Chips, pills, toasts** | Bordered / filled views at `9999px` | Edit sheet, toasts, CTAs |

---

## 5. Landing-page assets

| Asset | Type | Where used | Status |
|---|---|---|---|
| **Hero product demo** | A live, looping instance of the real UI inside a 390 × 800 frame — not a video, not a screenshot | Landing hero | **No asset required.** It is the product rendering itself. If a static poster frame is ever needed for OG/social, export the committed state; none exists today. |
| **Phone presentation frame** | A styled container: 46px radius, `#F6F1EA` fill, `0 30px 70px -40px rgba(40,28,20,0.35)` + `0 0 0 1px rgba(40,28,20,0.06)` | Landing hero | **No asset required.** No device bezel image, notch, or hardware art is used anywhere. |
| **Dusk still (mobile layout)** | Hand-built static markup: two numbered cards, "Listening…", a nine-bar meter at fixed heights, an 80px ember mic | Landing mobile section | **No asset required.** |
| **Section rules and swatches** | 1px `#DED5CB` lines; 34 × 34px colour blocks at 9px radius (spec sheet) | Landing, spec | **No asset required.** |
| **Photography / illustration / 3D / screenshots** | — | — | **None exists in the design and none is needed.** The demo is the marketing. |
| **App store screenshots, OG image, favicon, app icon** | — | — | **Not present in the current design.** Genuinely new assets if required for launch. |

---

## 6. Sound and haptics

| Asset | Type | Status |
|---|---|---|
| **Audio cues** | — | **None. The product is deliberately silent** — no start tone, no beep, no confirmation chime. Nothing to source. |
| **Haptics** | Platform APIs | **No asset required.** Impact on record start and stop; selection tick on task completion and delete. |

---

## 7. Summary

Required to reproduce the design: **three font families.** Required at implementation time but absent from the design: **the official Apple and Google sign-in marks.** Genuinely new work if launch demands it: **app icon, favicon, store screenshots, OG image.**

Everything else in Crisp — every icon, ring, bar, halo, wash, frame, gloss and gradient — is generated from styles. **No asset required.**
