import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-checklist-item.js'

describe('hd-checklist-item', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('reflects the checked state on the checkbox', async () => {
    render(html`<hd-checklist-item label="Give Nectar to Dusa" checked></hd-checklist-item>`, document.body)
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input')!
    expect(input.checked).toBe(true)
    expect(element.shadowRoot!.textContent).toContain('Give Nectar to Dusa')
  })

  it('truncates a long label instead of wrapping it, and keeps the badge on one line', async () => {
    render(
      html`<hd-checklist-item
        label="A label long enough to have wrapped across three lines in the old layout"
        badge="6 entries"
      ></hd-checklist-item>`,
      document.body,
    )
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    const label = element.shadowRoot!.querySelector('.label')!
    const badge = element.shadowRoot!.querySelector('.badge')!
    expect(getComputedStyle(label).whiteSpace).toBe('nowrap')
    expect(getComputedStyle(label).textOverflow).toBe('ellipsis')
    expect(getComputedStyle(badge).whiteSpace).toBe('nowrap')
  })

  it('fires hd-toggle when the user clicks the checkbox', async () => {
    render(html`<hd-checklist-item label="Give Nectar to Dusa"></hd-checklist-item>`, document.body)
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    const events: boolean[] = []
    element.addEventListener('hd-toggle', (event) => {
      events.push((event as CustomEvent<{ checked: boolean }>).detail.checked)
    })
    element.shadowRoot!.querySelector('input')!.click()
    expect(events).toEqual([true])
  })
})
