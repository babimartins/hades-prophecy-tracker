import { html, render } from 'lit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HadesDashboard } from '../src/components/hades-dashboard.js'
import type { ProgressStore } from '../src/storage/progress-store.js'

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

function failingStore(message: string): ProgressStore {
  return {
    load: async () => ({}),
    save: async () => {
      throw new Error(message)
    },
  }
}

function mount(store: ProgressStore): HadesDashboard {
  const element = new HadesDashboard(store)
  document.body.append(element)
  return element
}

/** Advances past a bounded number of pending microtasks, without a real timer. */
async function flushMicrotasks(times = 20): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('hades-dashboard collection cards', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('does not advertise a collection that holds no entries', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const headers = [...element.shadowRoot!.querySelectorAll('hd-card > [slot="header"]')].map(
      (node) => node.textContent,
    )
    expect(headers).not.toContain('Platform Achievements')
  })
})

describe('hades-dashboard collection filter', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('does not offer a filter control for a collection with no entries', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const filter = element.shadowRoot!.querySelector('collection-filter')!
    const labels = [...filter.shadowRoot!.querySelectorAll('label')].map((label) =>
      label.textContent?.trim(),
    )
    expect(labels).not.toContain('Platform Achievements')
  })

  it('narrows the visible achievements to the selected collection', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const filter = element.shadowRoot!.querySelector('collection-filter')!
    filter.dispatchEvent(
      new CustomEvent('collection-select', {
        detail: { id: 'prophecy' },
        bubbles: true,
        composed: true,
      }),
    )
    await element.updateComplete

    const list = element.shadowRoot!.querySelector('achievement-list')!
    expect(list.achievements.length).toBeGreaterThan(0)
    expect(list.achievements.every((achievement) => achievement.collection === 'prophecy')).toBe(
      true,
    )
  })
})

describe('hades-dashboard preserves state across an entry visit', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('keeps the query, the collection filter and the collapse state after opening and closing an entry', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    // Drive every piece of state the way a user would, through the rendered
    // controls, so the test fails for real when a control is missing or a
    // handler drops the state — not because a bare field trivially survives.
    element.shadowRoot!
      .querySelector('collection-filter')!
      .dispatchEvent(
        new CustomEvent('collection-select', {
          detail: { id: 'prophecy' },
          bubbles: true,
          composed: true,
        }),
      )
    element.shadowRoot!
      .querySelector('search-box')!
      .dispatchEvent(
        new CustomEvent('search-change', {
          detail: { query: 'zeus' },
          bubbles: true,
          composed: true,
        }),
      )
    await element.updateComplete
    element.shadowRoot!
      .querySelector('achievement-list')!
      .dispatchEvent(
        new CustomEvent('section-toggle', {
          detail: { collection: 'codex', section: 'chthonic-gods', open: false },
          bubbles: true,
          composed: true,
        }),
      )
    await element.updateComplete

    const list = element.shadowRoot!.querySelector('achievement-list')!
    const firstId = list.achievements[0]!.id
    list.dispatchEvent(
      new CustomEvent('achievement-open', {
        detail: { id: firstId },
        bubbles: true,
        composed: true,
      }),
    )
    await element.updateComplete
    expect(element.shadowRoot!.querySelector('achievement-detail')).toBeTruthy()

    element.shadowRoot!
      .querySelector('achievement-detail')!
      .dispatchEvent(new CustomEvent('detail-close', { bubbles: true, composed: true }))
    await element.updateComplete

    expect(element.shadowRoot!.querySelector('search-box')!.value).toBe('zeus')
    expect(element.shadowRoot!.querySelector('collection-filter')!.selected).toBe('prophecy')
    expect(element.shadowRoot!.querySelector('achievement-list')!.collapsedSections).toEqual({
      'codex:chthonic-gods': true,
    })
  })
})

