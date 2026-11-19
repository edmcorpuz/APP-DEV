# Sugilanon design direction

Source: design philosophy written with the canvas-design skill; tokens generated with the
ui-ux-pro-max design-system search (`"blog storytelling publishing community"`, variance 8,
motion 6, density 3), then checked against WCAG AA.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 2

## Movement: Woven Broadsheet

Woven Broadsheet treats a page as a sheet of newsprint that has been cut into strips and
rewoven by hand. Every surface is flat and honest about what it is: a ruled column, a block of
ink, a strip of paper crossing another. Nothing floats, nothing glows, nothing pretends to be
glass. Depth exists only where a hand would press, and it is drawn as a hard offset, never as a
soft blur. The result should feel meticulously crafted, the product of someone who has set type
and cut paper for decades.

Space is built from heavy rules and generous gutters. Thick black lines are structure, not
decoration: they divide, they frame, and they tell the eye where one thought ends. Between them,
whitespace is deliberate and wide, so the dense parts read as dense on purpose. Compositions are
asymmetric. A single oversized element takes most of the width and the rest arranges itself
around it, the way a lead headline dominates a front page. Every alignment is the result of
painstaking adjustment, never of a default grid.

Color is almost absent. Near-black ink on near-white stock carries everything, and a single
saturated pink appears as a printed block, never as thin text, marking the one place that
matters on each screen. Because the accent is rare it lands hard. Its restraint is the
expertise: one strike of color, placed with master-level care, does more than ten.

Scale does the talking. Display type is enormous and set tight, a high-contrast serif whose
hairlines turn to near-nothing at the largest sizes. Reading text is a plain, sturdy sans with
nothing to prove. Numbers are tabular and treated as typographic objects in their own right.
The rhythm comes from the jump between the huge and the small, with very little in between.

Motion is mechanical and brief. Things arrive in order, like a press laying down rows, and
settle without wobble. A pressed control drops into its own shadow. Nothing loops, nothing
drifts, and anyone who asks the system for less motion gets a still, fully readable page. Every
frame should look labored over, as if the timing were tuned by hand until it disappeared.

## Tokens

| Role | Light | Dark | Rule |
|---|---|---|---|
| Background | `#FAFAFA` | `#09090B` | |
| Foreground / ink | `#09090B` | `#FAFAFA` | 19.06:1 |
| Card | `#FFFFFF` | `#18181B` | |
| Muted text | `#475569` | `#A1A1AA` | 7.26:1 / 7.76:1 |
| Accent fill | `#EC4899` | `#F472B6` | fill only, always with black text (5.64:1 / 7.51:1) and a black border. Never pink text on the light background (3.38:1, fails). |
| Destructive | `#DC2626` | `#F87171` | 4.63:1 / 7.19:1 |

- Display: Libre Bodoni (high-contrast editorial serif, headlines and numbers only)
- Text and interface: Public Sans (plain, sturdy, readable at small sizes)
- Radius: 0 everywhere. Borders: 2px structure, 3px for the heaviest rules.
- Elevation: one hard offset shadow (`6px 6px 0 ink`), only on things you can press.

## Why each decision (R-31)

- Black and white with one pink: the generated system's "editorial black + accent pink"; one accent keeps the focal point obvious.
- Libre Bodoni + Public Sans: the generated magazine pairing; serif for voice, sans for reading and controls.
- Square corners and heavy rules: the brutalist style the generator matched to editorial and media sites; rules are structure.
- Hard offset shadow on pressables only: a press can visibly drop into it, which is the feedback.
- Woven artwork: an original generated composition that repeats the strip-and-weave idea in the masthead.
