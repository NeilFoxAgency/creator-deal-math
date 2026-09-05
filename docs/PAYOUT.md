# Payout milestones

Planning helper for when a brand should expect cash to leave the account.

## Policies

| id | Split |
| --- | --- |
| `fifty_fifty` | 50% booking (live − 14 days) / 50% on live |
| `all_on_live` | 100% on live |
| `thirty_forty_thirty` | 30% booking / 40% live / 30% live + 30 days |
| `net30_live` | 100% live + 30 days |

The last milestone receives the leftover cents so the parts equal the fee.

## Inputs

- Single deal: the quoted fee field on the form.
- Campaign slate: each priced row uses `quoted_fee` when present, otherwise suggested mid.

A live date is optional. When omitted, amounts still calculate and dates stay blank.

## Out of scope

- Staggered live dates per creator
- Tax withholding, platform fees, or talent-manager splits
- Binding payment terms
