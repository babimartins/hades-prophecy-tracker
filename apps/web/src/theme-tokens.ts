import { rootTokensCss } from '@hades/ui'

/**
 * Injects the shared colour tokens from `@hades/ui` as a `:root` stylesheet.
 * `packages/ui` is the single source of these values; this only applies
 * them, so the document never carries a second, hand-typed copy.
 *
 * The tokens land in a real `<style>` element appended to `<head>`, not an
 * inline style on `documentElement`. Inline style always wins the cascade
 * for its own element, which would block a page-level override; a `<style>`
 * element follows normal cascade rules instead, so a stylesheet loaded
 * later, or one with a more specific selector, can still override a token.
 */
export function applyDesignTokens(doc: Document = document): void {
  const style = doc.createElement('style')
  style.dataset.hdTokens = ''
  style.textContent = rootTokensCss()
  doc.head.append(style)
}
