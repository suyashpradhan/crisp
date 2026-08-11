# Crisp Motion Specification

Every animation explains one state change. Nothing exceeds 560ms. Fast beats theatrical, because these run hundreds of times a day.

**Standard curves**
- `ease.environment` — `cubic-bezier(0.30, 0.70, 0.20, 1)` — environment and collapse
- `ease.material` — `cubic-bezier(0.22, 0.72, 0.16, 1)` — cards arriving and settling
- `ease.snap` — `cubic-bezier(0.20, 0.80, 0.20, 1)` — small value swaps, sheets, presses
- `ease.settle` — `cubic-bezier(0.22, 0.70, 0.20, 1)` — list recede and row entry
- `ease.breath` — `ease-in-out` — the silence breath only

**Timing vs spring.** Everything is a timing animation. Springs are appropriate in exactly two places if a platform prefers them: the mic press (stiff, low mass, no visible overshoot) and card arrival (critically damped, no bounce). Do not introduce overshoot anywhere else — bounce reads as playful on the tenth use and as noise on the hundredth.

---

## 1. Idle → Recording

**Trigger** single tap on the mic (or `Space` on web).

**Environment cross-fade**
- Start: canvas `#EFE9E1`, app `#F6F1EA`, ink `#211E1B`, border `#DED5CB`.
- End: canvas `#1B1713`, app `#15120F`, ink `#F4EEE4`, border `#2B251F`.
- Properties: `background-color`, `color`, `border-color` on every element in the tree.
- **340ms**, `ease.environment`. Timing animation. Runs concurrently with everything below — the whole change is one gesture, not a sequence.

**Navigation** opacity `1 → 0`, 340ms, `ease.environment`. Navigation is removed, not dimmed; it must also become non-focusable.

**Permanent list** opacity `1 → 0.05` (0.06 web), `scale(1 → 0.985)`, `translateY(0 → −10px)`, `saturate(1 → 0.5)`. 550ms, `ease.settle`. Slightly slower than the environment so the recession reads as depth rather than a cut.

**Microphone** width/height `72 → 80px`; `background` charcoal → ember; glyph swap: mic marks opacity `1 → 0` and `scale(1 → 0.7)` while the stop square goes `0 → 1` and `scale(0.6 → 1)`, both 240ms `ease.snap`; `box-shadow` `0 6px 18px -10px rgba(40,28,20,.34)` → `0 12px 34px -10px rgba(232,137,76,.50)`. Size and background 300–340ms.

**Ambient wash** radial ember ellipse behind the dock, opacity `0 → 1`, 700ms `ease`. Deliberately the slowest element, so warmth arrives after the layout has settled.

**Audio meter** container opacity `0 → 1`, 400ms; bars remain at their 4px rest until real input arrives.

**Press feedback** `scale(1 → 0.94)` on `:active`, 280ms `ease.snap`, plus one haptic impact.

**Reduced motion** environment cross-fade 120ms; no scale or translate on the list (opacity only); no size change on the mic (background and glyph swap only); wash appears at 120ms.

---

## 2. Audio meter

**Amplitude source: real microphone input.** RMS of the time-domain buffer, normalised `min(1, rms × 5.4)`. Per-bar targets come from nine frequency bands with edges at `(i/9)^1.55` across the lower 44% of the spectrum. **This must never be a looping decorative animation.**

**Smoothing** — per animation frame (~60fps), per bar and for the overall level:

```
attack (target > value):  value += (target − value) × 0.50
release (target ≤ value): value += (target − value) × 0.085
```

Roughly a 3-frame attack (~50ms) and a ~10-frame release (~165ms). Fast enough to feel like hearing, slow enough that it never flickers.

**Mapped output**
- Bar height `4px + level × 26px`
- Bar opacity `0.30 + level × 0.70`
- Halo opacity `0.06 + amp × 0.32`; halo `scale(1 + amp × 0.34)`

Drive these on a frame loop writing directly to the animated nodes; do not re-render the list per frame.

**Silent behaviour** all bars hold 4px at 0.30 opacity; halo opacity 0. No fake activity. "Recording is active" is carried instead by the ember mic, the running timer, and the breath ring below.

**Breath ring** appears when `amp < 0.07` for **4200ms**: opacity `0 → 0.5`, then `crispBreathe` — `scale(1)/opacity .34` → `scale(1.1)/opacity .14` → back — **4200ms**, `ease.breath`, infinite. Cancels within one frame when speech resumes.

