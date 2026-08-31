import { css, unsafeCSS } from 'lit'

/**
 * The Hades palette. This object is the single source of truth for every
 * consumer of `@hades/ui`: no other file in this repository writes one of
 * these five hex values. `apps/web` reads it to build its own `:root`
 * stylesheet instead of retyping the values.
 *
 * Every text-on-surface pair meets WCAG AA (4.5:1 for body text, 3:1 for
 * large text and for meaningful non-text elements such as the progress bar
 * fill and the focus ring). See `.superpowers/sdd/2026-08-17-slice-2-codex/design-report.md`
 * for the computed ratios.
 *
 * The accent was `#e35563`, a red. On `#150e19` it read as an error on things
 * that are only progress and selection, which is the objection the owner had
 * already made about green reading as success. Bronze makes one warm scale
 * with `--hd-color-done`: a bar fills bronze and turns gold when it completes.
 *
 * Measured against the page background `#150e19` and the surface `#241627`:
 *
 * | pair                  | ratio |
 * | --------------------- | ----- |
 * | accent on background  |  4.97 |
 * | accent on surface     |  4.52 |
 * | accent against done   |  1.90 |
 *
 * The last row is the constraint that rules out the brighter candidates. A bar
 * that is part accent and part done must show which is which, and lilac or
 * teal sit at 1.10 and 1.01 against the gold. No text is ever drawn on the
 * accent: every accent background in the app is a pip or a bar fill.
 *
 * **Hue carries as much as contrast here.** Every foreground colour used to sit
 * between 30 and 44 degrees: cream 41, muted 39, bronze 30, gold 44, against a
 * background at 278. Four colours in one band, told apart by saturation alone,
 * and the muted read as dusty gold rather than as quiet secondary text.
 *
 * The muted now takes the background's hue and the warm band is left to the two
 * colours that mean something:
 *
 * | token  | hue | what it is        |
 * | ------ | --- | ----------------- |
 * | bg     | 278 | the page          |
 * | surface| 289 | a panel           |
 * | muted  | 280 | secondary text    |
 * | accent |  30 | progress          |
 * | done   |  44 | finished          |
 * | text   |  34 | body text         |
 *
 * The cream also dropped from 57% saturation to 40%, so the gold is the warmest
 * thing on screen rather than competing with every line of body text.
 */
export const colorTokens = {
  '--hd-color-text': '#efe6da',
  '--hd-color-muted': '#ac9eb3',
  '--hd-color-surface': '#241627',
  '--hd-color-accent': '#b57433',
  '--hd-color-done': '#d8b34a',
} as const

export type ColorTokenName = keyof typeof colorTokens

/**
 * Renders `colorTokens` as a CSS rule body. A consumer builds its own
 * `:root` stylesheet from this, so the two never fall out of sync.
 */
export function rootTokensCss(selector = ':root'): string {
  const declarations = Object.entries(colorTokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')
  return `${selector} {\n${declarations}\n}`
}

/**
 * `var(--token, fallback)` for one entry of `colorTokens`, for use inside a
 * Lit `css` template. The fallback keeps a component in `@hades/ui` usable
 * on its own, with no consumer stylesheet present.
 */
export function colorVar(name: ColorTokenName) {
  return unsafeCSS(`var(${name}, ${colorTokens[name]})`)
}

/**
 * Shared surface styles.
 *
 * This block only *reads* the colour custom properties, through `colorVar`;
 * it never redeclares one of them on `:host`. That matters: a value set
 * higher in the DOM — for example on a consuming app's `:root`, the way
 * `apps/web` does — inherits through untouched and wins. A literal
 * `:host { --hd-color-text: ...; }` here would instead always win over an
 * inherited `:root` value, because a value specified directly on an element
 * beats an inherited one regardless of the ancestor rule's specificity.
 * `packages/ui/test/tokens.test.ts` demonstrates the override.
 */
export const surface = css`
  :host {
    --hd-radius: 8px;
    --hd-gap: 12px;
    color: ${colorVar('--hd-color-text')};
    font-family: system-ui, sans-serif;
  }
`
