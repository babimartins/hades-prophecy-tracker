import { css, html, LitElement } from 'lit'
import { colorVar, surface } from './tokens.css.js'

/** Fires `hd-toggle` with `detail: { checked: boolean }` on user input. */
export class HdChecklistItem extends LitElement {
  static override readonly styles = [
    surface,
    css`
      /**
       * A block host, not the custom-element default of inline. This is
       * always used as a full-width row, and an inline host containing
       * block-level shadow content sized its box to the label's min-content
       * width instead of its container's width -- with white-space: nowrap
       * on the label (an earlier version of this rule), that min-content
       * width could reach hundreds of pixels past the viewport, forcing the
       * page to scroll sideways. See the class doc comment.
       */
      :host {
        display: block;
      }
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
       * The label wraps normally. A version of this rule once truncated it
       * to one line with an ellipsis: that reached every consumer, not only
       * the card it was meant for, and a step in the requirement tree --
       * the view whose entire job is telling the player what to do -- could
       * lose the back half of its own instruction with no way to read it.
       * min-width: 0 is what lets a flex child shrink below its content
       * size at all, so a long label wraps inside the row instead of
       * pushing it wider.
       */
      .label {
        min-width: 0;
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
        <span class="label" title=${this.label}>${this.label}</span>
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
