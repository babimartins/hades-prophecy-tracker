import type { Collection } from '@hades/schema'
import { css, html, LitElement } from 'lit'

/**
 * Fires `collection-select` with `detail: { id }` when the user picks a
 * collection, or "All". `id` is `undefined` for "All".
 *
 * A native radio group carries the selected state: the browser exposes it to
 * assistive technology through the `checked` state, not through colour.
 */
export class CollectionFilter extends LitElement {
  static override readonly styles = css`
    fieldset {
      border: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
      padding: 0;
    }
    label {
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      display: inline-flex;
      gap: 6px;
      padding: 6px 10px;
    }
    input:focus-visible {
      outline: 2px solid var(--hd-color-accent, #e35563);
    }
  `

  static override readonly properties = {
    collections: { type: Array },
    selected: { type: String },
  }

  collections: Collection[] = []
  selected: string | undefined = undefined

  private select(id: string | undefined): void {
    this.dispatchEvent(
      new CustomEvent('collection-select', { detail: { id }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <fieldset>
        <legend>Filter by collection</legend>
        <label>
          <input
            type="radio"
            name="collection-filter"
            value=""
            ?checked=${this.selected === undefined}
            @change=${() => this.select(undefined)}
          />
          All
        </label>
        ${this.collections.map(
          (collection) => html`
            <label>
              <input
                type="radio"
                name="collection-filter"
                value=${collection.id}
                ?checked=${this.selected === collection.id}
                @change=${() => this.select(collection.id)}
              />
              ${collection.name}
            </label>
          `,
        )}
      </fieldset>
    `
  }
}

customElements.define('collection-filter', CollectionFilter)

declare global {
  interface HTMLElementTagNameMap {
    'collection-filter': CollectionFilter
  }
}
