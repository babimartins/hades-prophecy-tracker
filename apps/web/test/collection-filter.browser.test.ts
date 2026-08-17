import type { Collection } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/collection-filter.js'

const collections: Collection[] = [
  { id: 'prophecy', name: 'Prophecies' },
  { id: 'codex', name: 'Codex' },
]

describe('collection-filter', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('renders one control per collection plus an All control', async () => {
    render(
      html`<collection-filter
        .collections=${collections}
        .selected=${undefined}
      ></collection-filter>`,
      document.body,
    )
    const element = document.querySelector('collection-filter')!
    await element.updateComplete
    const inputs = element.shadowRoot!.querySelectorAll('input[type="radio"]')
    expect(inputs.length).toBe(3)
    const labels = [...element.shadowRoot!.querySelectorAll('label')].map((label) =>
      label.textContent?.trim(),
    )
    expect(labels).toEqual(['All', 'Prophecies', 'Codex'])
  })

  it('exposes the selected collection through the native checked state, not colour alone', async () => {
    render(
      html`<collection-filter
        .collections=${collections}
        .selected=${'codex'}
      ></collection-filter>`,
      document.body,
    )
    const element = document.querySelector('collection-filter')!
    await element.updateComplete
    const checked = element.shadowRoot!.querySelector('input:checked') as HTMLInputElement
    expect(checked.value).toBe('codex')
  })

  it('exposes All as selected when selected is undefined', async () => {
    render(
      html`<collection-filter
        .collections=${collections}
        .selected=${undefined}
      ></collection-filter>`,
      document.body,
    )
    const element = document.querySelector('collection-filter')!
    await element.updateComplete
    const checked = element.shadowRoot!.querySelector('input:checked') as HTMLInputElement
    expect(checked.value).toBe('')
  })

  it('fires collection-select with the chosen id', async () => {
    render(
      html`<collection-filter
        .collections=${collections}
        .selected=${undefined}
      ></collection-filter>`,
      document.body,
    )
    const element = document.querySelector('collection-filter')!
    await element.updateComplete
    const ids: (string | undefined)[] = []
    element.addEventListener('collection-select', (event) => {
      ids.push((event as CustomEvent<{ id: string | undefined }>).detail.id)
    })
    const input = element.shadowRoot!.querySelector('input[value="codex"]') as HTMLInputElement
    input.checked = true
    input.dispatchEvent(new Event('change'))
    expect(ids).toEqual(['codex'])
  })

  it('fires collection-select with undefined when All is chosen', async () => {
    render(
      html`<collection-filter
        .collections=${collections}
        .selected=${'codex'}
      ></collection-filter>`,
      document.body,
    )
    const element = document.querySelector('collection-filter')!
    await element.updateComplete
    const ids: (string | undefined)[] = []
    element.addEventListener('collection-select', (event) => {
      ids.push((event as CustomEvent<{ id: string | undefined }>).detail.id)
    })
    const input = element.shadowRoot!.querySelector('input[value=""]') as HTMLInputElement
    input.checked = true
    input.dispatchEvent(new Event('change'))
    expect(ids).toEqual([undefined])
  })
})
