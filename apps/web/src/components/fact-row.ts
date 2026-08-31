import type { FactMap } from '@hades/engine'
import type { Fact } from '@hades/schema'
import { colorVar, spaceVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'

export type FactState = 'todo' | 'partial' | 'done'

/**
 * The largest rank drawn as pips. Above this the row takes a typed field.
 *
 * 94 of the 103 counted facts stop at 10 or below, so nearly all of them get
 * the pips the Characters and Weapons tables already use. The nine above are
 * 15, 20, 25, 30, 70, 210 and two at 10000, where a row of pips would be
 * unreadable and unclickable.
 */
const PIP_LIMIT = 10

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

    /* One height for every control. A checkbox is 18px tall and a pip 13, so
       without this a list steps up and down as the controls change. */
    .row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: ${spaceVar('--hd-space-2')};
      min-height: ${spaceVar('--hd-space-5')};
    }

    label {
      flex: 1;
      min-width: 0;
    }

    /* Narrow, centred, no spinner arrows. The browser default was 4.2rem wide
       and left-aligned for a number that is nearly always one digit, and it
       pushed a long label onto a second line. Only nine facts reach this
       control at all; the rest are pips. */
    input[type='number'] {
      appearance: textfield;
      background: ${colorVar('--hd-color-surface')};
      border: 1px solid transparent;
      border-bottom: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 4px 4px 0 0;
      color: inherit;
      font: inherit;
      font-variant-numeric: tabular-nums;
      padding: ${spaceVar('--hd-space-hair')} ${spaceVar('--hd-space-1')};
      text-align: center;
      width: 3.4rem;
    }

    input[type='number']::-webkit-inner-spin-button,
    input[type='number']::-webkit-outer-spin-button {
      appearance: none;
      margin: 0;
    }

    input[type='number']:focus-visible {
      border-bottom-color: ${colorVar('--hd-color-accent')};
      outline: none;
    }

    .pips {
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      gap: ${spaceVar('--hd-space-1')};
      padding: ${spaceVar('--hd-space-hair')};
    }

    .pips:focus-visible {
      outline: 2px solid ${colorVar('--hd-color-accent')};
      outline-offset: 1px;
    }

    .pip {
      background: ${colorVar('--hd-color-surface')};
      border-radius: 3px;
      height: 13px;
      width: 13px;
    }

    .pip.on {
      background: ${colorVar('--hd-color-accent')};
    }

    /* Full turns gold, the same warm scale the bars use. */
    .pips.full .pip.on {
      background: ${colorVar('--hd-color-done')};
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
      padding: ${spaceVar('--hd-space-hair')} ${spaceVar('--hd-space-2')};
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

  /**
   * A rank as pips you click, with the semantics of a slider.
   *
   * One tab stop, arrow keys to change, Home and End for the ends. The pips
   * themselves are spans, not buttons: a group of ten buttons per row would
   * add ten tab stops each, and nesting buttons inside the control is what
   * swallowed the Space key on the Characters table once already. `AGENTS.md`
   * records that.
   *
   * Clicking pip N sets N. Clicking the pip that already marks the current
   * value clears to 0, the way a star rating does, so there is a way back to
   * nothing without reaching for the keyboard.
   */
  #pips(max: number, value: number, label: string): TemplateResult {
    const set = (next: number): void => {
      this.#emit(Math.min(Math.max(next, 0), max))
    }
    return html`
      <span
        class="pips ${value >= max ? 'full' : ''}"
        role="slider"
        tabindex="0"
        aria-label=${label}
        aria-valuemin="0"
        aria-valuemax=${max}
        aria-valuenow=${value}
        aria-valuetext=${`${value} of ${max}`}
        @keydown=${(event: KeyboardEvent) => {
          const step =
            event.key === 'ArrowRight' || event.key === 'ArrowUp'
              ? value + 1
              : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                ? value - 1
                : event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? max
                    : undefined
          if (step === undefined) return
          event.preventDefault()
          set(step)
        }}
      >
        ${Array.from({ length: max }, (_unused, index) => index + 1).map(
          (rank) => html`
            <span
              class=${rank <= value ? 'pip on' : 'pip'}
              data-rank=${rank}
              @click=${(event: Event) => {
                // The row this sits in may itself be clickable.
                event.stopPropagation()
                set(rank === value ? 0 : rank)
              }}
            ></span>
          `,
        )}
      </span>
      <span class="of">${value}/${max}</span>
    `
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
    const max = fact.max ?? 0
    const value = factValue(fact, this.facts)
    const control =
      stepped && max <= PIP_LIMIT
        ? this.#pips(max, value, label)
        : stepped
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

customElements.define('fact-row', FactRow)

declare global {
  interface HTMLElementTagNameMap {
    'fact-row': FactRow
  }
}
