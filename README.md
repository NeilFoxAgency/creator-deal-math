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
| Suggested fee | `expected views / 1,000 * niche CPM * format multiplier` |
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

## Limitations

- Views are an input. The tool does not fetch YouTube analytics.
- Funnel results are only as good as the CTR, conversion rate, and AOV you type.
- Usage rights, exclusivity, extra posts, whitelisting, and production time are not priced.
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
