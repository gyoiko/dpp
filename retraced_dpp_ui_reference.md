# Retraced DPP UI Reference

Source explored: https://map.retraced.com/products/VRIUF1QE1BF/journey
Date: 2026-09-03
Purpose: UI/UX reference notes only — for designing our own textile/garment Digital Product Passport (DPP). Not an analysis of ESG methodology, data architecture, or backend systems.

---

## Overall Layout

- The entire experience is a single **"card" widget**, not a full website: a fixed-width (~420–430px), rounded-corner, drop-shadowed panel centered on a plain neutral-gray backdrop. This is a strong signal the product is built to be **embedded** (iframe on a brand's product page, or opened directly from a QR code/NFC tag on a garment).
- The card does not appear to be responsive to browser window resizing — resizing the browser window did not reflow or widen the card; it stayed at its fixed mobile-app proportions. It behaves like a self-contained mobile screen regardless of the host viewport.
- Structure, top to bottom, on the **Journey** tab (the default/landing tab):
  1. **Map panel** — fixed-height header area, light blue ocean, beige landmasses, small "Powered by retraced" wordmark + logo pinned top-left over the map.
  2. **White content panel** below the map, containing:
     - A persistent **tab bar** (Journey / Products / Badges)
     - Tab-specific scrollable content below it
- Only the Journey tab shows the map; Products and Badges tabs replace the map area with their own hero content (a placeholder avatar circle for Products, nothing/plain white header for Badges).
- Typography: bold, large, rounded geometric sans-serif for headlines ("Product's Journey", "The Product's Badges"); a small light-gray label sits above each headline ("Discover your"); section headers are medium-weight with a light-gray numeric count badge right-aligned (e.g. "Steps & Processes ... 6").
- Color palette: white content background, near-black text, light gray secondary text, soft pastel-colored square icon badges (mint green, sage green, powder blue, pale yellow, dusty terracotta, light gray) used consistently to color-code each journey stage, light blue for map water/hero backgrounds, beige map landmasses.
- Rounded corners and soft drop shadow are used throughout: outer card, icon badges, avatar circles, photo thumbnails, badge photo cards.

## Navigation

Three persistent top-level tabs, shown as icon-over-label pairs in a horizontal bar just below the map/hero:
- **Journey** (open book icon) — default tab. Step-by-step supply-chain timeline.
- **Products** (t-shirt icon) — single product detail view (name, composition, gallery).
- **Badges** (star icon) — grid of sustainability/certification claim cards.

Active tab: bold/dark label + icon, with a thin black underline beneath the whole tab. Inactive tabs: gray label + gray icon, no underline. Tapping a tab is instant (no loading spinner) except when tapping resets Journey's expanded/collapsed state back to fully collapsed.

Within any tab, drilling into an entity or badge replaces the *entire card content* with a new full-screen sub-view that has its own back arrow (`<`) button top-left. This is a **stack-based navigation pattern** (push/pop), not a modal overlay — the sub-view takes over the whole card, including the map area, which is replaced by a photo/hero or blank space.

## Journey

- Headline block: light-gray "Discover your" + bold headline "Product's Journey", followed by a section header "Steps & Processes" with a count on the right (6, in this example).
- Below that: a **vertical timeline/stepper list** of process stages. Each stage row has:
  - A small circular gray dot on a thin vertical dashed/solid connector line (left edge), forming a continuous timeline down the whole list.
  - A colored square icon badge (rounded corners, pastel background, line-art icon) representing the stage type.
  - A bold stage title (e.g. "Raw material creation") and a one-line gray description (e.g. "Origin of the raw material.").
- The 6 fixed stage types observed, in order, each with a distinct pastel color and icon:
  1. **Raw material creation** (mint green, leaf/sprout icon) — "Origin of the raw material."
  2. **Raw material processing** (sage green, factory/building icon) — "Refining and supplying material."
  3. **Yarn processing** (powder blue, yarn spool icon) — "Spinning raw material into yarn."
  4. **Fabric processing** (pale yellow, woven fabric icon) — "Processing and turning yarn into fabric."
  5. **Manufacturing** (dusty terracotta, sewing machine icon) — "The different manufacturing steps and processes."
  6. **Retailer** (light gray, shopping bag icon) — "Fashion company that designs and commercializes the product."
- **Expand/collapse interaction**: Tapping anywhere on a stage row (icon, title, or description) toggles it open. When open:
  - An "X" (close) icon appears at the far right of that stage's row.
  - One or more **sub-entity rows** appear nested beneath it, connected by a thin curved line branching off the main vertical timeline.
  - Only one stage can reasonably be open at a time in practice (each has its own X to close), though multiple were kept open together during testing without visual breakage — layout just grows taller.
- **Sub-entity rows** (the actual companies/facilities in that stage) show:
  - A small circular **avatar**: either a real logo image (e.g. "suminter" wordmark on black), a company photo/thumbnail, or a colored circle with **two-letter initials** (e.g. "CO", "ST", "SG") when no logo/photo is available — a clear fallback avatar pattern.
  - Bold **role/activity label** (e.g. "Farm", "Ginning mill", "Spinning", "Fabric dyeing", "Knitting", "Fabric printing", "Cut make trim (CMT)", "Retailer") — this is the *function performed*, not the company name.
  - Company legal name (e.g. "The Suminter Organic and Fair Trade Cotton Ginning Mills Pvt. Ltd.").
  - Country (plain text, e.g. "India").
  - A stage can have **multiple sub-entity rows** stacked (e.g. Raw material creation had 2 farms; Fabric processing had 4 sub-activities: 2x Fabric dyeing, Knitting, Fabric printing) — the supply chain is not always 1:1 per stage.
  - Some sub-entity rows, but not all, show a **"+" expand icon** on the right. Tapping "+" reveals a nested **"Received goods from"** line with another (upstream) entity's name below it, connected by another small curved branch line. This exposes upstream traceability *inline*, one hop at a time, without leaving the Journey view. The "+" becomes an "X" once expanded (to collapse it again).
  - Some "Received goods from" links rendered as **truncated text ending in "…"** even at full width in this test (e.g. "The…", "Chetna…") — this may be a genuine data/rendering quirk in the live site rather than intentional truncation, or intentional (click to reveal full name via navigation, see below).
  - Rows **without** any upstream data and without a logo/photo (seen for the generic "Retailer" sub-entity) show no "+" and no country — i.e. the amount of detail shown scales with how much data exists for that node.
- **Drilling into an entity**: Clicking the *underlined/linked upstream entity name* (the "Received goods from X" text) — but **not** the top-level sub-entity's own name/photo, which is not itself a link — navigates into a **full entity detail sub-screen** (see "Components → Entity detail screen" below), replacing the whole card content and showing a `<` back button.
- Multiple stages can reference the **same upstream company** (e.g. "Shiva Tex Yarn Limited" appears as the primary entity for "Spinning" under Yarn Processing, and again as an upstream "Received goods from" link under Fabric processing's dyeing/knitting entries) — the underlying data model is a **graph** (each node can have multiple suppliers/customers), but the UI presents it as a simplified linear stepper with inline branch-expansion for the graph edges.
- Collapsing a stage (tapping its "X") fully resets that stage's sub-list, hiding all nested expansions too.
- Navigating back into the Journey tab (via bottom tab bar or via the back arrow from a drilled-in entity screen) **resets all stages to collapsed** and scrolls back to the top — no expand-state is preserved.

## Map

- Sits above the tab bar/content panel only on the Journey tab; occupies a fixed-height rectangle with rounded top corners matching the card.
- Shows a light, low-detail base map (Mapbox/vector-tile style: pale blue ocean, cream/beige landmasses, faint gray country borders and labels) zoomed to fit all sourcing locations for this product (Europe + South/Central Asia in this example).
- **Markers**: dark navy/black classic map-pin (teardrop) icons, one per distinct facility location. In this product's case: ~4 pins — one isolated pin (Northern Europe/Baltic region — likely the brand HQ, "Dedicated Sweden AB") and a cluster of ~3 pins close together (India/Pakistan region, where all the raw-material/processing facilities are).
- **Marker interaction**: clicking directly on a pin did **not** open any popup, tooltip, or navigate anywhere in this test (multiple precise click attempts on pin coordinates produced no visible change). The map appears to be **non-interactive / decorative** in this implementation — it communicates "your product traveled through these places" at a glance rather than functioning as a clickable component. (It's possible marker click targets are extremely small/precise or gated behind exact pixel hitboxes not found during testing — worth assuming non-interactive unless proven otherwise.)
- The map does **not** visibly change, zoom, or highlight a marker when a corresponding Journey stage is expanded in the list below — the two panels did not appear to be linked/synchronized in this test.
- "Powered by retraced" attribution (small pin-drop logo mark + wordmark) sits top-left over the map, on every load of the Journey tab.
- The map resets to its default overview extent whenever you return to the top-level Journey tab.

## Products

- Selecting the Products tab replaces the map with a **large circular avatar placeholder** (gray circle with a generic image icon) centered on a pale-blue rectangular hero background — in this case no product photo was actually loaded, so the placeholder state itself is a useful reference for empty/fallback states.
- Below the hero: a **two-line stacked title** treated as one heading block — appears to be "Product name" + "Product model/variant name" both in the same large bold headline style, stacked (e.g. "T-shirt Stockholm" / "Give Me Some Space") with no visible label distinguishing which line is which.
- **"Product Composition" section**: a section header, then one row per material:
  - Small square photo thumbnail (rounded corners) of the raw material (e.g. a cotton-boll photo).
  - Bold percentage (e.g. "100%") + material name below it (e.g. "Organic Cotton").
  - A "+" expand icon on the right, same interaction pattern as Journey sub-entities.
  - Expanding in-place reveals a **paragraph-length educational description** of the material (what it is, its environmental/social attributes) directly below the row, still within the Products tab (no navigation) — this is a distinct pattern from Journey ("+"expands inline text description) vs. Badges ("+`/chevron` navigates to a full sub-screen).
  - A product can list multiple composition rows if it's a material blend (only one shown here: 100% Organic Cotton).
- **"Gallery" section**: section header followed by an **empty state**: a small gray image-placeholder icon centered, with light-gray text "No content yet" beneath it. This is the product's own photo gallery when the brand hasn't uploaded any images — a clean, minimal empty-state pattern worth reusing.
- No map, no back button, no further drill-down navigation observed on this tab beyond the inline expand of composition rows.

## Badges

- Selecting Badges replaces the hero area entirely with plain white space directly under the tab bar (no image, no map).
- Headline block: bold "The Product's Badges" title + a gray descriptive paragraph explaining badges are earned from "a combination of companies in the supply chain, materials used and documents or certifications attached to the companies involved" — i.e. badges are a **derived/aggregated** trust signal, not manually curated marketing claims (as messaged to the end user).
- **Badge grid**: a strict **2-column grid of cards**, each card =
  - A rectangular photo (full-bleed, rounded top corners only) — evocative lifestyle/industry photography (cotton bolls, a farmer in a field, a garment factory floor, misty forest) rather than literal certificate/logo images at the grid level.
  - Bold title below the photo (e.g. "Certified Material Composition", "Fair Trade Material Data Available", "Working Conditions Audited", "Environmental Initiatives Disclosed").
  - A short gray explanatory paragraph under the title, describing in plain language what the badge category means (not a specific claim yet — that comes on drill-down).
- Four badge categories were observed for this product: **Certified Material Composition**, **Fair Trade Material Data Available**, **Working Conditions Audited**, **Environmental Initiatives Disclosed**. These read as fixed high-level *categories* of sustainability claims (materials / labor / fair trade / environment) that the platform organizes underlying certificates into, rather than one-badge-per-certificate.
- **Drilling into a badge category** (tap anywhere on the card) navigates to a full-screen sub-view (`<` back button), structured almost identically to an entity detail screen:
  - Large photo hero at top (same photo as the grid card, now full width).
  - Bold title (repeated).
  - Small gray subtitle/type label as a category tag — not clearly labeled on the category screen, but present as "Badge" on the underlying claim screen (see below).
  - Horizontal divider.
  - Plain-language description paragraph (same text as the grid card).
  - Horizontal divider.
  - **"Details" section**: one row per underlying certificate/claim that rolls up into this badge category, each row = small square photo/placeholder thumbnail, bold claim name (e.g. "Sustainable Materials", "Fairtrade Cotton", "SA8000", "Environmental Engagement"), gray company name below it (e.g. "Dedicated Sweden AB" or a specific supplier like "The Rajlakshmi Cotton Mills Pvt. Ltd."), and a `>` chevron on the right indicating further drill-down.
  - A badge category can have **one or more** underlying claim rows (only one was seen per category in this product, but the chevron/list pattern clearly supports more).
- **Drilling into an individual claim** (tapping a Details row) navigates one level deeper to a **claim/certificate detail screen**:
  - Small square **logo/certificate image** (not a lifestyle photo this time — an actual certification mark/logo, e.g. a "Textile Exchange Material Change Index — Leading" badge graphic, or a "One Tree Planted" logo) top-left, next to the bold claim title (e.g. "Leading Brand 2020 – CFMB Textile Exchange", "Tree Planting Campaign").
  - Small gray type label under the title: **"Badge"**.
  - Divider, then **"Claimant Company"** section header, then a small all-caps gray micro-label (e.g. "DEDICATED:") followed by the bold company name (e.g. "Dedicated Sweden AB") — this micro-label appears to be a truncated/cut-off word (possibly "Dedicated by:" or similar), another minor real-site text-rendering quirk worth noting rather than replicating literally.
  - Divider, then **"What is it?"** section header with a paragraph explaining the specific initiative/certification in detail (e.g. explaining the Textile Exchange Material Change Index methodology, or the One Tree Planted partnership).
  - **"See More" / "See Less" text toggle**, centered, bold, no icon — expands/collapses the paragraph in place (same pattern used on entity detail screens for company descriptions).
  - Divider, then a **"See proof" link** with a small "external link" icon (square with arrow) to its left — this is a **real external hyperlink** that opens a **new browser tab** pointing directly to a **PDF document** (the actual certificate/proof file), hosted on what appears to be a document/file server. This confirms the platform links out to primary-source evidence documents rather than just asserting the claim.
  - One claim screen observed had a **broken/missing hero image** (blank white space where a photo should have been) — useful as an observed failure/edge-case state, not something to intentionally replicate, but good to know real DPP data can have gaps.

## Components

Recurring, reusable UI patterns observed across the whole experience:

- **Card/panel**: the entire app is one large white rounded-corner card with drop shadow, centered on a neutral gray page background. Feels like a mobile app screen rendered in isolation.
- **Tab bar**: icon-over-label, 3 items, black underline + bold/dark text for the active tab, gray for inactive. No badges/counts on tabs themselves.
- **Section header row**: bold medium-size label, optionally with a light-gray count on the far right (e.g. "Steps & Processes  6").
- **Vertical timeline/stepper**: dot + connecting line down the left edge of a list, used only in Journey. Branches (curved connector lines) are used to visually nest sub-entities and upstream links under their parent.
- **Colored square icon badge**: rounded-corner square, pastel background tint, simple black line-art icon inside — one consistent color+icon per Journey stage type, reused wherever that stage is referenced.
- **Circular avatar**: used for individual companies/entities. Three fallback tiers observed: (1) real uploaded photo, (2) brand logo/wordmark on a plain background, (3) colored circle with 2-letter initials when nothing else is available.
- **Expand/collapse row ("+"/"X" toggle)**: tapping a row with a "+" reveals more content *inline* (no navigation) and the icon flips to "X"; tapping "X" collapses it back. Used in Journey (sub-entities, upstream links) and Products (composition rows).
- **Drill-down row (`>` chevron)**: visually similar list row, but tapping it **navigates** to a new full-screen view rather than expanding inline. Used in Badges' "Details" sections. The affordance distinguishing "expands in place" vs. "navigates away" is subtle — governed by the icon shape only ("+" = plus for expand, ">" = chevron for navigate) — worth being deliberate about this distinction in our own DPP so it's not confusing.
- **Full-screen sub-view / back navigation**: any drill-down (entity detail, badge category, individual claim, upstream supplier) replaces the entire card content with a new screen: hero image or blank space at top, `<` back arrow icon (in a small white rounded square button, top-left, floating over the hero) to return to the previous screen. This is a **single-direction stack**, not a modal/overlay — background dims/blurs were never used.
- **"See More" / "See Less" text toggle**: bold, centered (or left-aligned depending on context), no icon, plain text link that expands a truncated multi-line paragraph to full length and back. Used for company descriptions and claim explanations.
- **External link row**: small "open in new window" icon + bold label (e.g. "See proof"), opens a new browser tab to an external resource (PDF in the case tested).
- **Empty state**: centered small gray icon (generic image placeholder) + light-gray caption text below it (e.g. "No content yet"). Minimal, calm, non-alarming.
- **Divider lines**: thin, full-width, light gray, used generously to separate every logical section (title block / description / details list, etc.) rather than relying on whitespace alone.
- **Location/address row**: small map-pin icon + plain gray address text, seen on entity detail screens.

## Interaction Notes

### Journey → expand a stage (e.g. "Raw material creation")
- Row is clickable anywhere (icon, title, or description).
- Reveals nested sub-entity row(s) directly beneath, connected to the timeline by a curved branch line.
- An "X" appears on the stage's own row to allow re-collapsing.
- Multiple sub-entities can appear if more than one company performed that role.

### Journey → expand a sub-entity's "+" (e.g. "Ginning mill")
- Reveals a "Received goods from" line with the name of the upstream supplier directly below, connected by another curved branch.
- The "+" flips to an "X".
- The upstream name may render truncated ("The…") in this live instance.

### Journey → click the upstream supplier name text (e.g. "The…" / "Chetna…")
- Navigates (not expands) to a **full entity detail screen**: photo/logo hero (light blue background, circular avatar/logo centered, overlapping the boundary between hero and white content), bold company legal name, small icon+label row showing the entity's role/type (e.g. "🏭 Ginning mill", "🌱 Farm"), divider, a descriptive paragraph about the company with "See More"/"See Less" toggle, divider, and a pin-icon + plain-text street address.
- Back arrow (`<`) top-left returns to the Journey tab, but **fully resets/collapses** the whole Journey list rather than restoring the exact expanded state you were in.

### Products → expand a composition row's "+" (e.g. "100% Organic Cotton")
- Reveals a multi-sentence educational paragraph about the material directly beneath the row, in place (no navigation).
- "+" flips to "X" (or the row becomes visually "selected" with a border, observed once after a keyboard-driven collapse).

### Badges → click a badge category card (e.g. "Certified Material Composition")
- Navigates to a badge-category detail screen: full-width photo hero, title, description, divider, "Details" list of one or more underlying claims (each a chevron row).

### Badges → Details → click a claim row (e.g. "Sustainable Materials")
- Navigates one level deeper to the specific **claim/certificate screen**: small logo, title, "Badge" type label, "Claimant Company" section, "What is it?" section with See More/Less, and a "See proof" external link.

### Badges → claim screen → click "See proof"
- Opens a **new browser tab** to an external PDF file (the literal certificate/report document). Confirms real evidentiary documents sit behind claims, not just marketing text.

## Visual / UX Notes

- **Mobile-first, fixed-width card**: the whole thing behaves like a phone-screen-sized component regardless of desktop browser window size — it never reflows wider. For our own DPP this suggests designing one primary layout optimized for a narrow (~380–430px) viewport and treating desktop simply as "the same card, centered, with empty space around it" rather than building a separate wide desktop layout.
- **Consistent detail-screen template**: entity detail, badge-category detail, and claim detail screens all reuse the *same* structural template (hero → title → type/subtitle → divider → description w/ See More → divider → a list/detail section → optional external link/address). This strongly suggests a single reusable "detail screen" component in their design system driven by different data, which is a good pattern to copy: build one flexible detail-view component rather than bespoke screens per entity type.
- **Icon-driven color coding**: each Journey stage has one fixed pastel color + icon combination used consistently everywhere that stage is referenced (list row, badge, etc. — though badges did not reuse Journey's stage colors, they used photography instead). Consider whether our DPP wants a similar consistent color language per lifecycle stage.
- **Information density is low per screen**: each screen shows relatively little text/data at once, favoring progressive disclosure (collapse/expand, drill-down) over dense tables — appropriate for an end-consumer-facing, non-technical audience scanning a QR code, but likely insufficient on its own for a B2B/compliance-grade DPP; our version may need a "detailed/technical view" toggle that this consumer-oriented reference doesn't have.
- **Avatar fallback hierarchy** (photo → logo → colored initials) is a small but important detail: it ensures every entity always shows *something* even with incomplete supplier photo/logo data, which will likely be a real problem for us too (not every mill will supply a logo).
- **Empty states are calm and unobtrusive** ("No content yet" with a faint icon) rather than treated as an error — worth replicating for any DPP sections where data legitimately doesn't exist yet (e.g. a brand-new product with no gallery photos).
- **Real data gaps are visible in the live product**: at least one broken hero image, and a couple of truncated/cut-off text strings ("The…", "DEDICATED:") were observed. This is useful context — even a polished, production DPP UI from a specialist vendor has visible rough edges with real-world data, so our own UI should be resilient to missing/partial fields (truncate gracefully, never break layout).
- **Map is more decorative than functional** in this implementation — it sets context/mood ("this product traveled from here to here") rather than being a primary interactive navigation tool. If we want a more functional map (clickable pins linking to journey stages), that would be a meaningful differentiation from this reference, not a copy of it.
- **Iconography style**: simple, single-weight black line icons (no fill, no color) inside the colored square badges; a consistent minimalist icon set (leaf, factory, yarn spool, woven cloth, sewing machine, shopping bag, pin, image placeholder, chevron, plus/x, external-link box-arrow).
- **Spacing**: generous vertical padding around headlines and section headers; list rows are moderately compact (icon + 2 lines of text fit in ~56–64px row height); dividers add clear separation without needing extra vertical whitespace.

## Screens / States Found

1. Journey tab — default/collapsed (map + 6-stage stepper list, all collapsed).
2. Journey tab — one stage expanded, showing 1–4 sub-entity rows.
3. Journey tab — a sub-entity's "Received goods from" upstream link expanded (nested one level deeper, inline).
4. Entity detail screen (e.g. "The Suminter Organic and Fair Trade Cotton Ginning Mills Pvt. Ltd.", "Chetna Organic Agriculture Producer Company Ltd.") — hero/avatar, name, type tag, description w/ See More, address.
5. Products tab — product name(s), composition list (collapsed).
6. Products tab — a composition row expanded with full material description text.
7. Products tab — Gallery empty state ("No content yet").
8. Badges tab — 2x2+ grid of badge category cards.
9. Badge category detail screen (e.g. "Certified Material Composition", "Fair Trade Material Data Available", "Working Conditions Audited", "Environmental Initiatives Disclosed") — hero photo, description, "Details" list.
10. Claim/certificate detail screen (e.g. "Leading Brand 2020 – CFMB Textile Exchange", "Fairtrade Cotton" [not opened], "SA8000", "Tree Planting Campaign") — logo, "Badge" tag, Claimant Company, What is it? w/ See More, See proof external link.
11. Claim detail screen with a broken/missing hero image (real-world data-gap state).
12. External PDF opened in a new tab via "See proof" (outside the card widget itself, but part of the overall user flow).
13. Loading state — brief centered spinner (circular indeterminate) shown full-card while a sub-screen's data fetches, before the screen renders.
