# Crisp Design Handoff

Source of truth: `Crisp Dusk.dc.html` (mobile, 22 states), `Crisp Web.dc.html` (6 states), `Crisp Landing.dc.html` (marketing), `Crisp Spec.dc.html` (token sheet). All values below are read from those files. Where a value is computed at runtime the formula is given.

---

## 1. Design philosophy

**Two environments, one gesture.** Crisp has exactly two visual environments and the app moves between them automatically. The theme is *derived from recording state* — it is never a user preference and there is no theme switch anywhere in the product.

**Light — organize.** Warm parchment, not white. Canvas `#EFE9E1`, app surface `#F6F1EA`, warm charcoal ink `#211E1B`. Permanent task rows sit directly on the app background: no card, no border, no shadow, no divider. Hierarchy is carried entirely by type scale (16.5px title / 13px metadata) and by whitespace (26px between sections, 11px vertical row padding). One mono section label per group is the only chrome.

**Dusk — think out loud.** The moment the mic is tapped the whole surface crosses to deep warm ink `#15120F` with ember `#E8894C`. Navigation opacity goes to `0` — not dimmed, gone. The permanent list drops to `5%` and becomes atmosphere rather than content. Temporary cards are flat `#201C17` with a single `1px #2B251F` hairline and **no shadow at all** — dark surfaces separate tonally.

**Density.** Deliberately low in light, deliberately focused in Dusk. A populated Today of 5 rows occupies roughly half the viewport. The design was checked at 18 tasks: nothing gains a container as the list grows.

**Interaction tone.** Quiet and fast. Nothing exceeds 560ms. No modal exists in the product. No confirmation is ever requested. No toast celebrates success — the only toasts are `Deleted`, `Cleared`, `Restored`, `3 added`, and each is one word plus an optional inline Undo.

**Colour discipline.** Ember appears only where speech is happening: the mic while recording, its halo, the nine audio bars, the ambient wash under the lower third, and the surface of a card that was just created or corrected. Idle is fully neutral — completed rings, toasts and chips are charcoal, never accent.

**The principle, as built:**
- **Idle = calm** — parchment, no accent, no elevation on rows.
- **Recording = alive** — ink environment, ember, real amplitude, numbered cards.
- **Finished = organized** — offsets resolve to zero, numbers scale out, cards dissolve into rows.

---

## 2. Exact color tokens

### Light environment — organize

| Token | Hex | Used for |
|---|---|---|
| `color.canvas.light` | `#EFE9E1` | Outer canvas; web gutters; desk tone behind the workspace; landing mobile-section background |
| `color.surface.light` | `#F6F1EA` | App background — the plane permanent rows live on; sheet backgrounds; phone frame fill |
| `color.surface.raised.light` | `#FFFDF9` | Bottom sheets (edit), web dock, toast on web. **Never** a task row |
| `color.text.primary.light` | `#211E1B` | Task titles, headlines, filled completion rings, mobile toast fill. 14.6:1 on `#F6F1EA` |
| `color.text.secondary.light` | `#766E65` | Body copy, status text, sheet copy, section body. 5.1:1 |
| `color.text.tertiary.light` | `#A2988C` | Times/metadata, mono section labels, unchecked ring stroke. 3.1:1 |
| `color.border.light` | `#DED5CB` | Hairlines, sheet borders, chip outlines, session-card border, landing section rules |
| `color.text.body.landing` | `#5A5249` | Landing paragraph copy and spec body only |
| `color.text.quaternary` | `#B9AFA3` | Landing/rail micro-labels, mono hints |
| `color.hairline.spec` | `#E4DCD2` | Table row rules in the spec sheet only |

### Dusk / recording environment — think out loud

| Token | Hex | Used for |
|---|---|---|
| `color.canvas.recording` | `#1B1713` | Outer canvas behind the workspace while recording |
| `color.surface.recording` | `#15120F` | Recording environment background (app plane) |
| `color.surface.raised.recording` | `#201C17` | Temporary session cards; web dock while recording |
| `color.text.primary.recording` | `#F4EEE4` | Temporary task titles. 13.9:1 on `#15120F` |
| `color.text.secondary.recording` | `#9A8F82` | Card metadata, recording status, current utterance. 5.2:1 |
| `color.text.tertiary.recording` | `#6C6358` | Temporary reference numbers, session timer |
| `color.border.recording` | `#2B251F` | Session-card hairline — replaces all shadow in Dusk |

### Brand and state

