import type { Achievement } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/achievement-list.js'

const achievements: Achievement[] = [
  {
    id: 'prophecy:first',
    name: 'First',
    description: 'First prophecy.',
    collection: 'prophecy',
    requirement: { kind: 'all', of: ['a:one', 'a:two'] },
  },
  {
    id: 'prophecy:second',
    name: 'Second',
    description: 'Second prophecy.',
    collection: 'prophecy',
    requirement: { kind: 'all', of: ['a:three'] },
  },
]

/**
 * Text content across shadow boundaries. `hd-progress` renders its caption
 * inside its own shadow root, which plain `textContent` never reaches.
 */
function composedText(root: ParentNode): string {
  let text = (root as unknown as Node).textContent ?? ''
  for (const child of root.querySelectorAll('*')) {
    if (child.shadowRoot) text += composedText(child.shadowRoot)
  }
  return text
}

describe('achievement-list', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('renders one row per achievement with its progress', async () => {
    render(
      html`<achievement-list
        .achievements=${achievements}
        .facts=${{ 'a:one': true }}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const rows = element.shadowRoot!.querySelectorAll('li')
    expect(rows.length).toBe(2)
    expect(rows[0]!.textContent).toContain('First')
    expect(composedText(rows[0]!)).toContain('1 / 2')
  })

  it('marks a completed achievement as done', async () => {
    render(
      html`<achievement-list .achievements=${achievements} .facts=${{ 'a:three': true }}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const done = element.shadowRoot!.querySelectorAll('li[data-status="done"]')
    expect(done.length).toBe(1)
    expect(done[0]!.textContent).toContain('Second')
  })

  it('fires achievement-open on a row click', async () => {
    render(html`<achievement-list .achievements=${achievements} .facts=${{}}></achievement-list>`, document.body)
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const ids: string[] = []
    element.addEventListener('achievement-open', (event) => {
      ids.push((event as CustomEvent<{ id: string }>).detail.id)
    })
    element.shadowRoot!.querySelector('li button')!.dispatchEvent(new MouseEvent('click'))
    expect(ids).toEqual(['prophecy:first'])
  })
})
