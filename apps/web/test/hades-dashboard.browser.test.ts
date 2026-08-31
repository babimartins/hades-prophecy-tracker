import { dataset } from '@hades/data'
import { page } from '@vitest/browser/context'
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

describe('hades-dashboard layout', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('keeps Overall, Next steps and Backup in one row above the per-collection grid', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const topRow = element.shadowRoot!.querySelector('.top-row')!
    const topRowHeaders = [...topRow.querySelectorAll('hd-card > [slot="header"]')].map(
      (node) => node.textContent,
    )
    expect(topRowHeaders).toEqual(['Overall', 'Next steps', 'Backup'])

    // The per-collection cards render in a separate grid, after the top row,
    // so the player never scrolls past them to reach Next steps or Backup.
    const collectionsGrid = element.shadowRoot!.querySelector('.collections-grid')!
    expect(collectionsGrid.querySelector('hd-card')).toBeTruthy()
    expect(topRow.compareDocumentPosition(collectionsGrid) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })
})

describe('hades-dashboard top row', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  /**
   * Overall and Backup are short; Next steps is tall. Three equal grid
   * columns used to stretch every card to the tallest and leave a large
   * void under the two short ones. At a width with room for two columns,
   * Overall stacks directly above Backup in one column, next to the taller
   * Next steps in a second — deliberate, not an equal-height stretch.
   */
  it('stacks Overall above Backup in one column, beside the taller Next steps, once there is room', async () => {
    await page.viewport(1280, 900)
    try {
      const element = mount({ load: async () => ({}), save: async () => undefined })
      await element.updateComplete
      await element.updateComplete

      const topRow = element.shadowRoot!.querySelector('.top-row')!
      const cards = [...topRow.querySelectorAll('hd-card')]
      const [overall, nextSteps, backup] = cards.map((card) => card.getBoundingClientRect())

      // Overall and Backup share a column: same left edge, Overall above Backup.
      expect(overall!.left).toBeCloseTo(backup!.left, 0)
      expect(overall!.bottom).toBeLessThanOrEqual(backup!.top + 1)

      // Next steps sits in a second column, not stretched to match either
      // short card, and each card sizes to its own content.
      expect(nextSteps!.left).toBeGreaterThan(overall!.left)
      expect(overall!.height).toBeLessThan(nextSteps!.height)
      expect(backup!.height).toBeLessThan(nextSteps!.height)
    } finally {
      await page.viewport(414, 896)
    }
  })
})

describe('hades-dashboard does not scroll sideways on a narrow phone', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  /**
   * Reproduces the reviewer's exact measurement: at innerWidth 453, the
   * unfixed page had scrollWidth 625 — a nowrap label inside hd-checklist-item
   * (no min-width: 0 on an inline :host) set a large min-content width that
   * pushed the next-steps card, and with it the whole `repeat(auto-fit,
   * minmax(260px, 1fr))` track, past the viewport. WCAG 1.4.10 Reflow.
   */
  it('keeps document scrollWidth at or below innerWidth at 453px, list view and detail view', async () => {
    await page.viewport(453, 900)
    try {
      const element = mount({ load: async () => ({}), save: async () => undefined })
      await element.updateComplete
      await element.updateComplete

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)

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
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
    } finally {
      await page.viewport(414, 896)
    }
  })
})