| Token | Hex / value | Used for |
|---|---|---|
| `color.brand.primary` | `#E8894C` | Mic fill while recording, halo, all nine audio bars, ember hairline on a just-changed card, web Undo pill fill. 8.6:1 on `#15120F` |
| `color.brand.primary.light` | `#A85A2C` | Light-environment brand: landing CTAs, focus ring, marketing accents. 4.8:1 on `#F6F1EA` |
| `color.brand.soft.light` | `#FCF2E9` | Surface of a card created/corrected in the last 1.6s (light) |
| `color.brand.soft.recording` | `#291F18` | Surface of a card created/corrected in the last 1.6s (Dusk) |
| `color.brand.wash.light` | `rgba(224,138,74,0.18)` | 900ms bloom behind a corrected metadata field (light) |
| `color.brand.wash.recording` | `rgba(232,137,76,0.24)` | 900ms bloom behind a corrected metadata field (Dusk) |
| `color.brand.glow.light` | `rgba(224,138,74,0.18)` | Radial ambient wash under the lower third; mic halo (light) |
| `color.brand.glow.recording` | `rgba(232,137,76,0.26)` | Radial ambient wash and mic halo (Dusk) |
| `color.on.brand` / `color.on.ink` | `#15120F` (Dusk) / `#FDFBF7` (light) | Glyph fill inside the mic; label on a filled charcoal button |
| `color.success` | `#5C6B4A` | "3 added" indicator dot, sync confirmed. Documented in the spec sheet; the shipped toast is text-only |
| `color.error` | `#9A4433` | Permission-denied indicator dot only. Error **text is never coloured** |
| `color.warning` | `#E8894C` | Transcription-failure indicator dot (reuses ember) |

### Overlay / scrim

| Token | Value | Used for |
|---|---|---|
| `color.scrim` | `rgba(24,20,16,0.26)` | Behind edit / settings / sync sheets |
| `color.row.hover.web` | `rgba(33,30,27,0.03)` | Web task-row hover only |
| `color.nav.selected` | `rgba(33,30,27,0.05)` light / `rgba(255,255,255,0.06)` Dusk | Selected nav item background |

---

## 3. Typography tokens

**Three imported families (Google Fonts), no system fonts in the type system.**

- `font.sans` — **Instrument Sans**, fallbacks `system-ui, -apple-system, Segoe UI, sans-serif`. Weights 400, 500. Carries the entire product UI.
- `font.serif` — **Instrument Serif**, fallbacks `Georgia, Times New Roman, serif`. Weight 400 only. Used **only** for the wordmark, empty-state headlines, sheet headlines and marketing headlines.
- `font.mono` — **JetBrains Mono**, fallbacks `ui-monospace, SFMono-Regular, Menlo, monospace`. Weights 300, 400. Used **only** for section labels, timers, reference numbers and micro-hints.

`-webkit-font-smoothing: antialiased` is set on `body`.

| Role | Family | Weight | Size | Line height | Letter spacing | Transform | Usage |
|---|---|---|---|---|---|---|---|
| `type.brand` | serif | 400 | 21px mobile / 24px web / 26px landing | 1.1 | −0.01em | none | "crisp" wordmark in header and rail |
| `type.pageTitle` | serif | 400 | 27px | 1.1 | −0.015em | none | Sheet titles ("Settings") |
| `type.sectionLabel` | mono | 400 | 10px mobile / 10.5px web | 1.2 | 0.15em (0.16em web) | uppercase | TODAY / LATER / COMPLETED TODAY |
| `type.taskTitle` | sans | 400 | 16.5px mobile / 18px web | 1.28 / 1.3 | −0.011em / −0.012em | none | Permanent task title |
| `type.taskMeta` | sans | 400 | 13px mobile / 14px web | 1.35 | 0.004em | none | Time / day under or beside a title |
| `type.sessionTitle` | sans | 400 | 16.5px mobile / 18px web | 1.28 | −0.011em | none | Temporary task title (identical scale to permanent — only colour and surface differ) |
| `type.sessionMeta` | sans | 400 | 13px mobile / 14px web | 1.35 | 0.004em | none | Temporary task metadata; the field that animates on correction |
| `type.sessionNumber` | mono | 400 | 10.5px / 11px web | 1 | 0 | none | Temporary reference number inside a 21px (23px web) ring |
| `type.recordingStatus` | sans | 400 | 13px mobile / 14.5px web | 1.3 | −0.004em | none | "Listening…", "Still listening · we can barely hear you", "Saving" |
| `type.timer` | mono | 400 | 12.5px / 13px web | 1 | 0, `font-variant-numeric: tabular-nums` | none | `00:18` session elapsed |
| `type.transcript` | sans | 400 | 15px mobile / 16px web | 1.4 | −0.006em | none | Current unresolved utterance, wrapped in typographic quotes, centred above the mic |
| `type.button` | sans | 500 | 15.5px (sheet) / 12.5–13.5px (inline) / 16px (landing CTA) | 1 | −0.005em | none | Filled and outlined buttons |
| `type.toast` | sans | 400 | 13.5px mobile / 14px web | 1.2 | −0.005em | none | Deleted / Cleared / Restored / 3 added |
| `type.emptyHeadline` | serif | 400 | 37px mobile / 46px web | 1.06 / 1.05 | −0.015em / −0.02em | none | "Nothing here yet." |
| `type.emptyBody` | sans | 400 | 16px mobile / 17px web | 1.45 | 0 | none | "Tap and say one thing. Or ten." |
| `type.errorTitle` | sans | 400 | 14.5px | 1.3 | −0.008em | none | "Crisp can't hear you" / "Still listening — interpretation paused" |
| `type.errorBody` | sans | 400 | 13px | 1.42 | 0 | none | One line of help beneath an error title |
| `type.navItem` | sans | 400 (500 when selected) | 15px rail / 14.5px header | 1.2 | −0.008em | none | Today / Later / Done |
| `type.settingsRow` | sans | 400 | 16.5px key / 14px value | 1.3 | −0.011em / 0 | none | Settings sheet rows |
| `type.landingHero` | serif | 400 | `clamp(52px, 6.2vw, 88px)`; 47px on the mobile layout | 0.98 | −0.025em | none | "Talk through your day." |
| `type.landingBody` | sans | 400 | 19px desktop / 16.5px mobile | 1.5 / 1.48 | 0 | none | Hero supporting copy |
| `type.landingSectionTitle` | serif | 400 | 29px | 1.12 | −0.015em | none | "Talk naturally." / "Change your mind." / "Your tasks fall into place." |
| `type.landingClosing` | serif | 400 | `clamp(34px, 4vw, 54px)` | 1.05 | −0.02em | none | Closing statement above the final CTA |
| `type.microHint` | mono | 400 | 10–10.5px | 1.2 | 0.1–0.14em | uppercase | "iOS · Android · Web", "press space to start", rail group labels |

