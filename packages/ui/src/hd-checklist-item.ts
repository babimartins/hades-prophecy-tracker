import { css, html, LitElement } from 'lit'
import { colorVar, surface } from './tokens.css.js'

/** Fires `hd-toggle` with `detail: { checked: boolean }` on user input. */
export class HdChecklistItem extends LitElement {
  static override readonly styles = [
    surface,
    css`
      label {
        align-items: center;
        cursor: pointer;
        display: flex;
        gap: var(--hd-gap);
        padding: 6px 0;
      }
      input {
        accent-color: ${colorVar('--hd-color-accent')};
        flex-shrink: 0;
        height: 18px;
        width: 18px;
      }
      /**
       * A long label truncates instead of wrapping to two or three lines.
       * min-width: 0 is what lets a flex child shrink below its content
       * size at all; without it overflow/text-overflow have nothing to do.
       */
      .label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .badge {
        color: ${colorVar('--hd-color-muted')};
        flex-shrink: 0;
        font-size: 0.75rem;
        margin-left: auto;
        white-space: nowrap;
      }
    `,
  ]

  static override readonly properties = {
    label: { type: String },
    checked: { type: Boolean, reflect: true },
    badge: { type: String },
  }

  label = ''
  checked = false
  badge = ''

  private onChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.checked = checked
    this.dispatchEvent(
      new CustomEvent('hd-toggle', { detail: { checked }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <label>
        <input type="checkbox" .checked=${this.checked} @change=${this.onChange} />
        <span class="label">${this.label}</span>
        ${this.badge ? html`<span class="badge">${this.badge}</span>` : null}
      </label>
    `
  }
}

customElements.define('hd-checklist-item', HdChecklistItem)

declare global {
  interface HTMLElementTagNameMap {
    'hd-checklist-item': HdChecklistItem
  }
}
