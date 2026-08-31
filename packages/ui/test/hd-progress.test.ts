import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-progress.js'

describe('hd-progress', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('exposes the progressbar role with the current values', async () => {
    render(html`<hd-progress .value=${2} .max=${5} label="Prophecies"></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    const bar = element.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
    expect(bar.getAttribute('aria-valuemax')).toBe('5')
    expect(bar.getAttribute('aria-label')).toBe('Prophecies')
  })

  it('shows the ratio as a percentage', async () => {
    render(html`<hd-progress .value=${1} .max=${4}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('25%')
  })

  it('renders the bar for two sub-items, the smallest count a bar can say anything about', async () => {
    render(html`<hd-progress .value=${1} .max=${2}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelector('.track')).toBeTruthy()
  })
})

/**
 * A max of 0 or 1 means the ratio can only ever read 0% or 100%: one bit.
 * The bar is the widest, heaviest element in a row for exactly this case —
 * 392 of 545 real entries. Below this max it renders a compact status
 * instead: no track, no percentage, done shown by more than colour alone.
 */
describe('hd-progress compact status for a single sub-item', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('renders no bar track when max is 1', async () => {
    render(html`<hd-progress .value=${0} .max=${1}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelector('.track')).toBeFalsy()
  })

  it('renders no bar track when max is 0', async () => {
    render(html`<hd-progress .value=${0} .max=${0}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelector('.track')).toBeFalsy()
  })

  it('still exposes the progressbar role and its current values', async () => {
    render(html`<hd-progress .value=${1} .max=${1} label="Give Nectar to Dusa"></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    const bar = element.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('aria-valuenow')).toBe('1')
    expect(bar.getAttribute('aria-valuemax')).toBe('1')
    expect(bar.getAttribute('aria-label')).toBe('Give Nectar to Dusa')
  })

  it('marks the not-done state with text, not colour alone', async () => {
    render(html`<hd-progress .value=${0} .max=${1}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    const bar = element.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('data-done')).toBe('false')
    expect(element.shadowRoot!.textContent).toContain('Not done')
  })

  it('marks the done state with different text and a different icon glyph, not colour alone', async () => {
    render(html`<hd-progress .value=${1} .max=${1}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    const bar = element.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('data-done')).toBe('true')
    expect(element.shadowRoot!.textContent).toContain('Done')
    expect(element.shadowRoot!.textContent).not.toContain('Not done')
  })
})