`text-wrap: pretty` is applied to all multi-line paragraph copy.

---

## 4. Spacing system

Base unit 4px.

| Token | Value |
|---|---|
| `space.1` | 4px |
| `space.2` | 8px |
| `space.3` | 12px |
| `space.4` | 16px |
| `space.6` | 24px |
| `space.8` | 32px |
| `space.12` | 48px |
| `space.16` | 64px |

Sub-token values that appear in the design and should be preserved verbatim: `2px`, `3px`, `5px`, `6px`, `9px`, `11px`, `13px`, `14px`, `18px`, `21px`, `22px`, `26px`, `30px`, `34px`, `40px`, `44px`, `46px`.

**Applied spacing**

- **Screen horizontal padding** — 24px mobile (`space.6`); 40px web narrow → 46px web wide; 40px landing gutter.
- **Section spacing** — 26px between a section's last row and the next mono label (mobile); 40px web; 64px landing block rhythm; 74–84px landing section padding-top/bottom.
- **Section label → first row** — 9px mobile, 12px web.
- **Task row vertical spacing** — 11px top and bottom padding, no divider (mobile) → 22px between adjacent row baselines. Web: 12px padding, `−12px` horizontal margin so the hover background bleeds past the text.
- **Row internal** — 13px ring-to-text gap mobile, 16px web; 2px title-to-metadata gap mobile, baseline-aligned inline on web.
- **Session card padding** — 14px vertical / 16px horizontal mobile and landing; 17px / 20px web. Collapses to `11px 2px` (mobile) and `13px 0` (web) during settle.
- **Session card gap** — 11px mobile, 12px web (animated to 0 on delete).
- **Recording board inset** — mobile `top:52px`, `bottom:196px`, padding `16px 22px 8px`. Web: overlays the list region at `inset: 0 −6px auto −6px`.
- **Recording control spacing** — dock column gap 14px (mobile), 13px (web). Meter block height 30px; meter-to-mic gap 14px. Mic well 132×112px mobile.
- **Bottom safe-area spacing** — dock padding-bottom 30px mobile (home indicator 118×4px sits inside it, `#211E1B` at 12% opacity); 32px web. Add the platform inset on top of these values.
- **Mobile top spacing** — 58px header band; list starts at 58px with 6px inner padding; scroll mask fades over the first 14px.
- **Desktop content spacing** — rail 212px wide with 30px/26px padding; workspace padding `34px 46px 0` while recording, `34px 40px 0` idle; dock fixed with `110px` top padding so its gradient covers the list tail.
- **Sheet padding** — 22–30px horizontal, 34px bottom, 18–22px internal gaps.

---

## 5. Radius system

| Element | Radius |
|---|---|
| Temporary session card | 15px mobile & landing / 16px web |
| Permanent task row | none — rows have no background box (web hover pill is 10px) |
| Recording button | **circle — `border-radius: 9999px`**, 72px idle → 80px recording (54px on the web dock) |
| Completion ring / reference-number ring | **circle — `9999px`**, 21px mobile / 22–23px web |
| Audio bar | `9999px` (pill), 4.5px wide |
| Halo, breath ring, ambient wash | **circle / ellipse — `9999px`** |
| Bottom sheets | `26px 26px 46px 46px` — the bottom radii match the phone frame so the sheet reads as inset |
| Secondary buttons, chips, toasts, pills, nav CTA | `9999px` |
| Stacked auth buttons (sync sheet) | 14px |
| Text input (edit sheet) | 0 — the title field is an underline only (`1px #DED5CB` bottom border) |
| Web nav item | 8px |
| Desktop surfaces (rail, workspace column) | 0 — separation is tonal, never a rounded floating card |
| Phone presentation frame | 46px (presentation only, not product chrome) |
| Landing mobile-layout card | 28px, inner Dusk still `26px 26px 0 0` |
| Spec swatch | 9px |

---

## 6. Borders and shadows

