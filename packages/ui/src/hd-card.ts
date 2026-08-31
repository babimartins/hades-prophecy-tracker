import { css, html, LitElement } from 'lit'
import { colorVar, surface } from './tokens.css.js'

export class HdCard extends LitElement {
  static override readonly styles = [
    surface,
    css`
      section {
        background: ${colorVar('--hd-color-surface')};
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--hd-radius);
        padding: var(--hd-gap);
      }
      /**
       * Deliberately not the display font. Cinzel in small caps on every
       * card header — 13 of them on the dashboard alone — is hard to scan
       * at small sizes, and it wraps a long collection name onto two lines
       * inside its card. The display font stays for the page title and
       * section headings; a card header reads in the ordinary body font,
       * bolder and a touch larger to keep its own presence.
       */
      header {
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        margin-bottom: var(--hd-gap);
      }
    `,
  ]

  override render() {
    return html`
      <section>
        <header><slot name="header"></slot></header>
        <slot></slot>
      </section>
    `
  }
}

customElements.define('hd-card', HdCard)

declare global {
  interface HTMLElementTagNameMap {
    'hd-card': HdCard
  }
}
