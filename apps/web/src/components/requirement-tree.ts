import { isSatisfied, numericValue, type FactMap } from '@hades/engine'
import type { Fact, RequirementChild } from '@hades/schema'
import { isFactChild } from '@hades/schema'
import '@hades/ui'
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
      color: var(--hd-color-muted, #a29684);
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

  private renderFact(id: string): TemplateResult {
    return html`
      <hd-checklist-item
        label=${this.labelFor(id)}
        ?checked=${isSatisfied(id, this.facts)}
        @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
          this.emit(id, event.detail.checked)}
      ></hd-checklist-item>
    `
  }

  private renderRank(id: string, max: number): TemplateResult {
    return html`
      <div class="rank">
        <label for=${`rank-${id}`}>${this.labelFor(id)}</label>
        <input
          id=${`rank-${id}`}
          type="number"
          min="0"
          max=${max}
          .value=${String(numericValue(id, this.facts))}
          @change=${(event: Event) =>
            this.emit(id, Number((event.target as HTMLInputElement).value))}
        />
        <span>/ ${max}</span>
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