**Permanent task rows have no card, no border and no shadow, in either environment.** They sit directly on the app background. Do not add elevation.

**There are no dividers anywhere in the product.** Whitespace plus the mono section label carries structure.

### Borders

| Element | Width | Colour |
|---|---|---|
| Session card, light | 1px | `#DED5CB` |
| Session card, Dusk | 1px | `#2B251F` |
| Session card, just created/corrected (≤1.6s) | 1px | `#E8894C` |
| Completion ring, unchecked | 1.4px | `#A2988C` light / `#6C6358` Dusk |
| Completion ring, checked | 1.4px | `#211E1B` light / `#F4EEE4` Dusk, fill matches |
| Reference-number ring | 1px | `#DED5CB` light / `#2B251F` Dusk |
| Breath ring (near-silence) | 1px | `#E8894C`, 92px diameter mobile / 64px web |
| Sheet / error row / outlined button | 1px | `#DED5CB` |
| Text input underline | 1px | `#DED5CB` |
| Web dock pill | 1px | `#E2DACF` idle / `#2B251F` recording |
| Rail edge | 1px | `rgba(0,0,0,0.06)` |
| Landing section rules | 1px | `#DED5CB` |
| Spec table rules | 1px | `#E4DCD2` |

### Shadows — four in the entire product

| Element | Value |
|---|---|
| Session card, light | `0 4px 14px -10px rgba(40,28,20,0.20)` |
| Session card, Dusk | **none** — hairline only |
| Mic, idle | `0 6px 18px -10px rgba(40,28,20,0.34)` |
| Mic, recording | `0 12px 34px -10px rgba(232,137,76,0.50)` |
| Edit sheet | `0 -18px 50px -22px rgba(40,28,20,0.34)`. Settings and sync sheets carry **no** shadow |
| Web dock | none — 1px border only |
| Landing CTA | `0 2px 3px rgba(40,28,20,0.10), 0 14px 30px -16px rgba(40,28,20,0.55)` |
| Phone presentation frame | `0 30px 70px -40px rgba(40,28,20,0.35), 0 0 0 1px rgba(40,28,20,0.06)` — presentation only |

**Gloss.** The mic carries one inset highlight: `inset: 1px`, `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 42%)`.

**Scroll masks** (not shadows, but part of the surface treatment): list `-webkit-mask-image: linear-gradient(180deg, transparent 0, #000 14px, #000 74%, transparent 100%)`; recording board `transparent 0, #000 16px, #000 82%, transparent 100%`. The dock sits on `linear-gradient(180deg, transparent 0%, <app bg> 34%)` (44% on web).

---

## 7. Screen specifications

Reference mobile viewport **390 × 844**. All mobile screens share one shell:

```
[header band 58px]        wordmark left · "Done"/"Back" right · 24px gutter
[content region]          top 58px → bottom 0, 24px gutter, 6px inner top pad
[recording board]         absolute, top 52px → bottom 196px, 22px gutter (recording only)
[dock]                    absolute bottom, 24px gutter, 30px bottom pad, z-index 8
  ├ error row (conditional)
  ├ toast (conditional)
  ├ current utterance (height animates 0 ↔ 44px)
  ├ status + timer (17px row)
  ├ audio meter (30px)
  ├ mic well (132 × 112)
  └ home indicator (118 × 4)
```

Header and dock are **fixed**. The content region and the recording board each scroll independently with their own mask. Backgrounds: header/dock/content all `color.surface.light` in light, `color.surface.recording` in Dusk.

### 01 Empty Today
No sections. A 520px block, vertically centred with 60px bottom offset: serif 37px "Nothing here yet." then 16px `#766E65` "Tap and say one thing. Or ten." (max-width 250px). Header and dock present, mic idle. No illustration, no carousel, no dismiss.

### 02 Populated Today
Sections `TODAY` then `LATER`, in that order, both visible on one screen. Rows: 21px ring (2px top offset) + title + optional metadata; metadata row collapses to `0px` height when absent. 26px between sections. Scrolls with a 210px bottom pad so the last row clears the dock. Tap a row → edit sheet; tap the ring → complete.

### 03 Later
Identical rows, filtered to `bucket === 'later'`, single `LATER` section. Reached from the rail/nav; not a separate information architecture.

### 04 Completed
Reached from the header's "Done" affordance (label toggles to "Back"), never occupying home. Section `COMPLETED TODAY`. Rows at 58% opacity, ring filled `#211E1B` with an 8px `#F6F1EA` dot, title `#766E65` with `line-through` in `#A2988C`. Empty variant: centred 15px "Nothing finished yet today."

### 05 Recording just started
Environment has crossed to Dusk. Header chrome opacity `0`. Permanent list at `5%` opacity, `scale(0.985)`, `translateY(−10px)`, `saturate(0.5)`. Board mounted and empty, showing one 14.5px `#9A8F82` line: "Listening. Say anything — one thing or ten." Mic 80px ember with stop glyph. Meter at rest. Ambient wash at full. Timer running.

### 06 Recording with live audio activity
As 05 plus 1–2 temporary cards and the meter responding. Halo scaled by amplitude.

