import { impact, nextSteps, type FactMap } from '@hades/engine'
import type { Dataset } from '@hades/schema'
import '@hades/ui'
import { html, LitElement } from 'lit'

/**
 * Fires `fact-toggle` with `detail: { id, value }`.
 * The property is named `catalog`, not `dataset`: `HTMLElement.dataset` is a
 * read-only built-in accessor, and a property of the same name breaks typecheck.
 */
export class NextStepsPanel extends LitElement {
  static override readonly properties = {
    catalog: { type: Object },
    facts: { type: Object },
    limit: { type: Number },
  }

  catalog: Dataset = { collections: [], facts: [], achievements: [] }
  facts: FactMap = {}
  limit = 8

  private emit(id: string, value: boolean | number): void {
    this.dispatchEvent(
      new CustomEvent('fact-toggle', { detail: { id, value }, bubbles: true, composed: true }),
    )
  }

  override render() {
    const pending = nextSteps(this.catalog, this.facts).slice(0, this.limit)
    if (pending.length === 0) {
      return html`<p>Nothing left to do. Every prophecy is complete.</p>`
    }

    const labels = new Map(this.catalog.facts.map((fact) => [fact.id, fact.label]))
    return html`
      ${pending.map((id) => {
        const count = impact(id, this.catalog)
        return html`
          <hd-checklist-item
            label=${labels.get(id) ?? id}
            badge=${`${count} ${count === 1 ? 'prophecy' : 'prophecies'}`}
            @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
              this.emit(id, event.detail.checked)}
          ></hd-checklist-item>
        `
      })}
    `
  }
}

customElements.define('next-steps-panel', NextStepsPanel)

declare global {
  interface HTMLElementTagNameMap {
    'next-steps-panel': NextStepsPanel
  }
}
