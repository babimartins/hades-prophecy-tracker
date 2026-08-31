import { impact, isSatisfied, nextSteps, numericValue, type FactMap } from '@hades/engine'
import type { Dataset, Fact } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, type TemplateResult } from 'lit'
import { repeat } from 'lit/directives/repeat.js'

/**
 * Fires `fact-toggle` with `detail: { id, value }`.
 * The property is named `catalog`, not `dataset`: `HTMLElement.dataset` is a
 * read-only built-in accessor, and a property of the same name breaks typecheck.
 */
export class NextStepsPanel extends LitElement {
  static override readonly styles = css`
    .rank {
      align-items: center;
      display: flex;
      gap: 8px;
      padding: 6px 0;
    }
    /**
     * A number row has no checkbox, so without this spacer its label starts
     * 26px to the left of a checkbox row's label (18px box + 8px gap),
     * misaligning the two. The spacer matches hd-checklist-item's checkbox
     * exactly, so the label columns of every row line up.
     */
    .rank .spacer {
      flex-shrink: 0;
      width: 18px;
    }
    .rank .label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rank .control {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: 4px;
      white-space: nowrap;
    }
    input[type='number'] {
      width: 4rem;
    }
    .badge {
      color: ${colorVar('--hd-color-muted')};
      flex-shrink: 0;
      font-size: 0.75rem;
      margin-left: auto;
      white-space: nowrap;
    }
  `

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

  private badgeFor(id: string): string {
    const count = impact(id, this.catalog)
    return `${count} ${count === 1 ? 'entry' : 'entries'}`
  }

  /**
   * A number fact never renders as a checklist item. `hd-checklist-item`
   * only ever emits `checked: boolean`, and `numericValue` reads `true` as
   * `1`: ticking it would silently overwrite a higher stored value.
   */
  private renderNumberStep(fact: Fact): TemplateResult {
    const max = fact.max ?? numericValue(fact.id, this.facts)
    return html`
      <div class="rank">
        <span class="spacer" aria-hidden="true"></span>
        <label class="label" for=${`next-${fact.id}`}>${fact.label}</label>
        <span class="control">
          <input
            id=${`next-${fact.id}`}
            type="number"
            min="0"
            max=${max}
            .value=${String(numericValue(fact.id, this.facts))}
            @change=${(event: Event) => {
              const raw = Number((event.target as HTMLInputElement).value)
              this.emit(fact.id, Math.min(Math.max(raw, 0), max))
            }}
          />
          <span>/ ${max}</span>
        </span>
        <span class="badge">${this.badgeFor(fact.id)}</span>
      </div>
    `
  }

  private renderBooleanStep(id: string, label: string): TemplateResult {
    return html`
      <hd-checklist-item
        label=${label}
        badge=${this.badgeFor(id)}
        ?checked=${isSatisfied(id, this.facts)}
        @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) => this.emit(id, event.detail.checked)}
      ></hd-checklist-item>
    `
  }

  override render() {
    const pending = nextSteps(this.catalog, this.facts).slice(0, this.limit)
    if (pending.length === 0) {
      return html`<p>Nothing left to do. Every entry is complete.</p>`
    }

    const factsById = new Map(this.catalog.facts.map((fact) => [fact.id, fact]))
    // Keyed by fact id: as items complete and drop out of `pending`, Lit must
    // never reuse one row's element for a different fact. An unkeyed list
    // would, and a `checked` or `.value` left over from the old fact would
    // stick to the new one at the same position.
    return html`
      ${repeat(
        pending,
        (id) => id,
        (id) => {
          const fact = factsById.get(id)
          if (fact?.kind === 'number') return this.renderNumberStep(fact)
          return this.renderBooleanStep(id, fact?.label ?? id)
        },
      )}
    `
  }
}

customElements.define('next-steps-panel', NextStepsPanel)

declare global {
  interface HTMLElementTagNameMap {
    'next-steps-panel': NextStepsPanel
  }
}
