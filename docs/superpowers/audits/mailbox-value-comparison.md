# Mailbox class-value comparison

Class names that exist in both projects (often Bootstrap-derived) but render
with different values. Notes on whether to adopt mailbox's value, keep
elements' choice, or expose a shared knob.

## Verified-equivalent (no action)

| Surface                      | Token                                         | Mailbox value     | Elements value                       | Status     |
| ---------------------------- | --------------------------------------------- | ----------------- | ------------------------------------ | ---------- |
| Toast padding-block          | `--{bs,set}-toast-padding-{y,block}`          | 0.75rem           | 12px (`spacing*3`)                   | match      |
| Toast padding-inline         |                                               | 1rem              | 16px (`spacing*4`)                   | match      |
| Toast gap                    |                                               | 0.75rem           | 12px (`spacing*3`)                   | match      |
| Toast font-size              |                                               | 0.875rem          | `--text-sm` = 14px                   | match      |
| Toast spacing (linear stack) |                                               | 0.75rem           | `spacing*3`                          | match      |
| Toast max-width              |                                               | 21.875rem (350px) | 22rem (352px)                        | within 2px |
| Focus ring width             |                                               | 0.25rem           | `--set-focus-box-shadow-width` = 4px | match      |
| Border-radius (md)           | `--bs-border-radius` / Tailwind `--radius-md` | 0.375rem (6px)    | 0.375rem (6px)                       | match      |
| Border-radius (lg)           | `--bs-border-radius-lg` / `--radius-lg`       | 0.5rem (8px)      | 0.5rem (8px)                         | match      |

## Differs (notable)

| Surface                     | Token                         | Mailbox value                 | Elements value                                                           | Action                                                                                                                                                 |
| --------------------------- | ----------------------------- | ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Button** padding-x        | `--bs-action-padding-x`       | 0.5rem (8px) at density=1     | `spacing*3` = 12px                                                       | KEEP — elements ships a more comfortable click target. Could be shifted via a `--set-density-factor` knob in future if consumers want compact layouts. |
| **Button** padding-y        | `--bs-action-padding-y`       | 0.25rem (4px)                 | `spacing*1.5` = 6px                                                      | KEEP — same rationale                                                                                                                                  |
| **Button** sm padding-x     | `--bs-action-sm-padding-x`    | 0.375rem                      | (no `.small` button-specific override; uses `--set-size-padding-inline`) | OK — elements composes through size cascade                                                                                                            |
| **Button** lg padding-x     | `--bs-action-lg-padding-x`    | 0.625rem                      | (no `.large` button-specific override)                                   | OK — same                                                                                                                                              |
| **Toast** border-radius     | `--bs-toast-border-radius`    | `--bs-border-radius` (6px)    | 0.5rem (8px)                                                             | DIVERGE INTENTIONALLY — elements settled on 8px for the rounder modern look. Could re-tighten to 6px for mailbox parity.                               |
| **Popover** border-radius   | `--bs-popover-border-radius`  | `--bs-border-radius-lg` (8px) | 0.5rem (8px)                                                             | match                                                                                                                                                  |
| **Popover** padding-y       | `--bs-popover-body-padding-y` | 0.75rem                       | 0.75rem                                                                  | match (recent port)                                                                                                                                    |
| **Popover** padding-x       | `--bs-popover-body-padding-x` | 0.75rem                       | 0.75rem                                                                  | match                                                                                                                                                  |
| **Popover** max-inline-size | `--bs-popover-max-width`      | 17.25rem (276px)              | 17.25rem                                                                 | match (recent port)                                                                                                                                    |
| **Tooltip** max-inline-size | `--bs-tooltip-max-width`      | 12.5rem (200px)               | 12.5rem                                                                  | match (recent port)                                                                                                                                    |
| **Tooltip** opacity         | `--bs-tooltip-opacity`        | 0.95                          | 0.95                                                                     | match (recent port)                                                                                                                                    |
| **Card** spacer-y           | `--bs-card-spacer-y`          | 1rem                          | (article inherits — verify)                                              | TODO — check `_article.scss`                                                                                                                           |
| **Card** spacer-x           | `--bs-card-spacer-x`          | 1rem                          |                                                                          | TODO                                                                                                                                                   |
| **Card** border-radius      | `--bs-card-border-radius`     | 8px (lg)                      | (article default)                                                        | TODO                                                                                                                                                   |

