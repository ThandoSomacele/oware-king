# Windows: Microsoft Store

The Windows app opens the live game in its own window. PWABuilder makes the package.

Before you start: settle the web address (`domain.md`). You need a Microsoft Partner Center developer account.

## Part 1: Reserve the name

1. Sign in to Partner Center (https://partner.microsoft.com/dashboard).
2. Select "Apps and games", then "New product", then "MSIX or PWA app".
3. Reserve the name `Oware King`.
4. Open "Product management", then "Product identity".
5. Copy these three values: Package ID (Package/Identity/Name), Publisher ID (starts with `CN=`), and Publisher display name.

## Part 2: Make the package

1. Open https://www.pwabuilder.com and enter the game's web address.
2. Select "Package for stores", then "Windows".
3. Paste the three values from Part 1.
4. Set version to `1.0.0`.
5. Select "Download" and unzip the file.

## Part 3: Publish

1. In Partner Center, open the Oware King product and start a submission.
2. Under "Packages", upload the file ending in `.msixbundle`. If the folder also has a file ending in `.classic.appxbundle`, upload that too (it is for older Windows 10). Do not upload any other file from the folder.
3. Under "Store listings", enter the text from `listing.md`.
4. Upload the five pictures from `screenshots/windows-1920x1080/` as Desktop screenshots. Skip "Store logos": the Store uses the icon inside the package.
5. Under "Properties", choose category Games, Card and board. Add the privacy policy link and support email.
6. Under "Age ratings", answer the questionnaire with the answers in `listing.md`.
7. Under "Pricing", choose Free.
8. Submit for certification.

The game works with keyboard arrow keys and Enter, mouse and touch.