**Low-input copy** at the same 4200ms threshold, status text cross-fades to "Still listening · we can barely hear you" (350ms) and the ambient wash drops to 45% (700ms). Reverts automatically. **No countdown is ever rendered**, and the 30s auto-finish threshold has no visual representation.

**Reduced motion** bars and halo take the smoothed level as a static value updated at most 4×/second; the breath ring holds at 0.34 opacity without animating.

---

## 3. Temporary task appears

**Trigger** a spoken phrase resolves into structured intent (~260ms after the phrase is finalised, so the utterance line clears first).

- Start: `opacity 0`, `translateY(10px)`, `scale(0.985)`, offset already at its final horizontal value.
- End: `opacity 1`, `translateY(0)`, `scale(1)`.
- **440ms**, `ease.material`. Opacity runs 300ms inside that window so the card is legible before it stops moving.
- Recency: surface → `#291F18` and border → `#E8894C` immediately, reverting over 500ms after a **1600ms** hold.

**Stagger** cards arrive as speech resolves, so natural speech provides its own rhythm — **no artificial stagger on arrival.** A stagger applies only to (a) `Undo` restoring several cards and (b) `Clear`, both at **45ms** per card.

Motion must read as "the system understood something actionable" — confident, not flashy. No bounce, no flash, no sound.

**Reduced motion** 120ms opacity fade, no translate or scale; recency tint still applies.

---

## 4. Spoken correction

**Trigger** a correction utterance resolves against an existing session item (e.g. "actually make that four").

**Only the changed field animates.** The card is not replaced, not re-rendered wholesale, not toasted, and recording is not interrupted. No second task is created.

Old and new values occupy one 18px-high relative box (20px web) so nothing reflows:
- Old value: `translateY(0 → −7px)`, `opacity 1 → 0`
- New value: `translateY(7px → 0)`, `opacity 0 → 1`
- Both **300ms**, `ease.snap`, run simultaneously. Old value unmounts at 700ms.

**Wash** ellipse behind the field, inset `−3px −6px`, radius 6px, `color.brand.wash`: opacity `0 → 1` immediately, `1 → 0` over **700ms** starting at 900ms.

**Card recency** surface → `#291F18`, border → `#E8894C`, held **1600ms**, then back over 500ms.

If the correction also changes the day, the metadata string changes as one field — never two staggered animations.

**Reduced motion** values cross-fade in place over 120ms with no translate. The wash and the recency tint are retained: they are the message, not decoration.

---

## 5. Delete

**Trigger** "delete the second one" (or an ordinal / "the last one").

- Card: `max-height 120px → 0` (130px web), `margin-bottom 11px → 0` (12px web), `opacity → 0`, `translateX(+6px)` in its own offset direction, `scale(1 → 0.97)`.
- **340ms**, `ease.environment`; opacity 300ms.
- Node is removed from the list at 400–460ms.

**Neighbours** reposition because the deleted card animates *its own height and margin* to zero — surrounding cards move by layout, not by a transform, so the motion is physically natural with no jump and no per-item choreography.

**No confirmation dialog.** `Deleted · Undo` appears for **4200ms** (enter `crispRise`: opacity + 6px translate, 300ms `ease.snap`).

**Reduced motion** height and margin collapse in 120ms, opacity only, no translate or scale.

---

## 6. Clear

**Trigger** "clear everything".

All cards run the delete motion simultaneously with a **45ms per-card stagger** (index × 45ms delay applied to max-height, margin, opacity and transform). Last card completes at `340 + 45(n−1)` ms; the container empties at 700ms.

`Cleared · Undo` appears for **5000ms**.

**The session does not end.** Status stays "Listening…", the timer keeps running, the meter keeps responding, and new speech creates new cards. Clearing the board is not stopping.

**Reduced motion** all cards fade together in 120ms with no stagger.

---

## 7. Undo

**Trigger** tapping Undo, or "undo that".

Restored cards replay the **entry motion exactly** — `opacity 0 → 1`, `translateY(10px → 0)`, `scale(0.985 → 1)`, 440ms `ease.material`, with a 45ms stagger when several return. No highlight, no recency tint, no flash: the board simply *is* the way it was.

Toast becomes `Restored` (no action) for **1500ms**.

**Reduced motion** 120ms fade, no stagger.

---

## 8. Stop recording

**Trigger** tapping stop, `Esc` on web, or ~30s of continuous silence.

