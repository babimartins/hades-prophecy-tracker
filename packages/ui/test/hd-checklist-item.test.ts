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
