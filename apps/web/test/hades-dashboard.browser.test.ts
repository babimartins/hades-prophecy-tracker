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
