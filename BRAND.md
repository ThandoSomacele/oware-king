# Oware King brand guide

## Name
- Write it as **Oware King**, two words, both capitalised.
- "Oware" is the common name of the game and cannot be owned. What is ours is the pair of words together with the logo.
- Alternative kept in reserve: **Oware Hene** ("ɔhene" is "king" or "chief" in Twi). No clashing product was found for it, but a Twi speaker has not confirmed the wording.

## Logo
- Drawn in code by `drawWord()` in `src/pixel.js`, in the style of 16-bit console title screens. It is not a font.
- "OWARE" is bevelled gold, "KING" is bevelled cream. Light comes from the top left: bright top and left edges, dark bottom and right edges, one thin glint per letter, a dark outline.
- Every O is a carved wooden pit with one seed resting in it.
- A line of small seeds runs under the words on the title screen.
- The header uses the one-line logo (`Pixel.logoCanvas`). The title screen uses the stacked logo.
- Always place it on a dark ground. Leave clear space of one letter height around it.
- Show it at whole-number pixel sizes only. Do not stretch it, smooth it, or set the name in an ordinary font as a substitute.

## App icon
- Drawn by `Brand.icon()`: a gold block crown above a wooden pit with three seeds (cream, gold, green). It is an early flat version and should be redrawn in the pixel style before store launch.
- Keep the crown plain. Do not add a face, jewels or a cartoon style, so it stays clear of other "King" games.

## Colours
| Name | Hex | Use |
|---|---|---|
| Warm black | `#14110e` | Background |
| Gold | `#f2b01e` | Logo, buttons, what you can tap |
| Green | `#1f8a55` | Patterns, daily challenge card |
| Red earth | `#c8452a` | Patterns |
| Cream | `#fdf0dc` | Text, second word of the logo |
| Wood | `#9a6535` | Board |

## Borders and bands
- Borders are rows of round Oware seeds, each lit from the top left, in gold, cream, green and red earth.
- Do not use square block or brick patterns: they make the game look like a toy-brick game.
- The game board itself is smooth carved wood, not pixel art: pixel art is for the title screen, logo and seed borders only. A plain carved line separates the two rows of pits.
- All patterns are original. They are not copies of named Kente cloths or Adinkra symbols. Ghana's copyright law treats those as protected folklore, and commercial use can need permission. Get legal advice before using a real one.

## Title screen
- `Pixel.title()` draws it: a night sky with a dusk glow, a lit relief map of Africa coloured by climate (sand, forest, dry south), and a gold spark on Ghana, the home of Oware.
- It uses one small fixed palette and ordered dithering. Keep new art inside that palette.

## Sound
- Seeds land with a short wooden knock; pick-up and capture are a seed rattle; results use wooden-key notes. No music, no beeps.

## To protect the brand (owner's actions)
1. Search Google Play, the App Store, Steam and itch.io by hand for "Oware King". The automated check found none, but it could not open the stores directly.
2. Search the trade mark registers (CIPC, WIPO Global Brand Database, USPTO, EUIPO, IP India) for OWARE KING. The owner of "Ludo King" also publishes "Carrom King" and "Sudoku King", so take legal advice on the "King" pattern before filing.
3. Register the name and logo as a trade mark: CIPC in South Africa first, then ARIPO and OAPI for wider Africa.
4. Buy the domain and claim the social handles and store listing names.
5. Keep this repository private.
