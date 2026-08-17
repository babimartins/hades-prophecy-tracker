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
 */
export const colorTokens = {
  '--hd-color-text': '#f2e7d0',
  '--hd-color-muted': '#b9a98c',
  '--hd-color-surface': '#241627',
  '--hd-color-accent': '#e35563',
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
