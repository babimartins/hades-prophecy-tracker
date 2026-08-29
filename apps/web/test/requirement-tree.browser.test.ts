import type { Fact, RequirementChild } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/requirement-tree.js'

const facts: Fact[] = [
  { id: 'a:one', label: 'Do the first thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:two', label: 'Do the second thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:rank', label: 'Reach rank', kind: 'number', max: 4, collection: 'prophecy' },
  // Fact max deliberately differs from the atLeast threshold used below, the
  // way `aspect:stygius:zagreus` (max 5) differs between `prophecy:eternal-rest`
  // (atLeast 5) and `prophecy:violent-past` (atLeast 1).
  { id: 'a:shared-rank', label: 'Reach shared rank', kind: 'number', max: 5, collection: 'prophecy' },
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

  it('bounds and clamps by the fact maximum, not by a lower node threshold', async () => {
    const element = mount(
      { kind: 'atLeast', fact: 'a:shared-rank', value: 1 },
      { 'a:shared-rank': 5 },
    )
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement

    // The fact is already at its own max (5), which is well past this node's
    // threshold (1). The input must reflect and clamp to the fact's max, not
    // silently cap the player's progress at the threshold of this one entry.
    expect(input.value).toBe('5')
    expect(input.max).toBe('5')

    input.value = '99'
    input.dispatchEvent(new Event('change'))
    expect(detail).toEqual([{ id: 'a:shared-rank', value: 5 }])
  })

  it('shows the node threshold as text, separate from the fact-maximum input bound', async () => {
    const element = mount(
      { kind: 'atLeast', fact: 'a:shared-rank', value: 1 },
      { 'a:shared-rank': 5 },
    )
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('1')
  })

  it('clamps a value typed past the maximum before emitting it', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    input.value = '99'
    input.dispatchEvent(new Event('change'))
    expect(detail).toEqual([{ id: 'a:rank', value: 4 }])
  })

  it('clamps a negative value to zero before emitting it', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    input.value = '-5'
    input.dispatchEvent(new Event('change'))
    expect(detail).toEqual([{ id: 'a:rank', value: 0 }])
  })

  describe('a number fact reached as a plain requirement child', () => {
    // `pact:hard-labor` is a number fact (max 5). One achievement (the Pact
    // collection entry) references it through an `atLeast` node. A different
    // achievement (`prophecy:harsh-conditions`) references the very same fact
    // as a plain child, because the prophecy only needs the condition
    // active, not maxed. `requirement-tree` must render both safely: it must
    // never let the plain-child view emit a boolean for a number fact, because
    // `ProgressState#applyFact` treats `false` as "delete the fact" and `true`
    // as "set it to 1", which silently destroys a higher stored rank.
    function applySetFact(
      facts: Record<string, boolean | number>,
      id: string,
      value: boolean | number,
    ): Record<string, boolean | number> {
      const next = { ...facts }
      if (value === false || value === 0) delete next[id]
      else next[id] = value
      return next
    }

    it('never lets an untick-retick in the prophecy view destroy a rank set in the Pact view', async () => {
      let facts: Record<string, boolean | number> = {}

      // Step 1: the Pact collection view sets the condition to rank 5 through
      // its `atLeast` node. Fact max is 5, mirroring `pact:hard-labor`.
      let element = mount({ kind: 'atLeast', fact: 'a:shared-rank', value: 1 }, facts)
      await element.updateComplete
      let detail: Array<{ id: string; value: boolean | number }> = []
      element.addEventListener('fact-toggle', (event) => {
        detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
      })
      let input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
      input.value = '5'
      input.dispatchEvent(new Event('change'))
      facts = applySetFact(facts, detail[0]!.id, detail[0]!.value)
      expect(facts['a:shared-rank']).toBe(5)

      // Step 2: the prophecy view reaches the same fact as a plain child.
      // Whatever control it renders, driving its normal interaction once
      // must never emit a value that reduces the stored rank.
      element = mount('a:shared-rank', facts)
      await element.updateComplete
      detail = []
      element.addEventListener('fact-toggle', (event) => {
        detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
      })

      const checkbox = element.shadowRoot!.querySelector('hd-checklist-item')
      if (checkbox) {
        // Pre-fix shape: a lossy checkbox. Untick it, then re-tick it.
        await (checkbox as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
        const box = checkbox.shadowRoot!.querySelector('input')!
        box.click() // untick
        box.click() // re-tick
      } else {
        // Post-fix shape: a bounded numeric control, already showing 5.
        input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
        expect(input.value).toBe('5')
      }

      for (const event of detail) facts = applySetFact(facts, event.id, event.value)

      // The invariant: a single interaction sequence in the prophecy view
      // must never turn a stored 5 into a 1 (or delete it).
      expect(facts['a:shared-rank']).toBe(5)
    })

    it('renders a bounded numeric control, not a checkbox, for a number fact used as a plain child', async () => {
      const element = mount('a:shared-rank', { 'a:shared-rank': 5 })
      await element.updateComplete
      expect(element.shadowRoot!.querySelector('hd-checklist-item')).toBeNull()
      const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.value).toBe('5')
      expect(input.max).toBe('5') // 'a:shared-rank' fixture max is 5
    })

    it('hints that any value above zero satisfies the entry, unlike the atLeast threshold hint', async () => {
      const element = mount('a:shared-rank', { 'a:shared-rank': 0 })
      await element.updateComplete
      expect(element.shadowRoot!.textContent).toContain('this entry only needs it active')
    })

    it('does not show the plain-child activation hint on an atLeast node, which keeps its own threshold hint', async () => {
      const element = mount({ kind: 'atLeast', fact: 'a:shared-rank', value: 5 }, { 'a:shared-rank': 0 })
      await element.updateComplete
      expect(element.shadowRoot!.textContent).not.toContain('this entry only needs it active')
      expect(element.shadowRoot!.textContent).toContain('this entry needs 5')
    })
  })
})
