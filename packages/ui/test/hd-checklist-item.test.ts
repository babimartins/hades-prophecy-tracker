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

  it('keeps the badge on one line but wraps a long label instead of cutting it off', async () => {
    render(
      html`<hd-checklist-item
        label="Get past Cerberus at the Temple of Styx while wielding the Stygius aspect of Zagreus"
        badge="6 entries"
      ></hd-checklist-item>`,
      document.body,
    )
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    const label = element.shadowRoot!.querySelector('.label')!
    const badge = element.shadowRoot!.querySelector('.badge')!
    // An earlier version truncated the label with an ellipsis. That reached
    // requirement-tree, not only the next-steps card it was scoped for, and
    // cut off the back half of a step's own instruction with no way to read
    // it. The full label must always be present as real text.
    expect(getComputedStyle(label).whiteSpace).not.toBe('nowrap')
    expect(label.textContent).toBe(
      'Get past Cerberus at the Temple of Styx while wielding the Stygius aspect of Zagreus',
    )
    expect(getComputedStyle(badge).whiteSpace).toBe('nowrap')
  })

  /**
   * The custom-element default display is inline. An inline host containing
   * this component's flex-row shadow content sizes its box to the content's
   * min-content width rather than the width its container offers -- with a
   * long label that width can run to hundreds of pixels wider than any
   * reasonable container, and a CSS grid track sized around it (the
   * top-row card grid in hades-dashboard.ts) is forced wider than the
   * viewport. `display: block` is what makes this row behave like a row.
   */
  it('is a block-level host, not the inline default for a custom element', async () => {
    render(html`<hd-checklist-item label="Row"></hd-checklist-item>`, document.body)
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    expect(getComputedStyle(element).display).toBe('block')
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
