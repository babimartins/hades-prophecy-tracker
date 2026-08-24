import { colorVar } from '@hades/ui'
import { css, html, LitElement } from 'lit'

/** Fires `search-change` with `detail: { query }` on every keystroke. */
export class SearchBox extends LitElement {
  static override readonly styles = css`
    input {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: inherit;
      font: inherit;
      padding: 8px 10px;
      width: 100%;
    }
    input:focus-visible {
      outline: 2px solid ${colorVar('--hd-color-accent')};
    }
  `

  static override readonly properties = {
    value: { type: String },
  }

  value = ''

  private onInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value
    this.value = query
    this.dispatchEvent(
      new CustomEvent('search-change', { detail: { query }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <input
        type="search"
        aria-label="Search prophecies"
        placeholder="Search a prophecy or a step"
        .value=${this.value}
        @input=${this.onInput}
      />
    `
  }
}

customElements.define('search-box', SearchBox)

declare global {
  interface HTMLElementTagNameMap {
    'search-box': SearchBox
  }
}
