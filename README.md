# Creator Deal Math

Privacy-first calculator for YouTube creator sponsorship planning.

Open `index.html` locally. The page never sends inputs to a server.

## Who it is for

- Brands and small agencies deciding whether an offered creator fee is in a plausible range
- Creators who want a views-based starting point before a conversation
- Operators who need implied CPM, delivered CPM, and a back-of-envelope CPA / ROAS check

It does **not** scrape channels, recommend creators, send outreach, or store campaign data.

## What it calculates

| Output | Formula |
| --- | --- |
| Organic base fee | `expected views / 1,000 * niche CPM * format multiplier` |
| Suggested fee | `organic base * usage multiplier * exclusivity multiplier + organic base * 0.15 * extra placements` |
| Quote check | Compare quoted fee to the add-on-adjusted low / mid / high |
| Implied CPM | `quoted fee / expected views * 1,000` |
| Delivered CPM | `quoted fee / actual views * 1,000` |
| Estimated clicks | `expected views * CTR` |
| Estimated conversions | `clicks * conversion rate` |
| CPA | `fee / conversions` |
| ROAS | `estimated revenue / fee` |
| Breakeven CVR | `fee / (clicks * AOV)` |

Format multipliers used here:

- Integration: 1.0
- Dedicated video: 1.4
- Short mention / end card: 0.7
- Shorts: 0.5

Niche CPM bands are **planning defaults**, not a market index. Use the custom band when you have better numbers.

Usage and exclusivity multipliers used here:

- Organic only: 1.0
- Paid boost / whitelist up to 30 days: 1.2
- Whitelisting up to 90 days: 1.4
- Perpetual paid usage: 1.75
- No exclusivity: 1.0
- 30 / 60 / 90 day category exclusivity: 1.15 / 1.25 / 1.4
- Each extra organic placement: +15% of the organic base fee (max 8)

## Limitations

- Views are an input. The tool does not fetch YouTube Analytics.
- Funnel results are only as good as the CTR, conversion rate, and AOV you type.
- Add-on multipliers are planning defaults, not a contract clause or legal rate card.
- Production time, travel, and talent-specific premiums are still not priced.
- A high-fit micro creator can outperform a cheaper large channel. Fit is out of scope; see [creator-compass](https://github.com/NeilFoxAgency/creator-compass).

## Setup

Requirements: Node.js 20+ for tests. The calculator itself has no build step.

```sh
git clone https://github.com/NeilFoxAgency/creator-deal-math.git
cd creator-deal-math
node --test tests/deal-math.test.js
```

Then open `index.html` in a browser.

A synthetic example lives in `examples/sample-deal.json`.

## Privacy

- No accounts, cookies, analytics, or third-party scripts
- No creator contact collection
- CSV export neutralizes formula-like cells
- See [SECURITY.md](SECURITY.md)

## Related tools

- [utm-builder-neil](https://github.com/NeilFoxAgency/utm-builder-neil) — client-side UTM links
- [creator-link-kit](https://github.com/NeilFoxAgency/creator-link-kit) — link hygiene and placement IDs
- [creator-compass](https://github.com/NeilFoxAgency/creator-compass) — sponsorship territory strategy

## License

MIT
