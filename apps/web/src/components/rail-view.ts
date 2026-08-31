import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'

export interface RailItem {
  id: string
  label: string
  sub?: string | undefined
  done: number
  total: number
}

/**
 * A vertical rail with a detail pane.
 *
 * The owner asked for this over stacked collapses: 55 accordions lose your
 * place every time one opens, while the rail keeps the whole list visible and
 * comparable with one item open.
 *
 * The rail and the pane scroll independently **inside** the frame. Neither
 * grows the page, which is the rule the whole interface is built around.
 */
export class RailView extends LitElement {
  static override readonly styles = css`
    :host {
      display: grid;
      flex: 1;
      gap: 18px;
      grid-template-columns: 290px minmax(0, 1fr);
      min-height: 0;
      padding-bottom: 14px;
    }

    .rail {
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 12px;
      min-height: 0;
      overflow-y: auto;
    }

    .rail button {
      background: none;
      border: 0;
      border-bottom: 1px solid ${colorVar('--hd-color-surface')};
      border-left: 2px solid transparent;
      color: inherit;
      cursor: pointer;
      display: block;
      font: inherit;
      padding: 10px 14px;
      text-align: left;
      width: 100%;
    }

    .rail button:last-child {
      border-bottom: 0;
    }

    .rail button[aria-selected='true'] {
      border-left-color: ${colorVar('--hd-color-accent')};
    }

    .rail button[aria-selected='true'] .name {
      color: ${colorVar('--hd-color-accent')};
    }

    .name {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .meta {
      align-items: center;
      color: ${colorVar('--hd-color-muted')};
      display: flex;
      font-size: 0.68rem;
      gap: 8px;
      margin-top: 4px;
    }

    .bar {
      background: ${colorVar('--hd-color-surface')};
      border-radius: 3px;
      flex: 1;
      height: 5px;
      min-width: 0;
      overflow: hidden;
      position: relative;
    }

    .bar i {
      background: ${colorVar('--hd-color-accent')};
      border-radius: 3px;
      display: block;
      height: 100%;
    }

    .pane {
      min-height: 0;
      min-width: 0;
      overflow-y: auto;
      padding-right: 4px;
    }

    /*
     * Below 860px the rail sits above the pane, capped so the pane keeps most
     * of the frame. Both still scroll inside it; the page still does not.
     */
    @media (max-width: 860px) {
      :host {
        grid-template-columns: 1fr;
        grid-template-rows: auto minmax(0, 1fr);
      }

      .rail {
        max-height: 200px;
      }
    }
  `

  static override readonly properties = {
    items: { attribute: false },
    selected: { type: String },
    label: { type: String },
  }

  items: RailItem[] = []
  selected = ''
  label = 'Items'

  #select(id: string): void {
    this.selected = id
    this.dispatchEvent(
      new CustomEvent('rail-select', { detail: { id }, bubbles: true, composed: true }),
    )
  }

  override render(): TemplateResult {
    const current = this.selected || this.items[0]?.id || ''
    return html`
      <div class="rail" role="tablist" aria-label=${this.label}>
        ${this.items.map(
          (item) => html`
            <button
              role="tab"
              data-item=${item.id}
              aria-selected=${current === item.id}
              @click=${() => this.#select(item.id)}
            >
              <span class="name">${item.label}</span>
              <span class="meta">
                ${item.total > 0
                  ? html`
                      <span>${item.done}/${item.total}</span>
                      <span class="bar"
                        ><i style=${`width:${Math.round((item.done / item.total) * 100)}%`}></i
                      ></span>
                    `
                  : html`<span>${item.sub ?? '—'}</span>`}
              </span>
            </button>
          `,
        )}
      </div>
      <div class="pane" role="tabpanel">
        <slot></slot>
      </div>
      ${this.items.length === 0 ? html`<p>Nothing here yet.</p>` : nothing}
    `
  }
}

customElements.define('rail-view', RailView)

declare global {
  interface HTMLElementTagNameMap {
    'rail-view': RailView
  }
}
