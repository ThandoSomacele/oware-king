# The web address: owareking.object91.co.za

**Status: done.** The game is live at https://owareking.object91.co.za.

## What was set up

- `object91.co.za` is managed in Cloudflare. Its nameservers are `art.ns.cloudflare.com` and `val.ns.cloudflare.com`.
- The website and email records were copied from Afrihost and are set to "DNS only", so the website and email still run on the same Afrihost servers.
- `owareking.object91.co.za` is connected to the game as a custom domain (`routes` in `wrangler.jsonc`). Cloudflare manages its DNS record and security certificate.
- The older address `https://oware-king.oware-king.workers.dev` still works.

## Good to know

- DNS changes for object91.co.za are now made in Cloudflare. The DNS editor at Afrihost no longer has any effect.
- At the registrar, only the two Cloudflare nameservers must be listed. Remove any other nameserver.
- The Android, Windows and iPhone apps, the TV app and the store pictures all use `owareking.object91.co.za`. If this address ever changes: the store apps must be made again and reviewed again, the TV app needs a new version, the pictures must be remade, and players lose their saved name and streak.
