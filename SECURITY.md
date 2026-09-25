# Security

Creator Deal Math is a static page plus a small JavaScript library. It does not collect accounts, tokens, or campaign data.

## Reporting

Email security issues to the maintainer listed on [neilfoxagency.com](https://neilfoxagency.com/) or open a private GitHub security advisory on this repository. Do not file a public issue for an exploitable defect.

## Boundaries

- The page makes no application network requests after load.
- Do not add analytics, pixels, or third-party fonts/scripts.
- CSV export prefixes cells that look like spreadsheet formulas.
- Do not persist creator contact lists, live campaign fees, or customer data in this repository. Use the synthetic example only.
- If you fork the tool behind a server, treat uploaded numbers as business-sensitive and do not log them.
