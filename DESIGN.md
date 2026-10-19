---
name: حروفي الناطقة
description: A singing-letter toy for preschoolers learning the 28 Arabic letters, in the colours of the printed cards.
colors:
  sun: "#ffcb05"
  sun-deep: "#e9a400"
  blue: "#0070b2"
  blue-deep: "#004f80"
  sky: "#6ed2f2"
  sky-pale: "#e6f5fc"
  line: "#cfe6f2"
  berry: "#f14a26"
  purple: "#9560a6"
  leaf: "#7cc242"
  go-green: "#2e9e5b"
  ink: "#123a5c"
  muted: "#4f6b82"
  honey-ink: "#6b5200"
  honey-toggle: "#7a5d00"
  card: "#ffffff"
  err: "#c2261b"
  err-tint: "#fde8e6"
typography:
  glyph:
    fontFamily: "Rubik, Vazirmatn, sans-serif"
    fontSize: "clamp(2.6rem, 9vw, 5rem)"
    fontWeight: 800
    lineHeight: 1
  glyph-tile:
    fontFamily: "Rubik, Vazirmatn, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 800
    lineHeight: 1.1
  display:
    fontFamily: "Rubik, Vazirmatn, sans-serif"
    fontSize: "clamp(1.9rem, 7vw, 3.2rem)"
    fontWeight: 800
    lineHeight: 1.1
  headline:
    fontFamily: "Rubik, Vazirmatn, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 800
  title:
    fontFamily: "Rubik, Vazirmatn, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
  message:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
  label:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
  body:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
  small:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 600
  caption:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  bit: "3px"
  control: "14px"
  field: "16px"
  wave: "18px"
  tile: "20px"
  picture: "24px"
  panel: "28px"
  pill: "999px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "18px"
  lg: "24px"
components:
  page:
    backgroundColor: "{colors.sky-pale}"
    textColor: "{colors.ink}"
  card-login:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  panel-player:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "30px 16px 10px"
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.card}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "13px"
  button-alt:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "13px"
  button-play:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.card}"
    rounded: "{rounded.round}"
    size: "92px"
  button-skip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue}"
    rounded: "{rounded.round}"
    size: "60px"
  button-write:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 18px 8px 16px"
    height: "48px"
  button-close:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue}"
    rounded: "{rounded.round}"
    size: "52px"
  button-grown:
    backgroundColor: "#ffffff66"
    textColor: "{colors.honey-toggle}"
    rounded: "{rounded.control}"
    height: "44px"
  button-grown-on:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue}"
  tabs:
    backgroundColor: "{colors.sky-pale}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "5px"
  tab-on:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.pill}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  error:
    backgroundColor: "{colors.err-tint}"
    textColor: "{colors.err}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  letter-tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.blue-deep}"
    typography: "{typography.glyph-tile}"
    rounded: "{rounded.tile}"
  letter-tile-on:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.blue-deep}"
  thumb:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.field}"
    width: "84px"
  pill-cert:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  toast:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.card}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "12px 22px 12px 18px"
---

# Design System: حروفي الناطقة

## Overview

**Creative North Star: "The Letter Sings"**

The whole site is a toy that sits beside the printed «حروفي الناطقة» cards, and its world comes from the cards and the header banner. The page ground is a pale sky. White cards and tiles sit on it, the player is a sun-yellow panel, the logo blue is the colour of action, the cards' sky ring circles the current letter, and the cards' red is the letter itself. The user is a 3 to 5 year old who can't read, with an adult beside them. So everything the child touches is big, round, coloured and drawn (SVG stars, medals, a trophy, icons, never emoji or typed symbols), while the grown-up settings are small and quiet.

Everything is chunky and soft. Fat pills and discs press down like plastic buttons, letter tiles lift and sink, and corners run deep. The current letter's name sits big at the top of the player and "sings": it hops with the loudness of its own recording. Rewards land where the child is looking: confetti in sun, sky, purple and green bursts from the name, and a star flies to the learned letter's tile. Right to left throughout; progress fills from the right.

Admin pages are an operator tool outside this world. Only their canvas colours follow the palette.

**Key Characteristics:**
- Pale sky ground, white cards and tiles, a sun-yellow player panel, logo-blue action, a sky ring, red letters.
- Rubik 800 for letters and headings; Vazirmatn for everything else.
- Fat pills and discs with a solid tonal bottom edge plus a soft blur, pressing down on tap.
- Pill waveform bars, blue for played, filling right to left.
- A letter name driven by the song's loudness; celebrations in party colours that always land on an in-view target.
- Drawn SVG rewards, never emoji.
- Child controls large; adult controls small and grouped apart.

## Colors

Bright primary-school colours lifted from the printed cards, on a pale sky ground.