### 07 First temporary task
One card: ring-boxed number `1`, title, metadata. Card offset `−8px` horizontally. Surface `#291F18` with an ember hairline for the first 1.6s, then `#201C17` / `#2B251F`.

### 08 Five temporary tasks
Five cards, alternating offsets — computed as `dir × (offset − (i mod 3) × 4)` where `dir = −1` for even index, `+1` for odd, and `offset` is the `organicOffset` token (default **8px**, exposed as a tweak with range 0–20px). At the default this yields `−8, +4, 0, +8, −4, 0…`. Web uses `dir × (10 − (i mod 3) × 3)` → range 4–10px. Cards never break the left reading edge enough to affect scanability. **Not** chat bubbles: full-width cards with a leading number, not tapered speech shapes.

### 09 Spoken correction
Card retains identity; only the metadata field changes. Old value and new value are stacked in an 18px-high relative box; a wash ellipse sits behind them. Card surface warms to `#291F18` and its border to `#E8894C` for 1.6s. No badge, no "Updated" label, no toast, and recording is not interrupted.

### 10 Spoken delete
Target card collapses its own `max-height` 120→0 and `margin-bottom` 11→0, so neighbours close the gap by their own animation rather than a jump. Toast `Deleted · Undo` for 4.2s. No confirmation.

### 11 Clear session
All cards run the delete motion on a 45ms per-card stagger. Toast `Cleared · Undo` for 5s. **The session keeps recording** — status stays "Listening…", the timer keeps running, and new speech creates new cards.

### 12 Undo
Restored cards replay the entry motion exactly. Toast `Restored` (no action) for 1.5s. Nothing celebratory.

### 13 Silent, still listening
Meter falls to its 4px rest. Breath ring (92px, 1px ember) appears at 50% and animates `crispBreathe` 4.2s. Status still "Listening…". **No countdown is ever shown.**

### 14 Low microphone input
As 13, plus status copy becomes "Still listening · we can barely hear you" and the ambient wash drops to 45%. Returns to "Listening…" automatically. No modal, no error styling.

### 15 Processing after Stop
The half-second between Stop and settled. Offsets already resolved to 0, numbers scaled out, card fill and border transparent, status reads "Saving". Permanent list still recessed at 5%. No spinner, no review screen.

### 16 Temporary → permanent (commit)
Board fades out (200ms, 240ms delay) as the environment crosses back to light; committed rows animate into `TODAY` / `LATER` on a 26ms stagger; toast `3 added` for 2.2s. No user action required.

### 17 Committed task list
The resting result: spoken items are ordinary rows with no numbers, no accent and nothing to dismiss.

### 18 Manual task edit
Bottom sheet: mono label "EDIT TASK" + "Done"; 22px underlined title input; six time chips (`No time`, `9:00 AM`, `11:00 AM`, `3:00 PM`, `Tomorrow`, `Wednesday`) — selected chip fills `#211E1B` with `#FDFBF7` label; "Delete task" as plain text. Scrim `rgba(24,20,16,0.26)`.

### 19 Microphone permission denied
Inline row above the mic (not a modal): 7px `#A2988C` dot, 14.5px "Crisp can't hear you", 13px body, one filled pill "Open Settings". Never red text.

### 20 Transcription failure
Same row pattern with an ember dot: "Still listening — interpretation paused" / "Your five items are safe on the board. We'll catch up the moment you're back." / "Retry". Recording continues; the board is preserved.

### 21 Settings / account
Sheet: serif 27px "Settings" + "Close"; six rows, no sections — `Account ravi@crisp.app`, `Sync iOS · Android · Web`, `Voice English (India)`, `Haptics On`, `Dusk while recording Always`, `Privacy`. Mono footer "CRISP 1.0 · BETA". Dusk is listed as behaviour, not a theme toggle.

### 22 Sync / sign-in prompt
Sheet: serif 31px "Keep these on every device.", 15.5px body, stacked `Continue with Apple` (filled charcoal, 14px radius) and `Continue with Google` (outlined), centred "Not now". Offered once, refusable — Crisp works fully offline.

### Web — normal
Rail 212px (≥1000px) with wordmark and Today / Later / Done. Workspace column 712px on `#F6F1EA`, canvas `#EFE9E1` — tonal separation, no floating card, no large shadow. Rows 18px title with the time right-aligned on the same baseline, hover `rgba(33,30,27,0.03)`. Fixed dock pill (status + timer + mic, 54px control) centred over the column, offset left by the rail width. Mono hint "PRESS SPACE TO START".

### Web — recording
Whole page crosses to Dusk, rail opacity `0`, list to 6%, column widens 712 → 788px over 550ms and returns on commit. Meter width animates 0 → 80px inside the dock pill. Hint becomes "ESC TO STOP · NOTHING IS SAVED UNTIL YOU DO". Keyboard: `Space` starts, `Esc` stops.

### Web — empty / multi-task recording / commit / wide
Empty: 46px serif headline, 17px body, dock present. Multi-task recording and commit behave as mobile. ≥1440px: rail and column hold their widths; extra space becomes canvas. **No third column is ever added.**

