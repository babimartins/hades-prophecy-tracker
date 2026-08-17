import type { Dataset } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/next-steps-panel.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  facts: [
    { id: 'a:shared', label: 'Shared step', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:one', label: 'Only step one', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Only step two', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:first',
      name: 'First',
      description: 'First.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:one'] },
    },
    {
      id: 'prophecy:second',
      name: 'Second',
      description: 'Second.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:two'] },
    },
  ],
}

describe('next-steps-panel', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('lists the highest impact step first with its impact badge', async () => {
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${{}} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items[0]!.getAttribute('label')).toBe('Shared step')
    expect(items[0]!.getAttribute('badge')).toBe('2 prophecies')
  })

  it('respects the limit', async () => {
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${{}} .limit=${1}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelectorAll('hd-checklist-item').length).toBe(1)
  })

  it('shows a done message when nothing is pending', async () => {
    const facts = { 'a:shared': true, 'a:one': true, 'a:two': true }
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${facts} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('Nothing left')
  })

  it('fires fact-toggle with the fact id and the checked value', async () => {
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${{}} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const item = element.shadowRoot!.querySelector('hd-checklist-item')!
    await item.updateComplete
    item.shadowRoot!.querySelector('input')!.click()
    expect(detail).toEqual([{ id: 'a:shared', value: true }])
  })
})