### Primary
- **Logo Blue** (`blue`): the one action colour. Primary buttons, the play button, played waveform bars, icons on white buttons, active toggles, selected thumbnail border, the toast, focus outlines, input focus, the "watch" and completed strokes on the writing pad.
- **Deep Logo Blue** (`blue-deep`): the solid edge under blue buttons, and all Rubik headings, letter names and tile glyphs.

### Secondary
- **Sun Yellow** (`sun`): the player panel, the active letter tile, the certificate pill, the certificate frame, stars and medals. It is a surface and a reward colour, not a text colour.
- **Marigold** (`sun-deep`): the edge under anything sitting on or made of yellow, and the outline on stars and medals.

### Tertiary
- **Sky Ring** (`sky`): waveform hover preview, a medal ribbon, confetti.
- **Card Red** (`berry`): the letter. The child's own finger line on the writing pad (at 60%, #f14a2699).
- **Ribbon Purple** (`purple`) and **Leaf Green** (`leaf`): celebration-only colours (confetti; purple is also the second medal ribbon).
- **Go Green** (`go-green`): the writing pad's "put your finger here" dot and its arrow.

### Neutral
- **Pale Sky** (`sky-pale`): the page ground, the writing overlay and its backdrop, the tab track.
- **Sky Line** (`line`): input borders and the tonal edge under white cards, tiles and alt buttons.
- **Deep Ink Blue** (`ink`): body text.
- **Slate Blue** (`muted`): labels, hints, counts, tile names and numbers, inactive tabs.
- **Honey Ink** (`honey-ink`): small text on yellow (time readouts, names on the active tile).
- **Honey Toggle** (`honey-toggle`): icons in the grown-up toggles on translucent white over yellow. It sits close to Honey Ink and both are in use.
- **Card White** (`card`): cards, tiles, white buttons. Unplayed waveform bars are white at 70% (#ffffffb3).
- **Error** (`err` on `err-tint`): form errors only.

### Named Rules
**The One Blue Rule.** Blue means "press this" or "already done". Actions and progress are blue; decoration never is.

**The Red Is For Letters Rule.** Card red is the letter: the glyph and the child's own tracing of it. It is never an error, a button or a confetti colour. Errors use their own red on a tint.

**The Party Palette Rule.** Celebrations use sun, marigold, sky, purple, leaf green and white only. No letter red and no action blue, so a reward never looks like a letter or a button.

## Typography

**Display Font:** Rubik 800 (with Vazirmatn, sans-serif)
**Body Font:** Vazirmatn 400/600/700 (with Tahoma, sans-serif)

**Character:** Rubik's heavy, rounded Arabic gives letters and headings a toy-like weight; Vazirmatn carries labels and small text plainly. All h1 and h2 are Rubik 800 in deep logo blue.

### Hierarchy
- **Tile glyph** (`glyph-tile`): letters on the grid tiles.
- **Display** (`display`, at clamp(2rem, 8vw, 3rem)): the letter's name at the top of the player, one line with ellipsis.
- **Headline** (`headline`): the certificate title.
- **Title** (`title`, used at 1.5 to 1.7rem): page and section headings (login 1.7, writing overlay 1.6, letter grid 1.5).
- **Message** (`message`, 1.25 to 1.3rem): writing-practice feedback and certificate lines.
- **Label** (`label`, 1.05 to 1.1rem): text in buttons, the toast.
- **Body** (`body`): general text; hints run at line-height 1.8.
- **Small** (`small`, .85 to .95rem, 600): form labels, hints, counts, tile names, the picture counter, the writing-button captions.
- **Caption** (`caption`, tabular figures): time readouts.

One-offs, not part of the ramp: the tile number (.7rem), the certificate name field (Rubik 800, 2rem).

### Named Rules
**The Readable Hamza Rule.** A display face must render hamza, madda and dots unambiguously on every letter. Baloo Bhaijaan 2 was rejected because its hamza on «ألف» reads as a fatha. Check all 28 letters before adopting any new display face.

**The Guide Font Rule.** The writing-practice guide letters (`public/guide.js`, `700 Vazirmatn`) must stay in Vazirmatn. Their stored stroke coordinates are relative to Vazirmatn's glyph shapes; changing the font misaligns every tracing path.

## Layout

A single centred column on the pale sky ground: the login card is at most 440px wide, the player page 760px, the writing pad 520px. The body is padded 24px by 16px. The player page stacks a top row (user and logout pill), the banner, the swipeable cover picture, the thumbnail strip, the yellow player panel, the letter-grid heading and rewards row, then the grid (7 columns, 4 below 560px, 10px gaps). Inside the player: the letter's name, centred, then prev | play | next (in RTL "next" sits on the left), the 56px waveform (bars 7px wide with 5px gaps; on a letter with a living picture it also moves the picture's song), times, then the grown-up row below a 2px dashed rule. Right under the player, a row of two equal white pills: writing practice and «هيا نلعب» (the games; it stands alone, centred, on a letter without writing practice). Child-control sizes scale with `clamp()` against viewport width instead of breakpoints. The writing overlay fills the screen; the pad is sized to fit the viewport height minus 240px.

