# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Preschool children aged 3 to 5 who are learning the 28 Arabic letters, nearly always with a parent or teacher beside them. The adult registers and logs in; the child listens, swipes the pictures and taps big controls. The children can't read yet, so everything they touch must be understood from pictures, icons, color and sound alone. Used on phones, tablets and computers.

## Product Purpose
Companion site to the printed letter cards «حروفي الناطقة» (a header banner and the letter pictures come from the cards). One recorded song per letter, played in a player that resists downloading, plus guided finger-writing practice, so children hear and trace each letter. Success: the child goes through all 28 letters, collecting stars, medals and a printable certificate.

## Positioning
Access is sold with the physical cards: one license code per buyer, one account per code, one active session per account (admins excepted).

## Operating Context
- An adult sits next to the child and chooses the letter; the child presses play, swipes, traces with a finger.
- All UI text is standard Arabic, right to left; the site is called «حروفي الناطقة».

## Capabilities and Constraints
- Plain PHP + vanilla JS/CSS, no libraries or build step; MySQL on the server, SQLite locally.
- Player: play/pause, previous/next, shuffle, repeat modes (default: go on to the next letter), slower speeds, waveform seek, swipeable picture, thumbnail strip, letter grid.
- Rewards: a star per letter listened to the end, a medal per 7 letters, certificate after 28; writing practice gives 1–3 stars per letter.

## Brand Commitments
- Name «حروفي الناطقة»; banner `public/img/headerontop.jpg` and letter pictures `public/img/NN.jpg` (bright yellow, blue, cartoon children and animals) are the existing brand assets.

## Evidence on Hand
- 28 letter pictures, the banner, 28 recordings. No testimonials or other claims exist; none may be invented.

## Product Principles
1. A child who can't read must be able to use what they touch: pictures, icons and sound, never words alone.
2. The adult beside the child sets things up; settings stay out of the child's way.
3. Reward progress warmly, never punish mistakes.

## Accessibility & Inclusion
Large touch targets for small, imprecise fingers; respect reduced motion; Arabic RTL throughout.
