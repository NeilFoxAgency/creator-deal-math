# Discount code vs flat fee

Planning helper for the optional **Discount code vs flat fee** panel.

## Inputs

| Field | Meaning |
| --- | --- |
| Flat fee | Quoted or planned creator sponsorship fee |
| Redemptions | Orders that used this creator's unique code |
| Average order value | Pre-discount ticket of those orders |
| Discount percent | Percent off granted by the code (0–100) |
| Affiliate percent | Optional creator commission on pre-discount gross (0–50) |

## Outputs

- Gross revenue = redemptions × AOV
- Discount cost = gross × discount percent
- Net revenue = gross − discount cost
- Brand net after flat fee = net revenue − flat fee
- CPA on redemptions = flat fee ÷ redemptions
- Effective ROAS = net revenue ÷ flat fee
- Affiliate payout = gross × affiliate percent (when entered)

If both a flat fee and an affiliate percent are present, the tool says which would have cost less on the **same** redemption count. That is a counterfactual, not a recommendation to change a live deal.

## What this is not

- Not a Shopify, Amazon Associates, or YouTube Analytics connector
- Not proof that every redemption was incremental or unique to the creator
- Not tax, refund, or COGS accounting