### Landing — desktop
1180px max, 40px gutter. Header: wordmark, "How it works", filled CTA. Hero two-column: left `flex 1 1 430px` with `clamp(52–88px)` serif headline, 19px supporting copy, CTA + "Free for a month · iOS, Android, web", and a replay control with a state dot and mono step hint; right a 390 × 800 phone that performs a real session on a loop (create → create → correct → delete → create → stop → settle) and crosses into Dusk while recording. Then three columns `01 Talk naturally. / 02 Change your mind. / 03 Your tasks fall into place.`; a closing serif statement with CTA, "iOS · Android · Web", "Free during beta"; a "30 · landing, mobile" section; footer "© 2026 Crisp" with "Buy me a coffee" and "Privacy".

### Landing — mobile
A 390px column on `#EFE9E1`: header row, 47px serif headline, 16.5px copy, full-width CTA, "iOS · Android · Web · free during beta", then a cropped Dusk still (two numbered cards, "Listening…", a static nine-bar meter, 80px ember mic) demonstrating the hero moment without animation.

### Not present in current design
Tablet layout, onboarding, notification surfaces, recurring tasks, search, multi-day calendar, sign-up form, pricing page.

---

## 8. Component inventory

**`TaskRow`** — permanent task, both environments.
Layout: horizontal, `align-items: flex-start`, 13px gap (16px web); 11px vertical padding (12px web); no background, border or shadow. Ring 21px (22px web) with 2px top offset. Text column: 16.5px/1.28 title (18px web), 13px metadata beneath (14px web, right-aligned inline). Metadata row height animates 18px ↔ 0px.
Colours: title `#211E1B` / `#F4EEE4`; metadata `#A2988C`; ring `#A2988C` unchecked, `#211E1B` filled.
States: `default`, `completed` (58% opacity, filled ring, 8px inset dot, strike-through), `pressed` (web hover background only), `fresh` (enters at opacity 0 / translateY 8px with a 26ms index stagger), `recessed` (5–6% while a session is active).
Interaction: whole row opens the edit sheet (idle only); ring toggles completion.
A11y: ring is a checkbox with 44px minimum hit area, `accessibilityRole="checkbox"`, state announced; row is a button labelled "&lt;title&gt;, &lt;metadata&gt;".

**`SessionTask`** — temporary card inside a live session.
Layout: 15px radius (16px web), padding 14/16px (17/20px web), 11px gap (12px), leading 21px number ring, title + single metadata field. Horizontal offset per the formula in 7.08.
Colours: surface `#201C17` / `#FFFDF9`; border `#2B251F` / `#DED5CB`; ember border + `#291F18` surface for 1.6s after create or correct.
States: `appearing` (opacity 0, translateY 10px, scale 0.985), `stable`, `recent`, `updated` (metadata field swap + wash), `deleting` (max-height and margin to 0, translateX +6px, scale 0.97), `settling` (offset 0, number scaled out, fill and border transparent, padding collapsed).
Interaction: **none.** Session cards are not tappable — voice is the only manipulation. This is deliberate: the design does not depend on precise gestures while recording.
A11y: `accessibilityLabel="Item 2 of 3, Call Rahul, tomorrow 3 PM"`; created / corrected / deleted announced once each via a polite live region.

**`RecordingButton`**
Dimensions: 72px circle idle → 80px recording; 54px on the web dock. Mic glyph = 9 × 17px bar (5px radius) above a 15 × 7px U (1.6px stroke); stop glyph = 17 × 17px square, 4px radius. Glyphs cross-fade with a scale (0.7 ↔ 1 / 0.6 ↔ 1).
Colours: `#211E1B` idle → `#E8894C` recording; glyph `#FDFBF7` → `#15120F`.
States present in the design: `idle`, `pressed` (scale 0.94), `recording`, `processing` (holds the recording appearance while status reads "Saving"), `error` (unchanged appearance — the error is carried by the inline row, not the control). A disabled state is **not** represented.
Interaction: **tap to start, tap to stop.** Not hold-to-talk.
A11y: 72px target exceeds the 44px minimum; label "Start recording" / "Stop recording, 3 items pending"; haptic on both transitions.

**`AudioMeter`** — see section 10.

**`RecordingStatus`** — 13px text plus a 3px dot separator plus a tabular-numeric timer, on a 17px row; whole row fades (350ms ease) with session state. Copy: `Listening…` / `Still listening · we can barely hear you` / `Saving`. Web idle shows `Tap to talk` with the timer at opacity 0.
A11y: `aria-live="polite"`; the timer is not announced on every tick.

**`CurrentUtterance`** — centred 15px `#9A8F82` line wrapped in typographic quotes, with a 1.5 × 14px blinking caret (`crispCaret` 1.1s steps). Container height animates 0 ↔ 44px so the dock does not jump. Shows only the *unresolved* phrase and disappears the moment that phrase becomes a card. **Never a full transcript.**
A11y: `aria-hidden` — the transcript is deliberately not announced; the structured item is.