describe('hades-dashboard save failures', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('surfaces a readable error and leaves overall progress unchanged when setFact fails to save', async () => {
    const element = mount(failingStore('disk full'))
    await element.updateComplete
    await element.updateComplete
    const before = composedText(element.shadowRoot!.querySelector('hd-progress')!.shadowRoot!)

    const panel = element.shadowRoot!.querySelector('next-steps-panel')!
    panel.dispatchEvent(
      new CustomEvent('fact-toggle', {
        detail: { id: 'nectar:test', value: true },
        bubbles: true,
        composed: true,
      }),
    )

    await vi.waitFor(() => expect(element.shadowRoot!.querySelector('.error')).toBeTruthy())
    expect(element.shadowRoot!.querySelector('.error')!.textContent).toContain('disk full')

    const after = composedText(element.shadowRoot!.querySelector('hd-progress')!.shadowRoot!)
    expect(after).toBe(before)
  })

  it('surfaces a readable error and leaves overall progress unchanged when replaceAll fails to save', async () => {
    const element = mount(failingStore('quota exceeded'))
    await element.updateComplete
    await element.updateComplete
    const before = composedText(element.shadowRoot!.querySelector('hd-progress')!.shadowRoot!)

    const transfer = element.shadowRoot!.querySelector('transfer-controls')!
    transfer.dispatchEvent(
      new CustomEvent('facts-import', {
        detail: { facts: { 'nectar:test': true } },
        bubbles: true,
        composed: true,
      }),
    )

    await vi.waitFor(() => expect(element.shadowRoot!.querySelector('.error')).toBeTruthy())
    expect(element.shadowRoot!.querySelector('.error')!.textContent).toContain('quota exceeded')

    const after = composedText(element.shadowRoot!.querySelector('hd-progress')!.shadowRoot!)
    expect(after).toBe(before)
  })

  it('clears a previous error once a save succeeds', async () => {
    const saved: unknown[] = []
    let shouldFail = true
    const store: ProgressStore = {
      load: async () => ({}),
      save: async (facts) => {
        if (shouldFail) throw new Error('disk full')
        saved.push(facts)
      },
    }
    const element = mount(store)
    await element.updateComplete
    await element.updateComplete

    const panel = element.shadowRoot!.querySelector('next-steps-panel')!
    panel.dispatchEvent(
      new CustomEvent('fact-toggle', {
        detail: { id: 'nectar:test', value: true },
        bubbles: true,
        composed: true,
      }),
    )
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector('.error')).toBeTruthy())

    shouldFail = false
    panel.dispatchEvent(
      new CustomEvent('fact-toggle', {
        detail: { id: 'nectar:test', value: true },
        bubbles: true,
        composed: true,
      }),
    )
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector('.error')).toBeFalsy())
    expect(saved).toEqual([{ 'nectar:test': true }])
  })

  it('does not let an earlier, slower success mask a later failure', async () => {
    const gate = deferred()
    const store: ProgressStore = {
      load: async () => ({}),
      save: async (facts) => {
        if ('nectar:slow' in facts) await gate.promise
        if ('nectar:fast' in facts) throw new Error('fast save rejected')
      },
    }
    const element = mount(store)
    await element.updateComplete
    await element.updateComplete

    const panel = element.shadowRoot!.querySelector('next-steps-panel')!
    panel.dispatchEvent(
      new CustomEvent('fact-toggle', {
        detail: { id: 'nectar:slow', value: true },
        bubbles: true,
        composed: true,
      }),
    )
    panel.dispatchEvent(
      new CustomEvent('fact-toggle', {
        detail: { id: 'nectar:fast', value: true },
        bubbles: true,
        composed: true,
      }),
    )

    // Give the fast (second) toggle every chance to settle and clear before
    // the slow (first) one's gate opens, the way it could when writes were
    // not serialized. `vi.waitFor` would stop at the first truthy poll, so
    // it could catch this transient state and miss a later clear — assert
    // on the fully settled state instead.
    await flushMicrotasks()
    gate.resolve()
    // Let the slow (first) toggle fully settle now that its gate is open.
    await flushMicrotasks()
    await element.updateComplete

    expect(element.shadowRoot!.querySelector('.error')?.textContent).toContain(
      'fast save rejected',
    )
  })
})
