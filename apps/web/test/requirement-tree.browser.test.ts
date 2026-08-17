import type { Fact, RequirementChild } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/requirement-tree.js'

const facts: Fact[] = [
  { id: 'a:one', label: 'Do the first thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:two', label: 'Do the second thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:rank', label: 'Reach rank', kind: 'number', max: 4, collection: 'prophecy' },
]
const factsById = new Map(facts.map((fact) => [fact.id, fact]))

function mount(node: RequirementChild, current: Record<string, boolean | number> = {}) {
  render(
    html`<requirement-tree .node=${node} .facts=${current} .factsById=${factsById}></requirement-tree>`,
    document.body,
  )
  return document.querySelector('requirement-tree')!
}

describe('requirement-tree', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('renders one checklist item per boolean fact with its label', async () => {
    const element = mount({ kind: 'all', of: ['a:one', 'a:two'] })
    await element.updateComplete
    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items.length).toBe(2)
    expect(items[0]!.getAttribute('label')).toBe('Do the first thing')
  })

  it('shows the node kind for a nested group', async () => {
    const element = mount({
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two'] }],
    })
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('Any of')
  })

  it('renders a number input for an atLeast node', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    expect(input.value).toBe('2')
    expect(input.max).toBe('4')
  })

  it('fires fact-toggle when the user checks an item', async () => {
    const element = mount({ kind: 'all', of: ['a:one'] })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const item = element.shadowRoot!.querySelector('hd-checklist-item')!
    await item.updateComplete
    item.shadowRoot!.querySelector('input')!.click()
    expect(detail).toEqual([{ id: 'a:one', value: true }])
  })
})
