# Windows: Microsoft Store submission sheet

The Windows app opens the live game, `https://owareking.object91.co.za`, in its own window. PWABuilder, a free Microsoft tool, makes the Windows package from that address. You upload the package in Microsoft Partner Center.

Every value is written here, ready to copy. Menu names in Partner Center and PWABuilder can change. If a field below is not on the form, skip it. If the form asks for something not listed here, send me the field name.

## What is already done

- The game passes the browser's own install check, with no errors.
- The install description lists 7 icons and 4 screenshots, and each one loads at the size it states.
- After one visit the game opens with no connection. Online play still needs a connection.
- The game fits Windows windows of 1920 x 1080, 1366 x 768, 900 x 600 and half a screen, with no sideways scrolling.
- Windows tile pictures are drawn sharp from the pixel icon: `assets/win/` and `assets/windows-images.zip`.

## Part 0: Developer account (once)

1. Open https://developer.microsoft.com/en-us/store/register and select the option to get started.
2. Choose **Company** as the account type, so the publisher shows as Object91. A company account cannot be made from an individual one later.
3. Sign in with the Microsoft account Object91 will use for the Store.
4. Fill in the company details. Microsoft checks that the company is real, so use the registered company name and address.
5. Wait for the account to be approved. Microsoft may email or phone the contact person.

Fee: Microsoft announced in May 2026 that company registration is free, and individual registration has been free since September 2025. Some countries may still be on the older sign-up with a fee (19 US dollars for individuals, 99 for companies). The sign-up page shows the amount for your country before you pay.

## Part 1: Reserve the name

1. Sign in to Partner Center: https://partner.microsoft.com/dashboard
2. Select **Apps and games**, then **New product**, then **MSIX or PWA app**.
3. Reserve the name `Oware King`.
4. Open **Product management**, then **Product identity**.
5. Copy these three values into a note:
   - Package/Identity/Name (Package ID)
   - Package/Identity/Publisher (Publisher ID, starts with `CN=`)
   - Package/Properties/PublisherDisplayName (Publisher display name)

## Part 2: Make the package with PWABuilder

1. Open https://www.pwabuilder.com
2. Enter `https://owareking.object91.co.za` and select **Start**.
3. Wait for the report. If it shows a red problem, send me a screenshot. Yellow suggestions are optional.
4. Select **Package for stores**, then **Windows**, then **Generate package**.
5. Fill in the options:

| Field | Value |
|---|---|
| Package ID | from Part 1 |
| Publisher ID | from Part 1 (starts with `CN=`) |
| Publisher display name | from Part 1 |
| App name | `Oware King` |
| App version | `1.0.0` (the classic package version `1.0.0` too, if asked) |
| Language | English (`en`) |
| Images | If the form lets you upload images, upload `assets/windows-images.zip`. Otherwise leave it: PWABuilder uses the icons from the game. |

6. Select **Download package** and unzip the file.
7. The folder holds a file ending in `.msixbundle` and one ending in `.classic.appxbundle`. Keep both. Ignore any other file.

The three identity values must match Partner Center exactly, or the upload in Part 3 is refused.

## Part 3: Submit in Partner Center

Open the Oware King product and select **Start your submission**. Fill in each section.

### Packages
- Upload the `.msixbundle` file.
- Upload the `.classic.appxbundle` file too (it is for older Windows 10).
- Device families: Windows 10 and Windows 11 desktop. Leave others off.

### Pricing and availability
- Markets: all markets.
- Visibility: Public audience, discoverable in the Store.
- Pricing: Free. No free trial.
- Release: as soon as certification is passed.

### Properties
- Category: **Games**, sub-category **Card + board**.
- Privacy policy URL: `https://owareking.object91.co.za/privacy`
- Website: `https://www.object91.co.za`
- Support contact: `thando@object91.co.za`
- Game options: single player and online multiplayer. Local multiplayer: yes, two players on one device. Cross-device play: yes (Windows, phones and LG TVs).
- System requirements: keyboard, mouse or touch. None required beyond that.
- Product declarations: does not access, collect or transmit personal information except as in the privacy policy. Tick that it can be installed to removable storage if offered.

### Age ratings
Answer Microsoft's age rating questions (IARC) with these facts:
- Category: Game.
- Violence, blood, fear, sexual content, nudity, crude humour, bad language: none.
- Drugs, alcohol, tobacco: none.
- Gambling or simulated gambling: no.
- Users can interact or exchange information: yes, limited. Online players see a short player name and five preset reactions. There is no chat and no sharing of photos or location.
- Shares the user's location: no.
- Digital purchases: no.
The expected result is the lowest age band in every rating system.

### Store listings (English)
- Product name: `Oware King`
- Description:

> A centuries-old African strategy game, brought to your phone and living room.
>
> Oware has been played across West Africa for hundreds of years, with seeds and a carved wooden board. Oware King brings it to your computer, phone, tablet and TV. Sow your seeds, capture your opponent's, and be the first to 25.
>
> Play your way: play a friend online, play the computer on Easy, Medium or Hard, two players on one computer, or today's challenge: one position, one try.
>
> No account, no advertising, no in-app purchases. Every mode except online play works without a connection.

- Short description: `A centuries-old African strategy game, brought to your phone and living room.`
- Product features (one per line):
  - Play a friend online: send a link and play from anywhere
  - Play the computer on Easy, Medium or Hard
  - Two players on one computer
  - A new challenge every day, with a streak to keep
  - Works with keyboard, mouse and touch
  - No account, no ads, no in-app purchases
- Keywords (up to 7): `oware`, `mancala`, `ayo`, `awale`, `board game`, `strategy`, `African game`
- Copyright: `© 2026 Object91`
- Screenshots (Desktop, 1920 x 1080), in this order:
  1. `store/screenshots/windows-1920x1080/1-title.png`
  2. `store/screenshots/windows-1920x1080/5-home.png`
  3. `store/screenshots/windows-1920x1080/2-play-the-computer.png`
  4. `store/screenshots/windows-1920x1080/3-invite-a-friend.png`
  5. `store/screenshots/windows-1920x1080/4-play-a-friend-online.png`
- Store logos: leave empty. The Store uses the icon in the package.

### Submission options: notes for certification
Paste:

> Oware King is a board game. No account or login is needed. Play the computer, two players on one device and the daily challenge work with no connection. To test online play: select "Create game link", copy the link and open it in a second browser or on a phone, type a name and join. Players see only a short name and five preset reactions; there is no chat. Privacy policy: https://owareking.object91.co.za/privacy

### Submit
Select **Submit to the Store**. Certification usually takes a few days.

## After you submit

1. Partner Center shows the progress under the submission.
2. If certification fails, Microsoft gives a report listing each problem. Send me that report and I'll fix the game or the text.
3. Because the app opens the live site, most game updates need no new package. A new package is needed only when the app's name, icons or install description change: repeat Part 2 with the next version number (for example `1.0.1`), then start a new submission.

## Sources
- Microsoft Store sign-up: https://developer.microsoft.com/en-us/store/register
- Company registration now free (May 2026): https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/
- Individual registration free (September 2025): https://blogs.windows.com/windowsdeveloper/2025/09/10/free-developer-registration-for-individual-developers-on-microsoft-store/
- Publishing a web app to the Microsoft Store: https://learn.microsoft.com/microsoft-edge/progressive-web-apps-chromium/how-to/microsoft-store
