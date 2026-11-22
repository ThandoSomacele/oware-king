# The web address: owareking.object91.co.za

The game runs on Cloudflare. Cloudflare can only serve the game at an address under object91.co.za if it manages the DNS for object91.co.za.

**Status:** object91.co.za has been added to the Cloudflare account and its 20 DNS records have been copied (all set to "DNS only", so the website and email keep pointing at the same servers). It becomes active when the nameservers are changed at the registrar (Option A, step 5).

Settle this before the Android, Windows and iOS steps. Those apps are tied to the web address.

## Option A (recommended): move the DNS of object91.co.za to Cloudflare

This is free. Your website and email stay with their current hosts. Only the "address book" for the domain moves.

1. Sign in to the Cloudflare dashboard.
2. Select "Add a domain" and enter `object91.co.za`.
3. Select the Free plan.
4. Check the list of DNS records that Cloudflare found. Compare it with the records at your current DNS provider. Add any that are missing, especially the email (MX) records.
5. Cloudflare shows two nameservers. Sign in where you registered object91.co.za and replace the nameservers with those two.
6. Wait until Cloudflare shows the domain as "Active". This can take up to one day.
7. Tell me. I then connect `owareking.object91.co.za` to the game, update the TV app, the privacy link and the listing, and remake the store pictures.

Risk: if a DNS record is missing in step 4, the website or email for object91.co.za stops working until the record is added. Do step 4 with care.

## Option B: buy a separate domain

1. Buy `owareking.com` or `owareking.co.za`, in Cloudflare or elsewhere.
2. If you bought it elsewhere, add it to Cloudflare as in Option A, steps 1 to 6. A new domain has no website or email to break.
3. Tell me. I connect it.

## Option C: stay on the current address for now

`https://oware-king.oware-king.workers.dev` works for the web and the TV. If you publish to any store on this address and change it later: the Android, Windows and iPhone apps must be made again with PWABuilder and sent for review again, the TV app needs a new version sent to LG, the store pictures must be remade (they show the address), and players on the web, Android, Windows and iPhone lose their saved name and streak.
