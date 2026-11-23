# LG Seller Lounge submission sheet: Oware King 1.0.8

Every value to enter in LG Seller Lounge, in the order of the form. Copy each value as written.
Laid out like the Photo Frame sheet in `webos-apps/apps/photoframe/store/listing.md`, which LG accepted.

Menu names in Seller Lounge can change. If a field below is not on the form, skip it. If the form asks for something not listed here, send me the field name.

## Before you start

1. On the Mac, in the `oware-king` folder, get the newest code:

```bash
git pull
```

2. Install the tools (once):

```bash
npm install
```

3. Build the package:

```bash
npm run tv
```

4. Check that the folder `dist-ipk` holds one file only: `com.object91.owareking_1.0.8_all.ipk`.

## File Upload
- App ID: `com.object91.owareking`
- Platform: webOS TV
- File: `dist-ipk/com.object91.owareking_1.0.8_all.ipk`
- Resolution: 1920x1080
- Version: 1.0.8

## Images
- App icon (512 x 512): `assets/store-icon-512.png`
- App tile colour: `#14110E`
- Screenshots (1920 x 1080), in this order:
  1. `store/screenshots/tv-1920x1080/1-title.png` (primary)
  2. `store/screenshots/tv-1920x1080/5-home.png`
  3. `store/screenshots/tv-1920x1080/2-play-the-computer.png`
  4. `store/screenshots/tv-1920x1080/3-scan-to-join.png`
  5. `store/screenshots/tv-1920x1080/4-play-a-friend-online.png`
- All pictures are made from the game itself. There are no photos or third-party images.

## Service Country Info
- Countries: select all countries.
- Language for every country: English.
- If LG asks for a local-language title or description for a country, use the English text. If LG refuses English for that country, remove that country for now and send me the country name. I'll prepare a translation for a later update.

## Display Info
- App title (English): `Oware King`
- App description (English):

> A centuries-old African strategy game, brought to your living room.
>
> Oware has been played across West Africa for hundreds of years, with seeds and a carved wooden board. Oware King brings it to your TV. Sow your seeds, capture your opponent's, and be the first to 25.
>
> Play your way:
> - Play the computer on Easy, Medium or Hard.
> - Two players with one remote.
> - Today's challenge: one position, one try. Keep your streak alive.
> - Play a friend online: scan the code on the TV with your phone, send the link on WhatsApp, and your friend plays on their phone from anywhere.
>
> - Easy to learn, with the rules built in.
> - Works with the Magic Remote and the standard remote.
> - No account, no advertising, no in-app purchases.
> - Every mode except online play works without an internet connection.

## Service Info
- Category: Game. Sub-category: Board, or Puzzle if Board is not offered.
- Version: 1.0.8
- Age rating: all ages (General audiences).
  - Violence: none. Sexual content: none. Language: none. Gambling or simulated gambling: none.
  - Drugs, alcohol, tobacco: none. Horror or fear: none.
  - User interaction: yes, limited. Online players see a short player name and five preset reactions. There is no chat.
  - Location sharing: no. Purchases: no.
  - Some countries (for example Korea, Germany or Brazil) may show their own rating questions. Answer them with the same facts as above.
- Tag keywords: `oware, mancala, ayo, awale, board game, strategy, African game, seed game, two player, family`
- Contact seller: URL `https://www.object91.co.za`, email `thando@object91.co.za`
- Privacy policy: Yes. URL `https://owareking.object91.co.za/privacy`
- Data collected within the app: Yes, only for online play: a player name and a random device ID, used to run the game and deleted one day after the game was last used. Nothing is collected in the other modes. No data is sold or shared.

## Feature Info
- Device requirements: None
- Remote controller: Both Magic Remote and standard remote
- Keys used: arrow keys, OK, Back. Colour and number keys are not used.
- DIAL: not used
- Network: optional. Needed only for online play.
- Screen saver: a muted 16 x 16 pixel video keeps the screen saver off during a game only.

## Test Info
- Reference e-mail: `thando@object91.co.za`
- Test account: Not applicable
- Billing: No
- In-app ads: No
- Geo IP block: No
- Note for tester: paste the whole of `store/lg-tester-notes.md` (from "Oware King is a board game").

## UX scenario
- Upload `store/lg-ux-scenario.pdf`.

## After you submit
1. Keep the review number LG gives you.
2. If LG sends a test report with problems, send it to me. I'll fix them and make version 1.0.9.
3. To upload a new version later: raise the version in `platforms/webos/appinfo.json`, run `npm run tv`, and upload the new file as an update to the same app.
