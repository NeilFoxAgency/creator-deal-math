# Contributing

One coherent change per pull request.

1. Edit `src/deal-math.js` for formula or validation changes.
2. Add or update tests in `tests/deal-math.test.js`.
3. Keep the HTML UI aligned with the library. Do not re-implement formulas in the page script.
4. Run `node --test tests/deal-math.test.js`.
5. Do not add tracking, accounts, or large dependencies.

Niche CPM bands are planning defaults, not market promises. If you change a band, document the source in `RESEARCH.md` and keep the UI label honest.