## Mailbox infrastructure mailbox uses, elements lacks

| Pattern                              | Mailbox                                                                             | Elements                                                                                 | Notes                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Density factor                       | `--bs-density-factor` (multiplier on every action padding)                          | none                                                                                     | Could add `--set-density-factor` so consumers dial the whole framework's density at `:root`. |
| Radius factor                        | `--bs-radius-factor` (multiplier on every radius)                                   | none                                                                                     | Could add `--set-radius-factor` for "sharp/angular" vs "very rounded" theming.               |
| Shadow scale                         | `--bs-box-shadow-{sm,base,lg}` distinct levels + `--bs-content-floating-box-shadow` | only per-component shadow tokens                                                         | Could add a 3-step elevation scale.                                                          |
| Color HSL triplets                   | `--bs-{color}-{step}-hsl` (raw H S L for transparency math)                         | only resolved colors                                                                     | Skipped — color-mix(... transparent) does the same job in modern browsers.                   |
| Per-color step scales (50-900)       | `--bs-{color}-{50…900}`                                                             | only the variant + `--color-{variant}-{bg-subtle, text-emphasis, border-subtle}` triplet | Skipped — derived via color-mix. Sufficient for our subtle/emphasis needs.                   |
| `tint($name, $alpha)` Sass function  | yes                                                                                 | inlined `color-mix()` calls                                                              | Inline is fine for the few places we use it.                                                 |
| `shade($base, $delta)` Sass function | yes                                                                                 | inlined                                                                                  | Same.                                                                                        |

## What mailbox does that we should MAYBE adopt later

### 1. `--set-density-factor` (low effort, high optionality)

Add to `_tokens.scss`:

```scss
--set-density-factor: 1;
```

Wrap every action-padding token's calc:

```scss
--set-button-padding-inline: calc(var(--spacing) * 3 * var(--set-density-factor));
```

Consumers can set `--set-density-factor: 0.75` for compact, `1.25` for spacious. Mailbox's `--bs-density-factor` does exactly this.

### 2. `--set-radius-factor` (low effort)

Same idea on the radius scale. Bypasses Tailwind's `--radius-*` tokens which are already in the consumer's hands, so mostly useful for partial-internal radii (`--set-toast-border-radius`, `--set-popover-border-radius`, etc.).

### 3. `--set-content-box-shadow-{sm, base, lg}` elevation scale

Currently only the popover surface has a curated shadow. Adding a single scale would let card / modal / toast / drawer share a common "lift" vocabulary the way mailbox does.

### 4. `--set-focus-ring-color` separation

Currently `focus-ring()` mixes in the variant background-color. Mailbox tokens the focus shadow color separately so a consumer can theme the ring (eg `var(--set-focus-ring-color)` defaulting to primary) without coupling to variants. Worth considering.

## Verdict

The token VALUES we ship are mostly aligned with mailbox already (particularly after the recent port pass — popover, tooltip, toast all match within 1–2 pixels). The biggest **architectural** gap is the absence of density-factor / radius-factor / shadow-scale knobs that mailbox uses to give consumers global control. Those are additive (no breaking changes) and worth a future port.

The biggest **deliberate divergence** is button + form padding density. Elements ships ~12/6 padding (comfortable for touch); mailbox ships ~8/4 (compact for desktop dashboards). The divergence is reasonable for elements' positioning as a modern semantic-HTML framework, but adding `--set-density-factor` would let consumers opt into mailbox's compact density without forking.
