#!/bin/sh
# Build and install Oware King on the TV. Needs tools/tv-relay.py from the webos-apps project running,
# and the TV in Developer Mode, exactly as for Photo Frame.
set -e
cd "$(dirname "$0")/../.."
nc -z 127.0.0.1 9922 2>/dev/null || { echo "Start the relay first: /usr/bin/python3 -I ../webos-apps/tools/tv-relay.py &"; exit 1; }
VERSION=$(node -p "require('./platforms/webos/appinfo.json').version")
IPK="dist-ipk/com.object91.owareking_${VERSION}_all.ipk"
node build.mjs
# Remove packages from earlier builds, so only this version can be installed.
rm -rf dist-ipk
mkdir -p dist-ipk
npx ares-package dist-tv -o dist-ipk
echo "Installing Oware King version ${VERSION} ($IPK)"
npx ares-install --device tv-relay "$IPK"
npx ares-launch --device tv-relay com.object91.owareking
echo "Done. The home screen on the TV should say: Version ${VERSION}"
