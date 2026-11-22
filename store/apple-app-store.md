# iPhone and iPad: App Store

Apple needs a Mac with Xcode and an Apple Developer Program membership (99 US dollars a year). The build must run on your Mac. I cannot do it from here.

Before you start: settle the web address (`domain.md`).

Warning: Apple sometimes rejects apps that are only a website in a wrapper (guideline 4.2, "minimum functionality"). Oware King is a full game with offline modes, which helps, but approval is not certain. Until then, iPhone players can install it from Safari: open the game, select Share, then "Add to Home Screen".

## Part 1: Make the Xcode project

1. Open https://www.pwabuilder.com and enter the game's web address.
2. Select "Package for stores", then "iOS".
3. Set Bundle ID to `com.object91.owareking`. Set App name to `Oware King`.
4. Select "Download" and unzip the file on your Mac.

## Part 2: Build and upload

1. Follow the `next-steps` file in the folder to open the project in Xcode.
2. In Xcode, select the project, then "Signing & Capabilities". Select the Object91 team.
3. Connect an iPhone and select Run. Check that the game opens and that online play works.
4. Select "Product", then "Archive".
5. In the window that opens, select "Distribute App", then "App Store Connect", then "Upload".

## Part 3: Publish

1. Sign in to App Store Connect (https://appstoreconnect.apple.com).
2. Select "My Apps", then "+", then "New App". Platform iOS, name Oware King, bundle ID `com.object91.owareking`.
3. Enter the text from `listing.md`.
4. Upload screenshots from `screenshots/iphone67-1290x2796/` and `screenshots/ipad129-2048x2732/`.
5. Answer the "App Privacy" questions with the answers in `listing.md`.
6. Select the uploaded build.
7. In "App Review Information", explain: "Oware is a traditional board game. Play the computer, two players on one device and the daily challenge with no connection. Online play needs no account: create a game and open the link on a second device."
8. Submit for review.
