# Agency commission split

Planning helper for the optional **Agency commission** panel.

## Models

| Model | Brand cash-out | Creator net | Agency fee |
| --- | --- | --- | --- |
| Brand markup | quoted fee + commission | quoted fee | commission |
| Withhold from creator | quoted fee | quoted fee − commission | commission |
| Split 50/50 | quoted fee + half commission | quoted fee − half commission | full commission |

Commission = quoted fee × percent / 100. Percent must be 0–50.

On a campaign slate, each row uses `quoted_fee` when present, otherwise suggested mid. One rate applies to the whole slate.

## What this is not

- Not an MSA, insertion order, or invoice term
- Not tax withholding
- Does not send invoices or collect payment

Last-cent leftovers on a 50/50 split go to the brand-markup half so agency fee still equals the full commission.
