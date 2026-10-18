# Research

Problem: brands, creators, and small agencies repeatedly ask how to turn expected views into a sponsorship fee, and how to check whether a quoted fee can pay back after clicks and conversions. Subscriber counts are a poor substitute for views. Quoted CPM and delivered CPM are often confused.

## Public discussions (paraphrased)

1. r/PartneredYoutube thread on pricing a 60-90 second integration. Multiple people independently priced from views and niche CPM rather than subscriber count.
   https://www.reddit.com/r/PartneredYoutube/comments/1eg21ry/how_much_should_i_charge_for_a_sponsorship_60k

2. r/branddeals discussion separating quoted CPM, contract CPM, and delivered CPM after actual views. Formula: payment / actual views * 1,000.
   https://www.reddit.com/r/branddeals/comments/1qv3jcr/how_to_calculate_your_true_cpm_from_cpm_brand/

3. r/PartneredYoutube thread on 2023-2024 sponsorship pricing. Practitioners described pricing from average views, not subs, and noted CPM bands moving with the market.
   https://www.reddit.com/r/PartneredYoutube/comments/198mcek/4000000_of_secured_sponsorships_in_2023_what_we/

4. Public 2026 explainers that publish the same core formula (expected views / 1,000 * sponsor CPM) and warn that extras sit on top of that base.
   https://creatorsagency.co/blog/youtube-sponsorship-rates
   https://outlierkit.com/resources/youtube-sponsorship-rates/

## Existing tools and the gap

- AdSense / RPM calculators estimate YouTube ad revenue, not sponsor fees.
- Commercial sponsor calculators exist but are product-gated and not inspectable.
- Generic social ROI packages take revenue and cost and return a ratio; they do not model format multipliers or delivered CPM.
- Neil Fox repos already cover strategy (creator-compass) and link hygiene (utm-builder-neil, creator-link-kit). None do deal math.

This repository is intentionally smaller: transparent formulas, client-side only, tests for the arithmetic, and explicit "not a quote" labeling.

## 2026-09-03 add-on follow-up

Operators still need a transparent way to lift an organic views-based fee when a brief asks for paid reuse or a category lockout. Public creator-rate posts and agency briefs commonly treat:

- Whitelisting / spark / paid amplification as a 20–75% lift depending on term
- Category exclusivity as a 15–40% lift for 30–90 day windows
- Extra organic assets as a fraction of the hero placement rather than a second full fee

This repo keeps those as labeled planning multipliers. They are not a survey or a market index. Sources informing the shape (not copied): industry explainers on influencer whitelisting and exclusivity riders, plus the gap called out in this project's own README after the MVP landed.