Immediately on stop, and concurrently:
- Timer stops; status cross-fades to "Saving" (300ms).
- Current-utterance container height → 0, 300ms `ease.snap`.
- Audio meter opacity → 0, 400ms; halo → 0 within one frame.
- Breath ring and ambient wash begin their exits.
- The mic keeps its recording appearance throughout processing — it must not flicker back to charcoal before the commit.

No Review, Confirm, Save, "Continue", "Are these tasks correct?" or AI summary. Processing lasts ~460ms and shows no spinner.

**Reduced motion** all of the above at 120ms.

---

## 9. Commit — the signature transition

**Trigger** end of processing (~460ms after stop). Total perceived duration ~800ms.

**Phase 1 — align (0–460ms), `ease.material`.** The metaphor is *messy thoughts → organized work*.
- Horizontal offsets → `0` for every card (each card travels its own 0–10px).
- Reference numbers: `opacity 1 → 0`, `scale(1 → 0.6)`, 380ms.
- Card `background` and `border-color` → `transparent`; shadow → `none`.
- Padding collapses `14px 16px → 11px 2px` (mobile) / `17px 20px → 13px 0` (web), so the card's text lands exactly on the permanent row's text position.

**Phase 2 — hand off (240–440ms).** Board container `opacity 1 → 0`, **200ms** with a **240ms delay**, so the alignment is visibly complete before the layer leaves. The board unmounts at 460ms. The permanent list stays recessed at 5% throughout phase 1 — the two layers must **cross-fade, never co-exist at legible opacity**, or identical text overlaps line-for-line.

**Phase 3 — environment returns (concurrent, 340ms `ease.environment`).** Dusk → light on the same properties as section 1, reversed. Navigation opacity → 1. Ambient wash → 0 over 700ms. Mic: ember → charcoal, 80 → 72px, stop glyph → mic glyph (240ms).

**Phase 4 — rows arrive (460–960ms).** Committed rows enter Today / Later with `opacity 0 → 1`, `translateY(8px → 0)`, **500ms** `ease.settle`, **26ms stagger** by index. The list returns to full opacity only once the board has unmounted.

**Phase 5 — confirmation.** Toast `3 added` (or `Saved` when the count is unavailable) enters with `crispRise` 320ms `ease.snap`, holds **2200ms**, then fades. No user action is required and nothing is dismissible.

**Reduced motion** offsets are already 0; skip phase 1 movement and cross-fade the board out in 120ms; environment change 120ms; rows fade in together over 120ms with no stagger; toast still shown.

---

## 10. Task completion

**Trigger** tapping the ring on a permanent row.

- Ring `border-color` and `background` → ink; inner 8px dot `opacity 0 → 1`, `scale(0.3 → 1)`.
- Row `opacity 1 → 0.58`; title `color` → `#766E65`; `line-through` in `#A2988C`.
- **220ms**, `ease.snap`. One haptic selection tick.
- Reversible with the identical animation. The row does **not** animate out of the list or fly to another section — completed items are simply reached from the header.

**Reduced motion** 120ms, no dot scale.

---

## 11. Supporting motion

| Element | Properties | Duration | Easing |
|---|---|---|---|
| Sheet present (edit / settings / sync) | `opacity 0 → 1`, `translateY(6px → 0)`; scrim `0 → 0.26` | 300ms | `ease.snap` |
| Sheet dismiss | reverse | 240ms | `ease.snap` |
| Current utterance appear | container height `0 → 44px`, text `opacity 0 → 1`, `translateY(6px → 0)` | 300ms | `ease.snap` |
| Current utterance resolve | reverse, starting 260ms before the card appears | 300ms | `ease.snap` |
| Caret | `opacity 1 → 0.15` | 1100ms `steps(1, end)` infinite | — |
| Toast enter / exit | `opacity`, `translateY(6px)` | 320ms / 300ms | `ease.snap` |
| Status copy change | cross-fade | 350ms | `ease` |
| Metadata row reveal | `height 0 ↔ 18px` | 300ms | `ease.snap` |
| Web column width (recording) | `max-width 712 ↔ 788px`, padding 40 ↔ 46px | 550ms | `ease.settle` |
| Web meter reveal | `width 0 ↔ 80px`, `opacity` | 400ms | `ease.snap` |
| Web row hover | `background-color` | 150ms | `ease` |
| Nav item selection | `background-color` | 160ms | `ease` |
| Chip selection | `background`, `color`, `border-color` | 180ms | `ease` |
| Button press | `scale(0.93–0.94)` | 250ms | `ease.snap` |
| Landing hero loop | full session replays; idle 900ms → session → commit → 4400ms pause → repeat | ~23.5s cycle | as above |
