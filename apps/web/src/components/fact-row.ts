import { capabilityOf, type FactMap } from '@hades/engine'
import type { Fact } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'

export type FactState = 'todo' | 'partial' | 'done'

/**
 * A number fact is done at its target, partial in between, todo at zero.
 *
 * The target is the fact's own `max` on a subject page, where the question is
 * "how far have I taken this". Inside an entry it is what that entry asks for,
 * which is usually 1: owning a keepsake satisfies "Something From Everyone" no
 * matter what rank you took it to. Without the target, 297 rows read as partly
 * done when they were finished.
 */
export function factState(fact: Fact, facts: FactMap, target?: number): FactState {
  const value = facts[fact.id]
  const goal = target ?? (fact.kind === 'number' ? fact.max : undefined)
  if (fact.kind === 'number' && goal !== undefined) {
    const current = typeof value === 'number' ? value : value === true ? 1 : 0
    if (current >= goal) return 'done'
    return current > 0 ? 'partial' : 'todo'
  }
  return value === true || (typeof value === 'number' && value > 0) ? 'done' : 'todo'
}

export function factValue(fact: Fact, facts: FactMap): number {
  const value = facts[fact.id]
  if (typeof value === 'number') return value
  return value === true ? 1 : 0
}

/**
 * One action, with the control its own `kind` calls for.
 *
 * **Dispatch on the fact's `kind`, never on the shape of the node that reached
 * it.** A number fact rendered as a checkbox can only say 0 or max, so a
 * player who has given Zeus four of seven Nectar reads as untouched, and the
 * next tick overwrites the stored 4. `AGENTS.md` records this as a defect that
 * already destroyed a stored rank once, and a first pass of this component
 * reintroduced it: every one of the 96 number facts rendered as a checkbox.
 */
export class FactRow extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
    }

    .row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    label {
      flex: 1;
      min-width: 0;
    }

    input[type='number'] {
      background: ${colorVar('--hd-color-surface')};
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 6px;
      color: inherit;
      font: inherit;
      padding: 3px 6px;
      width: 4.2rem;
    }

    .of {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }

    /* Only three rows in the whole app show this: Cerberus at 10 of 20 pets,
       18 of the 25 fish, and Demeter at 6 of her 7 hearts. Everywhere else the
       entry asks for 1 and the tick alone says so. */
    .target {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .cost {
      color: ${colorVar('--hd-color-accent')};
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .desc {
      color: ${colorVar('--hd-color-muted')};
      flex-basis: 100%;
      font-size: 0.72rem;
    }

    .reveal {
      background: none;
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 6px;
      color: ${colorVar('--hd-color-muted')};
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      padding: 2px 8px;
    }
  `

  static override readonly properties = {
    fact: { attribute: false },
    facts: { attribute: false },
    target: { type: Number },
    revealed: { type: Boolean },
  }

  fact!: Fact
  facts: FactMap = {}
  /** What this row must reach here. Undefined means the fact's own `max`. */
  target: number | undefined = undefined
  revealed = false

  #emit(value: boolean | number): void {
    this.dispatchEvent(
      new CustomEvent('set-fact', {
        detail: { id: this.fact.id, value },
        bubbles: true,
        composed: true,
      }),
    )
  }

  override render(): TemplateResult {
    const fact = this.fact
    const hidden = fact.spoiler === true && !this.revealed
    const label = hidden ? 'Hidden: this step names a story outcome' : fact.label

    if (hidden) {
      return html`
        <div class="row">
          <label>${label}</label>
          <button
            class="reveal"
            @click=${() => {
              this.revealed = true
            }}
          >
            Reveal
          </button>
        </div>
      `
    }

    // A rank whose max is 1 has one step, so a checkbox reads better than a
    // spinner that can only be 0 or 1. Three Pact conditions are like this.
    const stepped = fact.kind === 'number' && fact.max !== undefined && fact.max > 1
    const control =
      stepped
        ? html`
            <input
              id=${`rank-${fact.id}`}
              type="number"
              min="0"
              step="1"
              max=${fact.max}
              .value=${live(String(factValue(fact, this.facts)))}
              @change=${(event: Event) => {
                // Round as well as clamp. A rank is a count of gifts or of
                // levels, so 2.7 is not a smaller 3 — it is not a value. The
                // browser marks it invalid and nothing was checking, so 2.7
                // reached IndexedDB and the index drew three pips beside it.
                const raw = Math.round(Number((event.target as HTMLInputElement).value))
                this.#emit(Math.min(Math.max(raw, 0), fact.max ?? 0))
                // When the clamp lands on the value already stored, `facts`
                // does not change and nothing would re-render, leaving the
                // rejected text on screen. `live()` re-commits against the DOM,
                // but only if an update runs at all.
                this.requestUpdate()
              }}
            />
            <span class="of">/ ${fact.max}</span>
          `
        : html`
            <hd-checklist-item
              .checked=${factState(fact, this.facts, this.target) === 'done'}
              .label=${label}
              @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
                this.#emit(event.detail.checked)}
            ></hd-checklist-item>
          `

    return html`
      <div class="row">
        ${stepped ? html`<label for=${`rank-${fact.id}`}>${label}</label>` : nothing}
        ${control}
        ${stepped && this.target !== undefined && this.target > 1 && this.target < (fact.max ?? 0)
          ? html`<span class="target">target ${this.target}</span>`
          : nothing}
        ${fact.cost
          ? html`<span class="cost">${fact.cost.amount} ${fact.cost.currency}</span>`
          : nothing}
        ${fact.description ? html`<span class="desc">${fact.description}</span>` : nothing}
      </div>
    `
  }
}

export { capabilityOf }

customElements.define('fact-row', FactRow)

declare global {
  interface HTMLElementTagNameMap {
    'fact-row': FactRow
  }
}
