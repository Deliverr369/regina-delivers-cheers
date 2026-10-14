# Roadmap

- [x] Connect deliverr.ca through Web Hosting Canada DNS without AWS access
- [ ] Publish Deliverr Android app to Google Play — blocked on private upload-key signing, Android SDK packaging, and Play Console submission
- [ ] Decide charging model: single hold+capture vs deposit-then-final charge (user request 2026-09-26)
- [x] Verify checkout full-name field (spaces, corrections, pasted names) sends matching name to the order and Stripe billing


## New tasks
- [x] Improve Google rankings toward #1 — added weekly-deals page + redirects for old ranked URLs; user-side: Google Business Profile & reviews
- [ ] GBP verification: waiting on user's Regina street address + postal code, then fetch options, user picks method, complete with PIN
- [x] Fix page addresses: About, Stores, Products, Privacy, Terms, How It Works and store pages now point at deliverr.ca (published 2026-10-14)
- [x] Weekly Deals flyers: Regina flyer feed now syncs automatically (daily 07:20 Regina) into public.flyers and shows under the Weekly Deals section — 7 merchants covered; Empire Offsale and Value Extra have no discoverable flyer source
- [x] Submit the current sitemap to Google Search Console — https://deliverr.ca/sitemap.xml accepted, 54 pages, 0 errors; the two stale 2017/2020 entries were removed
- [x] Re-submit the sitemap to Google automatically whenever the flyer section changes — the daily sync re-submits it whenever new flyers land
- [ ] Twilio: upgrade account so customer text messages can be delivered (trial blocks unverified numbers)
- [ ] Investigate why returning customers stopped ordering after the deliverr.ca launch — order history, repeat rate, and what old customers actually experienced (domain switch, broken customer texts, site hidden from Google until 2026-10-14)
- [ ] Make ranking data even more accurate — keep site hours, store pages and structured data matching the Google listing exactly
- [ ] Add more Regina-specific delivery blog posts so customers find the site and trust it
