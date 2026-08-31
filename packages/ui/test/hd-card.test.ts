import { html, render } from 'lit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-card.js'

describe('hd-card header font', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--hd-font-display')
  })

  /**
   * Cinzel in small caps on every card header — 13 of them on the dashboard
   * alone — is hard to scan at small sizes, and wraps a long collection
   * name onto two lines inside its card. The display font stays for the
   * page title and section headings; the per-card header reads in the
   * ordinary body font instead.
   */
  it('does not render its header in the consumer-supplied display font', async () => {
    document.documentElement.style.setProperty('--hd-font-display', 'CustomDisplayFont, serif')
    render(
      html`<hd-card><span slot="header">Fated List of Minor Prophecies</span></hd-card>`,
      document.body,
    )
    const card = document.querySelector('hd-card')!
    await card.updateComplete
    const header = card.shadowRoot!.querySelector('header')!
    expect(getComputedStyle(header).fontFamily).not.toContain('CustomDisplayFont')
  })
})
