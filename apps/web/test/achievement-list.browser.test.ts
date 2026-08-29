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
 * 41 achievements across two sections (above `LARGE_LIST_ROW_THRESHOLD`),
 * the shape of a large single collection filtered alone (Boons, Codex,
 * Daedalus) or the unfiltered "All" view.
 */
const large: Achievement[] = Array.from({ length: 41 }, (_, index) => ({
  id: `codex:entry-${index}`,
  name: `Entry ${index}`,
  description: `Entry ${index}.`,
  collection: 'codex',
  requirement: { kind: 'all', of: [`a:fact-${index}`] },
  section: index < 21 ? 'chthonic-gods' : 'olympian-gods',
}))

const collectionsMeta = [
  { id: 'prophecy', name: 'Fated List of Minor Prophecies' },
  { id: 'codex', name: 'Codex' },
  { id: 'aspect', name: 'Weapon Aspects' },
]

/**
 * One unsectioned collection (prophecy) followed by one sectioned collection
 * (codex) — the shape the real, finished dataset produces in the default
 * "All" view, and the shape none of the fixtures above cover.
 */
const mixedCollections: Achievement[] = [
  {
    id: 'prophecy:first',
    name: 'First',
    description: 'First prophecy.',
    collection: 'prophecy',
    requirement: { kind: 'all', of: ['a:one'] },
  },
  {
    id: 'prophecy:second',
    name: 'Second',
    description: 'Second prophecy.',
    collection: 'prophecy',
    requirement: { kind: 'all', of: ['a:two'] },
  },
  {
    id: 'codex:alpha',
    name: 'Alpha',
    description: 'Alpha entry.',
    collection: 'codex',
    requirement: { kind: 'all', of: ['a:alpha'] },
    section: 'chthonic-gods',
  },
]

/**
 * Two different collections that both use a section slug of `shared-slug`.
 * Real data has no such collision today, but nothing stops one, so the
 * grouping and the collapse-state keying must not assume section slugs are
 * unique across collections.
 */
const sameSlugAcrossCollections: Achievement[] = [
  {
    id: 'codex:alpha',
    name: 'Alpha',
    description: 'Alpha entry.',
    collection: 'codex',
    requirement: { kind: 'all', of: ['a:alpha'] },
    section: 'shared-slug',
  },
  {
    id: 'aspect:beta',
    name: 'Beta',
    description: 'Beta entry.',
    collection: 'aspect',
    requirement: { kind: 'all', of: ['a:beta'] },
    section: 'shared-slug',
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

  it('collapses every section by default once the list is large', async () => {
    render(html`<achievement-list .achievements=${large} .facts=${{}}></achievement-list>`, document.body)
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const groups = [...element.shadowRoot!.querySelectorAll('details')]
    expect(groups.length).toBe(2)
    expect(groups.every((group) => group.open)).toBe(false)
  })

  it('lets an explicit collapse-state entry force a section open even on a large list', async () => {
    render(
      html`<achievement-list
        .achievements=${large}
        .facts=${{}}
        .collapsedSections=${{ 'codex:chthonic-gods': false }}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const groups = [...element.shadowRoot!.querySelectorAll('details')]
    expect(groups[0]!.open).toBe(true)
    expect(groups[1]!.open).toBe(false)
  })

  it('honours a caller-supplied collapse state, one section at a time', async () => {
    render(
      html`<achievement-list
        .achievements=${sectioned}
        .facts=${{}}
        .collapsedSections=${{ 'codex:chthonic-gods': true }}
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

  it('fires section-toggle, naming the collection and the section that changed, when a heading is activated', async () => {
    render(
      html`<achievement-list .achievements=${sectioned} .facts=${{}}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const events: { collection: string; section: string; open: boolean }[] = []
    element.addEventListener('section-toggle', (event) => {
      events.push(
        (event as CustomEvent<{ collection: string; section: string; open: boolean }>).detail,
      )
    })
    const summary = element.shadowRoot!.querySelector('details summary') as HTMLElement
    summary.click()
    await vi.waitFor(() => expect(events.length).toBe(1))
    expect(events).toEqual([{ collection: 'codex', section: 'chthonic-gods', open: false }])
  })
})

describe('achievement-list across more than one collection', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('renders a collection heading above each group when the list holds more than one collection', async () => {
    render(
      html`<achievement-list
        .achievements=${mixedCollections}
        .facts=${{}}
        .collections=${collectionsMeta}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const headings = [...element.shadowRoot!.querySelectorAll('.collection-heading')].map(
      (heading) => heading.textContent?.trim(),
    )
    expect(headings).toEqual(['Fated List of Minor Prophecies', 'Codex'])
  })

  it('does not render a collection heading when every achievement is from one collection', async () => {
    render(
      html`<achievement-list
        .achievements=${achievements}
        .facts=${{}}
        .collections=${collectionsMeta}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelectorAll('.collection-heading').length).toBe(0)
  })

  it('keeps the two collections in separate unlabelled-vs-sectioned groups, not one merged block', async () => {
    render(
      html`<achievement-list
        .achievements=${mixedCollections}
        .facts=${{}}
        .collections=${collectionsMeta}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    // The prophecy rows sit in a flat <ul>, not inside the codex's <details>.
    const lists = [...element.shadowRoot!.querySelectorAll('ul')].filter(
      (list) => list.closest('details') === null,
    )
    expect(lists.length).toBe(1)
    expect(lists[0]!.querySelectorAll('li').length).toBe(2)
    const details = element.shadowRoot!.querySelectorAll('details')
    expect(details.length).toBe(1)
    expect(details[0]!.querySelectorAll('li').length).toBe(1)
  })

  it('does not leak collapse state between two collections that share a section slug', async () => {
    render(
      html`<achievement-list
        .achievements=${sameSlugAcrossCollections}
        .facts=${{}}
        .collections=${collectionsMeta}
        .collapsedSections=${{ 'codex:shared-slug': true }}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const groups = [...element.shadowRoot!.querySelectorAll('details')]
    expect(groups.length).toBe(2)
    const codexGroup = groups.find((group) => group.textContent?.includes('Alpha'))!
    const aspectGroup = groups.find((group) => group.textContent?.includes('Beta'))!
    expect(codexGroup.open).toBe(false)
    expect(aspectGroup.open).toBe(true)
  })
})
