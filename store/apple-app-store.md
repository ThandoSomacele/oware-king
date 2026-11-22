# iPhone and iPad: App Store

Apple needs a Mac with Xcode and an Apple Developer Program membership (99 US dollars a year). The build must run on your Mac. I cannot do it from here.

Before you start: settle the web address (`domain.md`).

Warning: Apple sometimes rejects apps that are only a website in a wrapper (guideline 4.2, "minimum functionality"). Oware King is a full game with offline modes, which helps, but approval is not certain. Until then, iPhone players can install it from Safari: open the game, select Share, then "Add to Home Screen".

## Part 1: Make the Xcode project

1. Open https://www.pwabuilder.com and enter the game's web address.
2. Select "Package for stores", then "iOS".
3. Set Bundle ID to `com.object91.owareking`. Set App name to `Oware King`.
4. Select "Download" and unzip the file on your Mac.

## Part 2: Create the app record

1. Sign in to App Store Connect (https://appstoreconnect.apple.com).
2. Select "Apps", then "+", then "New App". Platform iOS, name Oware King, bundle ID `com.object91.owareking`, SKU `owareking`.
3. If the bundle ID is not in the list, first register it at https://developer.apple.com/account under "Certificates, Identifiers & Profiles", then "Identifiers". Then repeat step 2.

## Part 3: Build and upload

1. Follow the `next-steps` file in the folder to open the project in Xcode. If it tells you to run `pod install`, open the `.xcworkspace` file afterwards, not the `.xcodeproj` file.
2. In Xcode, select the project, then "Signing & Capabilities". Select the Object91 team.
3. Connect an iPhone and select Run. Check that the game opens and that online play works.
4. Select "Product", then "Archive".
5. In the window that opens, select "Distribute App", then "App Store Connect", then "Upload".

## Part 4: Publish

1. In App Store Connect, open "Apps", then Oware King.
2. Enter the text from `listing.md`.
3. Upload the pictures in `screenshots/iphone67-1290x2796/` under the largest iPhone display size, and the pictures in `screenshots/ipad129-2048x2732/` under the largest iPad display size.
4. Answer the "App Privacy" questions with the answers in `listing.md`.
5. Age rating: answer the questions; the result should be 4+. Do not choose the Kids category.
6. Select the uploaded build.
7. In "App Review Information", explain: "Oware is a traditional board game. Play the computer, two players on one device and the daily challenge with no connection. Online play needs no account: create a game and open the link on a second device."
8. Submit for review.