## Elevation & Depth

Depth is physical, like a plastic toy. Anything raised or pressable has a solid bottom edge in a deeper tone of itself or of the ground under it (blue-deep under blue; marigold under yellow or white-on-yellow; sky line under white on the pale sky), always paired with a soft, negatively spread blue-grey blur. Pressing moves the element down by nearly the edge height and shrinks the edge to 1px. Hovering, on hover-capable devices, lifts 2 to 3px.

### Shadow Vocabulary
- **Line edge** (`box-shadow: 0 5px 0 #cfe6f2, 0 11px 14px -8px #00507a40`): letter tiles, alt buttons; 3 to 4px versions on the active tab, top-row pill, thumbnails and close button.
- **Card edge** (`box-shadow: 0 8px 0 #cfe6f2, 0 18px 30px -18px #00507a55`): the login card; the cover and writing pad use the same 8px edge with a 20px/30px blur.
- **Blue edge** (`box-shadow: 0 5px 0 #004f80, 0 11px 14px -8px #00507a40`): primary buttons and the selected thumbnail; 6px on the toast.
- **Play edge** (`box-shadow: 0 8px 0 #004f80, 0 14px 20px -8px #003a5e88`): the giant play button.
- **Sun edge** (`box-shadow: 0 6px 0 #e9a400, 0 10px 16px -8px #0005`): skip buttons on yellow; 4 to 5px on the active tile, certificate pill and writing pill.
- **Pressed** (`box-shadow: 0 1px 0 <edge>, 0 2px 4px -2px #00507a33`): any pressed button or tile.
- **Panel** (`box-shadow: 0 10px 24px -10px #b07a0066, inset 0 -6px 0 #0000000d`): the yellow player panel.

### Named Rules
**The Same-Hue Edge Rule.** A raised element's solid edge is a deeper tone of the element or of the ground beneath it, and it is always paired with a soft blur. Never a black or ink-coloured hard offset, and never a bare edge without the blur.

## Shapes

Round everything. Child controls are full circles or full pills. Containers have deep corners: 28px for the login card, player panel and writing pad; 24px for the banner and cover picture (20px inside the card); 20px for letter tiles; 18px for the waveform strip; 16px for inputs and thumbnails; 14px for grown-up toggles and the error box. Confetti strips and equaliser bars use 2 to 3px; confetti dots are circles. The certificate frame's 32px is a one-off. White frames (6px on the cover, 3px on thumbnails) surround pictures. Waveform bars are pills mirrored around the centre line. Icons, stars, medals and the trophy are inline SVG with round caps and joins and heavy strokes (2.2 to 3.6 on a 24 grid).

## Components

### Buttons
Tactile and chunky; they move like real buttons.
- **Primary** (`button-primary`): full-width blue pill, white label, Blue edge; presses down 4px.
- **Alt** (`button-alt`): white pill, blue label, Line edge. In the writing overlay, primary and alt buttons stack an SVG icon (30px) over a small caption.
- **Play** (`button-play`): a blue disc with the rounded play/pause icon at 48%. **Skip** (`button-skip`): white discs with blue chevrons on the yellow panel. **Writing pill** (`button-write`): white pill with a pencil icon; the games pill beside it is the same pill with a game-pad icon.
- **Close** (`button-close`): a 52px white disc with a drawn blue cross.
- **Hover / Active / Focus:** lift on hover (hover-capable devices only), press down on active over .12s `cubic-bezier(.2,.8,.2,1)`. Focus is a 3px blue outline (offset 3 to 4px). No transition under reduced motion.
- **Grown-up toggles** (`button-grown`, `button-grown-on`): 44px rounded squares, translucent white on yellow, solid white with a blue icon when on. No edge, no press motion: they are not for the child.

### Tabs
- **Style:** a pale-sky pill track (`tabs`); the active tab is a white pill with a 3px line edge and deep-blue bold text (`tab-on`).

