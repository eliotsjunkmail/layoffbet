# LayoffLive — Design Rebrand Spec
## Clinical Direction: Teal on Dark

**This is the canonical design system for LayoffLive. All new UI work must follow it.**

How it is implemented in this codebase (Tailwind):
- The palette, fonts, and border-radius scale are baked into `tailwind.config.js`, so the
  existing Tailwind utility classes (`blue-*`, `slate-*`, `emerald-*`, `rounded-xl`, etc.)
  resolve to the tokens below. Use those classes and you automatically get the brand.
- The app is forced into dark mode (`ThemeEffect` in `src/App.tsx`); the design is dark-first.
- CSS custom properties mirroring these tokens live in `src/index.css` under `:root`.

Going forward:
- Accent / primary / links / progress / YES → teal (`blue-*` and `emerald-*`/`green-*` map to teal).
- Confirmed / settled / destructive / LIVE → muted red (`red-*`/`rose-*`/`orange-*` map to alert).
- Surfaces are dark (`slate-*`/`gray-*` map to the dark surface + text ramps).
- Headings / body / CTAs → Space Grotesk (`font-sans`). Labels / timestamps / data → DM Mono (`font-mono`).
- Flat corners: cards ≤ 6px, buttons/inputs/chips ≤ 4px. Circles (avatars, dots, toggles) stay `rounded-full`.

---

## CONTEXT

LayoffLive currently used:
- Default system blue (`#007AFF`) for all interactive elements
- White backgrounds (`#FFFFFF`, `#F2F2F7`) for screens and cards
- SF Pro (system default) for all text
- Standard rounded iOS/web card components with no visual identity

We replace this with the **Clinical direction**: a dark-mode-first design system with a teal
accent, muted red for alerts, and monospace/grotesque typography. The product should feel like a
financial terminal built by someone who was laid off — precise, data-forward, with a cynical edge.

---

## DESIGN TOKENS

```css
:root {
  /* Backgrounds */
  --bg-base:       #08090C;   /* deepest background, body/screen */
  --bg-surface:    #0D0F14;   /* card surfaces, nav bars, sidebars */
  --bg-elevated:   #111419;   /* elevated surfaces, dropdowns, modals */

  /* Borders */
  --border:        #1A1D24;   /* all dividers, card outlines, input borders */

  /* Text */
  --text-primary:  #D8DDE6;   /* headings, company names, primary content */
  --text-body:     #9AA3B0;   /* body copy, comments, descriptions */
  --text-muted:    #3A4050;   /* timestamps, labels, placeholders, metadata */

  /* Accent — Teal (replaces ALL instances of system blue #007AFF) */
  --accent:        #1E7A8C;   /* primary CTA, active states, links, progress */
  --accent-dim:    #124E5A;   /* pressed/hover state on accent elements */
  --accent-subtle: rgba(30, 122, 140, 0.12); /* tinted backgrounds */

  /* Alert — Red (use ONLY for confirmed events, destructive actions) */
  --alert:         #8C2E2E;   /* confirmed layoffs, close/delete, market settled */
  --alert-dim:     rgba(140, 46, 46, 0.20); /* red-tinted backgrounds */

  /* Semantic aliases */
  --color-yes:     var(--accent);     /* YES bets, positive probability */
  --color-no:      var(--text-muted); /* NO bets */
  --color-live:    var(--alert);      /* LIVE badge */
  --color-settled: var(--alert);      /* settled/confirmed markets */
}
```

---

## TYPOGRAPHY

Fonts (loaded in `index.html` via Google Fonts):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
```

```css
--font-display: 'Space Grotesk', -apple-system, sans-serif;  /* Tailwind font-sans */
--font-mono:    'DM Mono', 'SF Mono', 'Menlo', monospace;     /* Tailwind font-mono */

/* Type scale */
--text-xs:   9px;   --text-sm:   11px;  --text-base: 13px;  --text-lg:   15px;
--text-xl:   18px;  --text-2xl:  24px;  --text-3xl:  32px;

/* Letter spacing */
--tracking-wide:  0.12em;   --tracking-wider: 0.20em;
```

### Typography usage rules

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Wordmark "LayoffLive" | Space Grotesk | 15–18px | 700 | `--text-primary` (span "Live" in `--accent`) |
| Screen / company title | Space Grotesk | 18–22px | 700 | `--text-primary` |
| Stat numbers | Space Grotesk | 26–32px | 600 | `--text-primary` |
| Body copy / comments | Space Grotesk | 13px | 400 | `--text-body` |
| All UI labels / tags | DM Mono | 9–11px | 400–500 | `--text-muted` |
| Timestamps / metadata | DM Mono | 9px | 400 | `--text-muted` |
| Input placeholder | DM Mono | 11px | 400 | `--text-muted` |
| Button text (primary) | Space Grotesk | 13px | 600 | `--bg-base` |
| Button text (secondary) | DM Mono | 10px | 400 | `--text-muted` |
| Odds / percentages | DM Mono | 11–16px | 500 | varies |

---

## BORDER RADIUS — global flatten

| Element | New |
|---|---|
| Screen cards / bet cards | 4px |
| Primary CTA buttons | 4px |
| Secondary / outline buttons | 3px |
| Input fields | 3px |
| Company chips / pills | 4px |
| Chat FAB | 4px |
| Comment cards | 3px |
| Modal / bottom sheet | 6px |

Circular elements (avatars, status dots, the theme toggle knob) keep `rounded-full`.

---

## GLOBAL BLUE SWEEP (handled by the Tailwind color remap)

| Before | After |
|---|---|
| `#007AFF` / `blue-*` | teal `--accent` |
| `#22C55E` / `green-*` / `emerald-*` (YES, progress) | teal `--accent` |
| orange / `rose-*` (LIVE, alerts) | red `--alert` |
| `#FFFFFF` / `#F2F2F7` backgrounds | `--bg-base` / `--bg-surface` |
| placeholder `#C7C7CC` | `--text-muted` |

---

## WHAT NOT TO CHANGE

- Layout and spacing — don't move elements or alter padding/margin
- Component logic / JS — visual-only changes
- Icon set — keep existing icons, recolor only
- Font sizes — change family and color, not size
- Copy / text content — don't alter any words
- Animations — remove pulsing/blinking; keep functional transitions (slide-in sheets, etc.)

---

## VERIFICATION CHECKLIST

- [ ] No white or light-grey backgrounds anywhere in the app
- [ ] No system blue anywhere
- [ ] "Live" in wordmark is teal, not blue
- [ ] "Enter anonymously" CTA is teal and rectangular (4px), not a blue pill
- [ ] Progress bar fill is teal, not green
- [ ] YES% text is teal, not green
- [ ] LIVE badge inside chat FAB is red, not orange
- [ ] Chat FAB is dark-surfaced with teal border, not a solid blue pill
- [ ] "+ New bet" button has no fill — teal outline only
- [ ] All card/button border-radius is small (≤6px / ≤4px)
- [ ] Comment cards are dark-surfaced, not white
- [ ] Confirmed/settled markets use red
- [ ] No pulsing, blinking, or glowing animations
- [ ] DM Mono on timestamps/labels/percentage data; Space Grotesk on headings/body/CTAs
- [ ] Inputs have dark fill + subtle border; focus shows teal border
