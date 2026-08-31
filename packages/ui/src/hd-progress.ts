import { css, html, LitElement } from 'lit'
import { colorVar, surface } from './tokens.css.js'

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
        background: ${colorVar('--hd-color-accent')};
        height: 100%;
        transition: width 160ms ease-out;
      }
      .fill[data-done='true'] {
        background: ${colorVar('--hd-color-done')};
      }
      .caption {
        color: ${colorVar('--hd-color-muted')};
        font-size: 0.8rem;
        margin-top: 4px;
      }
      .status {
        align-items: center;
        color: ${colorVar('--hd-color-muted')};
        display: inline-flex;
        font-size: 0.8rem;
        gap: 6px;
      }
      .status[data-done='true'] {
        color: ${colorVar('--hd-color-done')};
      }
      .status .icon {
        font-size: 0.9rem;
        line-height: 1;
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

  /**
   * A max of 0 or 1 can only ever read 0% or 100%: one bit of information.
   * A full-width bar for that is decoration, and the heaviest element in a
   * row that carries the least meaning. Below this max, render a compact
   * done/not-done status instead — see `renderCompact`.
   */
  override render() {
    return this.max <= 1 ? this.renderCompact() : this.renderBar()
  }

  private renderCompact() {
    const done = this.max > 0 && this.value >= this.max
    return html`
      <div
        class="status"
        role="progressbar"
        aria-label=${this.label}
        aria-valuenow=${this.value}
        aria-valuemin="0"
        aria-valuemax=${this.max}
        data-done=${String(done)}
      >
        <span class="icon" aria-hidden="true">${done ? '✓' : '○'}</span>
        <span class="status-text">${done ? 'Done' : 'Not done'}</span>
      </div>
    `
  }

  private renderBar() {
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