**`SectionHeader`** — 10px mono, 0.15em, uppercase, `#A2988C`, 9px below (12px web). No count, no rule, no action.

**`EmptyState`** — serif headline, one supporting line, the mic. No illustration and no asset.

**`UndoAction`** — pill, 8px padding with a 15px left inset, charcoal fill (`#FFFDF9` + border on web), one word plus an inline Undo button on `rgba(255,255,255,0.14)` (ember on web). Timings: 4.2s delete, 5s clear, 1.5s restored, 2.2s "3 added" (no action).
A11y: minimum 44px Undo target; announced once.

**`Navigation`** — mobile: wordmark + a single "Done"/"Back" text affordance in the 58px header. Web: 212px rail ≥1000px, header row below that. Three items only. Opacity `0` while recording.

**`ErrorState`** — inline row above the mic: 7px dot, 14.5px title, 13px body, one filled pill action. `1px #DED5CB` on `#FFFDF9`, 14px radius. Never a modal, never red text.

**`Sheet`** — `26px 26px 46px 46px`, scrim `rgba(24,20,16,0.26)`, enters with `crispRise` (opacity + 6px, 300ms). Three instances: edit, settings, sync.

**`Chip`** — 8/14px padding, `9999px`, 1px `#DED5CB`; selected fills `#211E1B` with `#FDFBF7`. Six time presets in the edit sheet.

---

## 9. Recording-state specification

**Model: speak → compose → manipulate → commit.** Items created while recording live in a temporary session board. They do **not** enter Today or Later until the session ends. Voice commands during a session may only manipulate items created in that session; existing permanent tasks are never touched.

**Trigger.** One tap on the mic starts recording. One tap stops it. Not hold-to-talk. One session may contain one item or twenty.

| What must be communicated | How the design does it |
|---|---|
| Recording has started | Environment crosses to Dusk in 340ms; navigation opacity → 0; permanent list → 5%; mic 72→80px and charcoal→ember; glyph becomes a stop square; ambient ember wash rises under the lower third; timer starts |
| Microphone is active | Two persistent signals independent of input: the ember mic itself, and the running timer. In near-silence a 4.2s breath ring is added |
| Microphone is hearing audio | Halo opacity `0.06 + amp × 0.32` and scale `1 + amp × 0.34`; nine bars driven per-band. Silence produces rest, never invented motion |
| Temporary tasks | Cards on the Dusk raised surface with a leading reference number and a subtle alternating offset |
| Current unfinished utterance | One centred quoted line above the mic with a caret; it disappears the instant the phrase resolves into a card |
| Silence | Meter to 4px rest; breath ring at 50%; after ~4.2s of near-silence the status softens to "Still listening · we can barely hear you" and the wash dims to 45%. **No countdown, ever** |
| Speech resumes | Halo re-couples to amplitude within one frame; status returns to "Listening…" automatically |
| Stop | Tap the stop control (or `Esc` on web). No Review, Confirm, Save, or "Are these correct?" screen exists |
| Processing | ~460ms: offsets resolve, numbers scale out, card chrome dissolves, status reads "Saving". No spinner |
| Commit | Board fades as the environment returns to light; rows land in Today / Later on a 26ms stagger; toast "3 added" for 2.2s; no user action |

**Auto-finish.** ~30s of continuous silence commits the session. A short thinking pause must not end it — the quiet threshold at 5s and the low-input copy at 4.2s only change appearance and copy, never session state. If speech resumes before 30s the same session continues.

**Session-scoped grammar represented in the design:** create ("call Rahul tomorrow at five"), correct ("actually change Rahul to three pm", "no, make it four"), delete by ordinal ("delete the second one", "delete the last one"), clear ("clear everything"), undo ("undo that"). Numbers exist precisely so ordinal reference is natural, and they are removed on commit.

---

## 10. Audio meter visual specification

**Nine rounded bars**, arranged in a single centred row, vertically centre-aligned (not baseline-aligned).

| Property | Value |
|---|---|
| Bar count | 9 |
| Bar width | 4.5px |
| Gap | 5px |
| Container height | 30px (fixed — the dock never reflows) |
| Rest height | 4px |
| Peak height | 30px (`4 + level × 26`) |
| Radius | `9999px` |
| Colour | `#E8894C` (`color.brand.primary`) in both environments |
| Opacity | `0.30 + level × 0.70`; `0` when not recording |
| Total width | ~80px (animated 0 → 80px on web) |
| Band mapping | Bar *i* reads its own frequency band; band edges follow `(i/9)^1.55` across the lower 44% of the spectrum, so low frequencies get more bars than highs |

**Amplitude source: real microphone input.** Level is RMS of the time-domain buffer, `min(1, rms × 5.4)`. This is not a looping decorative animation.

**Response:** fast attack, slow release — per frame, `value += (target − value) × 0.5` rising and `× 0.08` falling. The result reads as hearing rather than jitter.

**Visual states**

