import type { Achievement } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const sectioned: Achievement[] = [
  {
    id: 'codex:alpha',
    name: 'Alpha',
    description: 'Alpha entry.',
    collection: 'codex',
    requirement: { kind: 'all', of: ['a:alpha'] },
    section: 'chthonic-gods',
  },
  {
    id: 'codex:beta',
    name: 'Beta',
    description: 'Beta entry.',
    collection: 'codex',
    requirement: { kind: 'all', of: ['a:beta'] },
    section: 'chthonic-gods',
  },
  {
    id: 'codex:gamma',
    name: 'Gamma',
    description: 'Gamma entry.',
    collection: 'codex',
    requirement: { kind: 'all', of: ['a:gamma'] },
    section: 'olympian-gods',
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

  it('renders a flat list, exactly as today, when no entry carries a section', async () => {
    render(
      html`<achievement-list .achievements=${achievements} .facts=${{}}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelectorAll('details').length).toBe(0)
    expect(element.shadowRoot!.querySelectorAll('ul > li').length).toBe(2)
  })

  it('groups entries under a section heading when they carry one', async () => {
    render(
      html`<achievement-list .achievements=${sectioned} .facts=${{}}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const groups = element.shadowRoot!.querySelectorAll('details')
    expect(groups.length).toBe(2)
    const headings = [...groups].map((group) => group.querySelector('summary')!.textContent?.trim())
    expect(headings).toEqual(['Chthonic Gods', 'Olympian Gods'])
    expect(groups[0]!.querySelectorAll('li').length).toBe(2)
    expect(groups[1]!.querySelectorAll('li').length).toBe(1)
  })

  it('expands every section by default', async () => {
    render(
      html`<achievement-list .achievements=${sectioned} .facts=${{}}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const groups = [...element.shadowRoot!.querySelectorAll('details')]
    expect(groups.every((group) => group.open)).toBe(true)
  })

  it('honours a caller-supplied collapse state, one section at a time', async () => {
    render(
      html`<achievement-list
        .achievements=${sectioned}
        .facts=${{}}
        .collapsedSections=${{ 'chthonic-gods': true }}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const groups = [...element.shadowRoot!.querySelectorAll('details')]
    expect(groups[0]!.open).toBe(false)
    expect(groups[1]!.open).toBe(true)
  })

  it('is keyboard-operable: the section heading is a native, focusable summary control', async () => {
    render(
      html`<achievement-list .achievements=${sectioned} .facts=${{}}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const summary = element.shadowRoot!.querySelector('details summary')!
    expect(summary.tagName).toBe('SUMMARY')
    expect((summary as HTMLElement).tabIndex).not.toBe(-1)
  })

  it('fires section-toggle, naming only the section that changed, when a heading is activated', async () => {
    render(
      html`<achievement-list .achievements=${sectioned} .facts=${{}}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const events: { section: string; open: boolean }[] = []
    element.addEventListener('section-toggle', (event) => {
      events.push((event as CustomEvent<{ section: string; open: boolean }>).detail)
    })
    const summary = element.shadowRoot!.querySelector('details summary') as HTMLElement
    summary.click()
    await vi.waitFor(() => expect(events.length).toBe(1))
    expect(events).toEqual([{ section: 'chthonic-gods', open: false }])
  })
})
