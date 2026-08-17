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
      header {
        font-family: var(--hd-font-display, inherit);
        font-weight: 600;
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