| Input | Appearance |
|---|---|
| Silence | All nine bars at 4px, opacity 0.30. No movement. The breath ring — not the meter — carries "still recording" |
| Quiet speech | 6–10px, restrained, clearly less than normal speech |
| Normal speech | 12–22px with visible per-band variation; halo at roughly 20% |
| Loud speech | Up to 30px with a stronger halo (max ~38% opacity, 1.34 scale). Expansion stays tasteful — no bar exceeds the 30px container and the dock never grows |

**Companion elements.** Halo: 118px circle (54px web), `radial-gradient(circle, glow 24–26%, transparent 70%)`, opacity and scale from amplitude. Breath ring: 92px (64px web), 1px `#E8894C`, `crispBreathe` 4.2s ease-in-out infinite between `scale(1)/opacity .34` and `scale(1.1)/opacity .14`, shown only in near-silence. Ambient wash: radial ellipse `700 × 340px` behind the dock, `opacity 1 → 0.45` when input is faint.

**Not permitted:** a large waveform, a Siri-style orb, a glowing AI ring, a neon gradient, dramatic pulsing, or any activity while the microphone is silent.

---

## 11. Temporary vs permanent tasks

| | Temporary (`SessionTask`) | Permanent (`TaskRow`) |
|---|---|---|
| Lifetime | Only inside the active session; discarded on clear, promoted on commit | Persisted in Today / Later / Completed |
| Environment | Dusk: `#15120F` background | Light: `#F6F1EA` background |
| Surface | Raised card `#201C17`, 1px `#2B251F`, 15px radius | **No surface at all** — sits directly on the background |
| Elevation | None in Dusk (hairline only); `0 4px 14px -10px` in the light variant | None, ever |
| Leading element | 21px ring containing a mono reference number (1, 2, 3…) | 21px completion ring, empty until done |
| Position | Alternating horizontal offset (formula in 7.08) | Perfectly aligned, offset 0 |
| Metadata | Full phrase — "Tomorrow · 5:00 PM" | Reduced — "5:00 PM" for Today, "Wednesday" for Later; the day is implied by the section |
| Recency treatment | `#291F18` surface + ember border for 1.6s after create or correct | None |
| Interaction | Voice only; not tappable | Tap to edit, ring to complete |
| Title colour | `#F4EEE4` | `#211E1B` |
| Metadata colour | `#9A8F82` | `#A2988C` |

**On commit** the number scales out, the offset resolves to 0, the card fill and border go transparent, the padding collapses, the metadata is reduced, and the item is re-parented into its section. Nothing about a committed row hints that it arrived by voice.

---

## 12. Accessibility handoff

**Touch targets.** Mic 72px (80px recording). Completion rings and rows: 21–22px visual, **44px minimum** hit area. Chips 40px tall with 8px separation. Undo, "Done", "Close", "Not now" all ≥44px. Web dock control 54px.

**Contrast (measured against the surface each colour sits on).** Primary text 14.6:1 light / 13.9:1 Dusk. Secondary 5.1:1 / 5.2:1. Ember on Dusk 8.6:1; `#A85A2C` on light 4.8:1. `color.text.tertiary` at 3.1:1 is used **only** for 13px metadata and mono labels, always paired with a ≥4.5:1 title in the same row — never as the sole carrier of information. The recessed list (5–6% opacity) is decorative during a session and must be `aria-hidden` and non-focusable, not merely dimmed.

**Reduced motion (`prefers-reduced-motion: reduce`).** Card offsets render at 0. Card entry and exit become a 120ms cross-fade with no translate or scale. The Dusk environment change drops to a 120ms colour cross-fade. Halo and bars become a static level derived from amplitude with no spring. The breath ring stops animating and holds at 0.34 opacity. Correction still swaps the field value and still shows the wash, because that motion *is* the message — but with no translate. The commit stagger collapses to a single 120ms fade.

**Screen-reader labels.** Mic: "Start recording" / "Stop recording, 3 items pending". Session card: "Item 2 of 3, Call Rahul, tomorrow 3 PM". Row: "Call Rahul, 3 PM" with checkbox state. Section headers as headings. Status text in a polite live region; created / corrected / deleted / cleared / restored / committed each announced exactly once ("Changed to 4 PM", "Deleted item 2", "Cleared 4 items", "3 added"). The current-utterance line is `aria-hidden`. The timer is not announced on tick.

**Keyboard focus on web.** Visible ring on every interactive element: `2px #A85A2C` at 2px offset in light, `2px #E8894C` in Dusk. Never removed. Tab order: rail → section rows in visual order → dock control. `Space` toggles recording from the document body; `Esc` stops a session. Session cards are not focusable (they are not interactive). Focus must not be trapped by the dock, and it must return to the mic after a session commits.

**Semantics for task completion.** The ring is a checkbox, not a button: `role="checkbox"` with `aria-checked`, label = task title. Completion is announced as a state change ("Checked, Call Rahul"), not as a navigation. The strike-through is decorative — completion must be conveyed by state, since strike-through alone is not announced.

**Additional.** Respect the OS text-size setting: rows must reflow to two lines rather than truncate; the dock is fixed-height by design and its status copy should shrink to a second line rather than clip. Haptics on record start, stop, delete and completion. The mic must never be the only path to a task — the edit sheet provides a manual equivalent for every voice operation.
