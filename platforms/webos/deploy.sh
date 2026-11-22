#!/bin/sh
# Build and install Oware King on the TV. Needs tools/tv-relay.py from the webos-apps project running,
# and the TV in Developer Mode, exactly as for Photo Frame.
set -e
cd "$(dirname "$0")/../.."
nc -z 127.0.0.1 9922 2>/dev/null || { echo "Start the relay first: /usr/bin/python3 -I ../webos-apps/tools/tv-relay.py &"; exit 1; }
node build.mjs
mkdir -p dist-ipk
npx ares-package dist-tv -o dist-ipk
npx ares-install --device tv-relay dist-ipk/com.object91.owareking_*_all.ipk
npx ares-launch --device tv-relay com.object91.owareking
