# Contributing

One coherent change per pull request.

1. Edit `src/deal-math.js` for fee formulas, or the matching `src/*.js` module for campaign, payout, commission, or promo math.
2. Add or update tests next to the module in `tests/`.
3. Keep the HTML UI aligned with the library. Do not re-implement formulas in the page script.
4. Run `npm test` (Node 20+).
5. Do not add tracking, accounts, or large dependencies.

Niche CPM bands are planning defaults, not market promises. If you change a band, document the source in `RESEARCH.md` and keep the UI label honest.