describe('hades-dashboard search and filter results stay visible', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  /**
   * `defaultOpen` used to key off the narrowed achievements.length, so a
   * search or a filter — an explicit request to see rows — could collapse
   * every section shut and show nothing. The row-count threshold belongs on
   * the unfiltered view only; a narrowed view must always open.
   */
  /**
   * `<li>` rows inside a closed `<details>` are still present in the DOM —
   * `querySelectorAll('li')` finds them either way — so the real check is
   * visibility, not presence. `checkVisibility()` walks the ancestor chain
   * (a closed `<details>`'s `<ul>` child is `display: none` per the UA
   * stylesheet) and is what actually catches the "technically rendered,
   * not actually shown" bug; `offsetParent` and `getBoundingClientRect()`
   * both proved unreliable for this specific case in this test harness.
   */
  function visibleRowCount(list: Element): number {
    return [...list.shadowRoot!.querySelectorAll('li')].filter((li) =>
      (li as HTMLElement).checkVisibility(),
    ).length
  }

  it('renders visible rows for a search that matches many entries', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const searchBox = element.shadowRoot!.querySelector('search-box')!
    searchBox.dispatchEvent(
      new CustomEvent('search-change', { detail: { query: 'boon' }, bubbles: true, composed: true }),
    )
    await element.updateComplete

    const list = element.shadowRoot!.querySelector('achievement-list')!
    expect(visibleRowCount(list)).toBeGreaterThan(0)
  })

  it('renders visible rows when filtered to a single large collection', async () => {
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
    expect(visibleRowCount(list)).toBeGreaterThan(0)
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

describe('hades-dashboard scrolls the active view into place', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  /**
   * The detail view renders in the same DOM position the list occupied,
   * well below the 13 header cards. A click that opens it must not leave
   * the viewport exactly where it was, or the click reads as doing nothing.
   * Returning to the list must put it back in view for the same reason.
   */
  it('scrolls the detail view into place on open, and the list back into place on close', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const calls: Element[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element): void {
      calls.push(this)
    }

    try {
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
      // The scroll waits a frame for the newly opened view's own async
      // render to settle before it runs — see #scrollActiveViewIntoPlace.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const detail = element.shadowRoot!.querySelector('achievement-detail')!
      expect(calls).toContain(detail)

      calls.length = 0
      detail.dispatchEvent(new CustomEvent('detail-close', { bubbles: true, composed: true }))
      await element.updateComplete
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const filter = element.shadowRoot!.querySelector('collection-filter')!
      expect(calls).toContain(filter)
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  /**
   * `rect.top < innerHeight` is true even for a 24px sliver poking up from
   * the very bottom edge of the viewport — technically "in the viewport",
   * and not what a player means by "the thing I opened is what I'm looking
   * at". This is the assertion that let a near-invisible scroll through:
   * the opened entry's own heading must land at (or a hair below) the very
   * top of the viewport, with the dashboard scrolled off above it.
   */
  async function opensToTheTopOfTheViewport(width: number, height: number): Promise<void> {
    await page.viewport(width, height)
    try {
      const element = mount({ load: async () => ({}), save: async () => undefined })
      await element.updateComplete
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
      // Let the internal rAF-scheduled scroll (hades-dashboard.ts) run: it
      // deliberately waits a frame for achievement-detail's own async
      // render, and any components it mounts, to settle their real height
      // before scrolling against it.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const detail = element.shadowRoot!.querySelector('achievement-detail')!
      const detailTop = detail.getBoundingClientRect().top
      expect(detailTop).toBeGreaterThanOrEqual(-2)
      expect(detailTop).toBeLessThan(16)

      detail.dispatchEvent(new CustomEvent('detail-close', { bubbles: true, composed: true }))
      await element.updateComplete
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const filter = element.shadowRoot!.querySelector('collection-filter')!
      const filterTop = filter.getBoundingClientRect().top
      expect(filterTop).toBeGreaterThanOrEqual(-2)
      expect(filterTop).toBeLessThan(16)
    } finally {
      await page.viewport(414, 896)
    }
  }

  it('puts the opened entry — and the list on return — at the very top of the viewport at 1590px wide', async () => {
    await opensToTheTopOfTheViewport(1590, 900)
  })

  it('does the same at a narrow width, where the row is taller and the sliver-at-the-bottom bug was worse', async () => {
    await opensToTheTopOfTheViewport(390, 844)
  })
})

describe('hades-dashboard Overall feedback', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  /**
   * `overallProgress().done` counts completed entries: ticking one sub-item
   * of a multi-sub-item entry moves nothing, and the count crawls across
   * 545 entries even on a productive session. Overall now tracks recorded
   * facts instead — every tick moves it — while the entries-complete count
   * stays visible as text underneath. `overallProgress` itself is untouched:
   * this only changes what the interface chooses to show as Overall.
   */
  it('moves when a fact is recorded, even though no entry has completed yet', async () => {
    const element = mount({
      load: async () => ({ 'nectar:test-one': true, 'nectar:test-two': true }),
      save: async () => undefined,
    })
    await element.updateComplete
    await element.updateComplete

    const overallProgressEl = element.shadowRoot!.querySelector('.top-row hd-progress')!
    expect((overallProgressEl as unknown as { value: number }).value).toBe(2)
    expect((overallProgressEl as unknown as { max: number }).max).toBe(dataset.facts.length)

    // Neither fake fact id belongs to any real achievement, so the
    // entries-complete count stays at zero even though Overall moved.
    const entriesComplete = element.shadowRoot!.querySelector('.entries-complete')!
    expect(entriesComplete.textContent).toContain(`0 / ${dataset.achievements.length}`)
  })

  it('shows zero recorded facts before the player has done anything', async () => {
    const element = mount({ load: async () => ({}), save: async () => undefined })
    await element.updateComplete
    await element.updateComplete

    const overallProgressEl = element.shadowRoot!.querySelector('.top-row hd-progress')!
    expect((overallProgressEl as unknown as { value: number }).value).toBe(0)
    expect((overallProgressEl as unknown as { max: number }).max).toBe(dataset.facts.length)
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