### Inputs / Fields
- **Style:** white, 2px sky-line border, 16px corners (`input`).
- **Focus:** border turns blue with a 4px soft blue halo (#0070b222).
- **Error:** a rounded tinted box (`error`) above the form.

### Cards / Containers
- **Login card** (`card-login`): white, 28px, Card edge, with the banner inset at the top.
- **Player panel** (`panel-player`): sun-yellow, 28px, Panel shadow.
- **Poem light:** while a song plays, the half-line of the printed poem being sung gets a soft sun tint (multiplied, so the print stays crisp) that sweeps right to left as it is sung; a plain tint under reduced motion.
- **Cover picture:** a white-framed picture card (24px, 6px white border, Card edge) that swipes right to left (.38s), with a white pill counter in the corner.

### Letter Tiles
- **Default** (`letter-tile`): white tile, Rubik letter in deep blue, small name and number in slate, Line edge; lifts on hover, sinks on press.
- **Current** (`letter-tile-on`): sun yellow with a marigold edge and a small blue equaliser that bounces while playing.
- **Rewards:** a drawn star in the corner when the letter has been listened to; up to three small stars down the side for writing practice.

### Thumbnails
83px round letter icons (`thumb icon`, from `img/icon/NN.png`) in a 3px white ring, no name band; a letter without an icon falls back to an 84px picture card (`thumb`) with a 3px white frame. Both have the Line edge and 70% opacity until hovered or selected. The selected thumbnail gets a blue frame and Blue edge and lifts 3px. Its name sits on a deep-blue band (#00395fcc).

### Rewards Row, Toast, Certificate
- **Medals:** a drawn medal (sky and purple ribbons, sun disc, white star) per 7 letters; unearned medals are greyscale at 30%.
- **Certificate pill** (`pill-cert`): sun pill with a drawn trophy and Sun edge.
- **Toast** (`toast`): a blue pill sliding down from the top with a drawn star, Blue edge.
- **Certificate page:** a white sheet in a 12px sun frame with a dashed blue inner rule, a Rubik headline, a dashed marigold underline for the name field, a drawn trophy and star, and confetti rain on open. Buttons and confetti are hidden in print.

### Singing Name (signature)
The current letter's name in deep-blue Rubik 800 at the top of the player (there is no letter disc: the cover, the thumbnail and the tile show the letter). While playing, an AnalyserNode reads the song's RMS loudness. Adaptive gain (the loudest moment so far, slowly forgotten at `× 0.997` per frame) makes every song hop the same amount, squared so beats hop and quiet parts rest, with a quick rise (0.5) and slow fall (0.15). The name rises up to 10px, scales up to 1.1 and sways up to 4deg around 50% 85%; a strong beat sends a note out of it, and a new letter's name pops in. Still under `prefers-reduced-motion`.

### Waveform (signature)
A 72px seek strip (role slider) drawn on canvas and mirrored to read right to left. Pill bars: played in blue, hover preview in sky, unplayed in 70% white. It repaints only when a bar changes colour.

### Writing Pad (signature)
A white 28px square on the pale sky overlay. The guide letter is drawn in a pale sky ghost (#dcedf7) in Vazirmatn 700, the strokes as dotted paths (#7fb3cf), the parts already written and the "watch" demo as thick blue lines, the child's finger as a translucent card-red line, and the next touch point as a go-green dot with an arrow. Feedback appears as 1 to 3 drawn stars.

### Celebrations (signature)
A fixed, pointer-transparent layer above everything (`.fx`, anime.js 4.5.0) draws stars, dots and paper strips in the party palette.
- **Letter learned:** the name swells (900ms elastic), confetti bursts from it, and a star launches from above it and flies (300ms pop, 900ms arc) to the letter's tile if it is on screen, else to the new medal, else loops back to the name. The target then pops, and a new medal pops with its own burst. After all 28 letters, confetti rains.
- **Writing stars:** pop in one by one (elastic, 180ms stagger) with a burst.
- **Reduced motion:** nothing flies; rewards land as a calm opacity fade (700ms) on the name or medal, or fade the stars in.

## Do's and Don'ts

### Do:
- **Do** use the pale sky ground, white cards and tiles, the sun-yellow player panel and blue actions on every child-facing surface.
- **Do** keep the letter glyph and the child's tracing in card red, and letters and headings in Rubik 800.
- **Do** give every child control at least 52px (the play button 92px or more) and a press-down motion with a tonal solid edge plus a soft blur.
- **Do** draw icons and rewards (stars, medals, trophy, close cross) as inline SVG.
- **Do** keep adult settings small, quiet and grouped apart from the child controls.
- **Do** fill progress right to left.
- **Do** land every celebration on a target the child can see, and reduce it to an opacity fade under `prefers-reduced-motion`.
- **Do** keep the writing-practice guide letters in Vazirmatn.

### Don't:
- **Don't** use emoji or typed symbols as icons or rewards.
- **Don't** adopt a display face whose hamza or dots can be misread; Baloo Bhaijaan 2 is rejected.
- **Don't** use black or ink-coloured hard offset shadows, or a solid edge without its blur.
- **Don't** use card red or action blue in confetti, or card red for errors or buttons.
- **Don't** use thin grey bars or square bars in the waveform.
- **Don't** let a reward play off-screen where the child can't see it.
