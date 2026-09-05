# Campaign slate rollup

Creator campaigns rarely book one talent. Operators still price each deal by hand, then add the fees in a sheet.

This module prices a pasted roster with the same formulas as the single-deal calculator and returns slate totals.

## Input

CSV or TSV. First row is a header. Required columns:

- `handle` (aliases: `creator`, `channel`, `name`)
- `expected_views` (aliases: `views`)

Optional: `quoted_fee`, `niche`, `format`, `usage`, `exclusivity`, `extra_placements`.

Handles are labels. Strip a leading `@`. Do not paste emails or private contact data.

Cap: 40 rows. Duplicate handles (case-insensitive) are skipped with a note.

## Output

For each usable row, `planDeal` runs with that row's niche / format / add-ons.

Totals:

- sum of expected views
- sum of suggested low / mid / high
- sum of quoted fees when present
- blended implied CPM = total quoted fee / total expected views × 1,000
- blended suggested CPM = total suggested mid / total expected views × 1,000
- largest spend share (quoted if present, otherwise suggested mid)

A concentration flag fires when one creator is 45% or more of slate spend. That is a planning note, not a reject.

## What it does not do

- Model audience overlap or incremental reach
- Fetch YouTube Analytics
- Store the roster
- Recommend creators or send outreach

## Privacy

Client-side only. Example CSV is synthetic.
