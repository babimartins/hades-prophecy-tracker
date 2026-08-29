import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/search-box.js'

describe('search-box', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('exposes a labelled search input', async () => {
    render(html`<search-box></search-box>`, document.body)
    const element = document.querySelector('search-box')!
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input')!
    expect(input.type).toBe('search')
    expect(input.getAttribute('aria-label')).toBe('Search entries')
  })

  it('fires search-change with the typed query', async () => {
    render(html`<search-box></search-box>`, document.body)
    const element = document.querySelector('search-box')!
    await element.updateComplete
    const queries: string[] = []
    element.addEventListener('search-change', (event) => {
      queries.push((event as CustomEvent<{ query: string }>).detail.query)
    })
    const input = element.shadowRoot!.querySelector('input')!
    input.value = 'dusa'
    input.dispatchEvent(new Event('input'))
    expect(queries).toEqual(['dusa'])
  })
})
