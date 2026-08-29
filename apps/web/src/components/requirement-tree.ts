import { isSatisfied, numericValue, type FactMap } from '@hades/engine'
import type { Fact, RequirementChild } from '@hades/schema'
import { isFactChild } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, type TemplateResult } from 'lit'

const GROUP_LABEL = {
  all: 'All of',
  any: 'Any of',
  count: 'At least',
} as const

/** Fires `fact-toggle` with `detail: { id, value }` when the user edits a fact. */
export class RequirementTree extends LitElement {
  static override readonly styles = css`
    .group {
      border-left: 2px solid rgba(255, 255, 255, 0.12);
      margin-left: 4px;
      padding-left: 12px;
    }
    .group-label {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .rank {
      align-items: center;
      display: flex;
      gap: 8px;
      padding: 6px 0;
    }
    input[type='number'] {
      width: 4rem;
    }
    .threshold {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.75rem;
    }
  `

  static override readonly properties = {
    node: { type: Object },
    facts: { type: Object },
    factsById: { type: Object },
  }

  node: RequirementChild = { kind: 'all', of: [] }
  facts: FactMap = {}
  factsById: Map<string, Fact> = new Map()

  private emit(id: string, value: boolean | number): void {
    this.dispatchEvent(
      new CustomEvent('fact-toggle', { detail: { id, value }, bubbles: true, composed: true }),
    )
  }

  private labelFor(id: string): string {
    return this.factsById.get(id)?.label ?? id
  }

  /**
   * Dispatches on the fact's own `kind`, never on the requirement node shape.
   * A plain fact child of a `number` fact (for example a Pact condition
   * referenced by a prophecy for its activation, not its rank) must render
   * the same bounded stepper as an `atLeast` node. `hd-checklist-item` can
   * only emit `checked: boolean`, and `ProgressState#applyFact` treats
   * `false` as "delete the fact" and `true` as "set it to 1" — ticking or
   * unticking a checkbox bound to a number fact would silently destroy any
   * stored rank above 1. See `next-steps-panel.ts`, which guards the same
   * hazard by checking `fact.kind === 'number'`.
   */
  private renderFact(id: string): TemplateResult {
    const fact = this.factsById.get(id)
    if (fact?.kind === 'number') return this.renderNumberFact(id, fact)
    return html`
      <hd-checklist-item
        label=${this.labelFor(id)}
        ?checked=${isSatisfied(id, this.facts)}
        @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
          this.emit(id, event.detail.checked)}
      ></hd-checklist-item>
    `
  }

  /**
   * A number fact reached as a plain child has no node-level `atLeast`
   * threshold to show, unlike `renderRank`. The prophecy's own semantics are
   * activation (rank >= 1), but the control still exposes the fact's full
   * range and current value, so no interaction here can lower a rank the
   * player set through a different view.
   */
  private renderNumberFact(id: string, fact: Fact): TemplateResult {
    const max = fact.max ?? numericValue(id, this.facts)
    return html`
      <div class="rank">
        <label for=${`rank-${id}`}>${this.labelFor(id)}</label>
        <input
          id=${`rank-${id}`}
          type="number"
          min="0"
          max=${max}
          .value=${String(numericValue(id, this.facts))}
          @change=${(event: Event) => {
            const raw = Number((event.target as HTMLInputElement).value)
            this.emit(id, Math.min(Math.max(raw, 0), max))
          }}
        />
        <span>/ ${max}</span>
      </div>
    `
  }

  /**
   * Bounds and clamps by the fact's own `max`, never by `threshold`.
   * `threshold` is this one node's `atLeast` requirement. The same fact can
   * back another node with a different, lower threshold: clamping the input
   * to `threshold` would cap the fact below what that other node needs.
   */
  private renderRank(id: string, threshold: number): TemplateResult {
    const max = this.factsById.get(id)?.max ?? threshold
    return html`
      <div class="rank">
        <label for=${`rank-${id}`}>${this.labelFor(id)}</label>
        <input
          id=${`rank-${id}`}
          type="number"
          min="0"
          max=${max}
          .value=${String(numericValue(id, this.facts))}
          @change=${(event: Event) => {
            const raw = Number((event.target as HTMLInputElement).value)
            this.emit(id, Math.min(Math.max(raw, 0), max))
          }}
        />
        <span>/ ${max}</span>
        <span class="threshold">this entry needs ${threshold}</span>
      </div>
    `
  }

  private renderNode(node: RequirementChild): TemplateResult {
    if (isFactChild(node)) return this.renderFact(node)
    if (node.kind === 'atLeast') return this.renderRank(node.fact, node.value)

    const label = node.kind === 'count' ? `${GROUP_LABEL.count} ${node.n} of` : GROUP_LABEL[node.kind]
    return html`
      <div class="group">
        <p class="group-label">${label}</p>
        ${node.of.map((child) => this.renderNode(child))}
      </div>
    `
  }

  override render() {
    return this.renderNode(this.node)
  }
}

customElements.define('requirement-tree', RequirementTree)

declare global {
  interface HTMLElementTagNameMap {
    'requirement-tree': RequirementTree
  }
}
