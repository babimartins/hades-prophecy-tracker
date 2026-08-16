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

  it('treats a max of zero as empty', async () => {
    render(html`<hd-progress .value=${0} .max=${0}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('0%')
  })
})
