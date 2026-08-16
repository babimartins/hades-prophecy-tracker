import { css, html, LitElement } from 'lit'
import { surface } from './tokens.css.js'

export class HdProgress extends LitElement {
  static override readonly styles = [
    surface,
    css`
      .track {
        background: rgba(255, 255, 255, 0.12);
        border-radius: var(--hd-radius);
        height: 10px;
        overflow: hidden;
      }
      .fill {
        background: var(--hd-color-accent);
        height: 100%;
        transition: width 160ms ease-out;
      }
      .fill[data-done='true'] {
        background: var(--hd-color-done);
      }
      .caption {
        color: var(--hd-color-muted);
        font-size: 0.8rem;
        margin-top: 4px;
      }
    `,
  ]

  static override readonly properties = {
    value: { type: Number },
    max: { type: Number },
    label: { type: String },
  }

  value = 0
  max = 0
  label = ''

  private get ratio(): number {
    return this.max <= 0 ? 0 : Math.min(this.value / this.max, 1)
  }

  override render() {
    const percent = Math.round(this.ratio * 100)
    return html`
      <div
        class="track"
        role="progressbar"
        aria-label=${this.label}
        aria-valuenow=${this.value}
        aria-valuemin="0"
        aria-valuemax=${this.max}
      >
        <div class="fill" data-done=${String(percent === 100)} style="width: ${percent}%"></div>
      </div>
      <p class="caption">${this.value} / ${this.max} (${percent}%)</p>
    `
  }
}

customElements.define('hd-progress', HdProgress)

declare global {
  interface HTMLElementTagNameMap {
    'hd-progress': HdProgress
  }
}
