import { capabilityOf, type FactMap } from '@hades/engine'
import type { Fact } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'

export type FactState = 'todo' | 'partial' | 'done'

/** A number fact is done at its `max`, partial in between, todo at zero. */
export function factState(fact: Fact, facts: FactMap): FactState {
  const value = facts[fact.id]
  if (fact.kind === 'number' && fact.max !== undefined) {
    const current = typeof value === 'number' ? value : value === true ? 1 : 0
    if (current >= fact.max) return 'done'
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
    revealed: { type: Boolean },
  }

  fact!: Fact
  facts: FactMap = {}
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
    // spinner that can only be 0 or 1.
    const stepped = fact.kind === 'number' && fact.max !== undefined && fact.max > 1
    const control =
      stepped
        ? html`
            <input
              id=${`rank-${fact.id}`}
              type="number"
              min="0"
              max=${fact.max}
              .value=${live(String(factValue(fact, this.facts)))}
              @change=${(event: Event) => {
                const raw = Number((event.target as HTMLInputElement).value)
                // Clamp by the fact's own max, so no view can push it past
                // what the game allows or below zero.
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
              .checked=${factState(fact, this.facts) === 'done'}
              .label=${label}
              @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
                this.#emit(event.detail.checked)}
            ></hd-checklist-item>
          `

    return html`
      <div class="row">
        ${stepped ? html`<label for=${`rank-${fact.id}`}>${label}</label>` : nothing}
        ${control}
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
