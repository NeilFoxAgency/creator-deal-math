# Make-good planning

After a sponsored video’s measurement window, operators compare actual views to the views used to price the fee. This helper sizes a conversation. It is not a warranty, SLA, or contract clause.

## Policies

| Policy | When it triggers | What it suggests |
| --- | --- | --- |
| `report` | Always, once actual views exist | Delivery % and view shortfall only |
| `prorata` | Actual views below expected | Cash credit = quoted fee × missed views ÷ expected views |
| `floor80` | Actual views below 80% of expected | Cash credit only for the gap below the 80% floor |
| `extra_asset_80` | Actual views below 80% of expected | One extra organic asset, no cash credit |

## Example

Expected 10,000 views, quoted fee $400, actual 6,000 views:

- Report: 60% delivered, 4,000 short
- Pro-rata credit: $160
- 80% floor credit: $80 (gap from 6,000 to 8,000)
- Extra asset: suggest one more organic placement

## Limits

- Views are typed in. The page does not fetch YouTube Analytics.
- Credits use the quoted fee the operator entered, not a hidden rate card.
- Example fixtures are synthetic.
