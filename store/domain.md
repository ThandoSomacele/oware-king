# The web address: owareking.object91.co.za

The game runs on Cloudflare. Cloudflare can only serve the game at an address under object91.co.za if it manages the DNS for object91.co.za. I checked: object91.co.za is not in the Cloudflare account that hosts the game (or the access token cannot see it).

Settle this before the Android, Windows and iOS steps. Those apps are tied to the web address.

## Option A (recommended): move the DNS of object91.co.za to Cloudflare

This is free. Your website and email stay with their current hosts. Only the "address book" for the domain moves.

1. Sign in to the Cloudflare dashboard.
2. Select "Add a domain" and enter `object91.co.za`.
3. Select the Free plan.
4. Check the list of DNS records that Cloudflare found. Compare it with the records at your current DNS provider. Add any that are missing, especially the email (MX) records.
5. Cloudflare shows two nameservers. Sign in where you registered object91.co.za and replace the nameservers with those two.
6. Wait until Cloudflare shows the domain as "Active". This can take up to one day.
7. Tell me. I then connect `owareking.object91.co.za` to the game and update the TV app, the privacy link and the listing.

Risk: if a DNS record is missing in step 4, the website or email for object91.co.za stops working until the record is added. Do step 4 with care.

## Option B: buy a separate domain

1. Buy `owareking.com` or `owareking.co.za`, in Cloudflare or elsewhere.
2. If you bought it elsewhere, add it to Cloudflare as in Option A, steps 1 to 6. A new domain has no website or email to break.
3. Tell me. I connect it.

## Option C: stay on the current address for now

`https://oware-king.oware-king.workers.dev` works for the web and the TV. If you publish to Google Play on this address and change the address later, the Android app must be rebuilt and updated.
