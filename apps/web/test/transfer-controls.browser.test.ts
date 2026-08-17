import type { FactMap } from '@hades/engine'
import { html, render } from 'lit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../src/components/transfer-controls.js'

function fileWith(content: string): File {
  return new File([content], 'progress.json', { type: 'application/json' })
}

function setInputFile(input: HTMLInputElement, file: File): void {
  const transfer = new DataTransfer()
  transfer.items.add(file)
  input.files = transfer.files
  input.dispatchEvent(new Event('change'))
}

describe('transfer-controls', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports the current facts as a downloadable JSON file', async () => {
    const facts: FactMap = { 'nectar:dusa': true }
    render(html`<transfer-controls .facts=${facts}></transfer-controls>`, document.body)
    const element = document.querySelector('transfer-controls')!
    await element.updateComplete

    let capturedBlob: Blob | undefined
    let capturedDownload = ''
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlob = blob as Blob
      return 'blob:mock'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      capturedDownload = this.download
    })

    element.shadowRoot!.querySelector('button')!.click()

    expect(capturedDownload).toBe('hades-progress.json')
    expect(capturedBlob).toBeInstanceOf(Blob)
    const text = await capturedBlob!.text()
    expect(JSON.parse(text)).toEqual({ version: 1, facts })
  })

  it('imports a valid file and fires facts-import with the parsed facts', async () => {
    render(html`<transfer-controls .facts=${{}}></transfer-controls>`, document.body)
    const element = document.querySelector('transfer-controls')!
    await element.updateComplete

    const detail: Array<{ facts: FactMap }> = []
    element.addEventListener('facts-import', (event) => {
      detail.push((event as CustomEvent<{ facts: FactMap }>).detail)
    })

    const input = element.shadowRoot!.querySelector('input[type="file"]') as HTMLInputElement
    setInputFile(input, fileWith(JSON.stringify({ version: 1, facts: { 'a:one': true } })))

    await vi.waitFor(() => expect(detail).toEqual([{ facts: { 'a:one': true } }]))
    expect(input.value).toBe('')
  })

  it('rejects a malformed file with a readable message and does not import it', async () => {
    render(html`<transfer-controls .facts=${{}}></transfer-controls>`, document.body)
    const element = document.querySelector('transfer-controls')!
    await element.updateComplete

    const detail: Array<{ facts: FactMap }> = []
    element.addEventListener('facts-import', (event) => {
      detail.push((event as CustomEvent<{ facts: FactMap }>).detail)
    })

    const input = element.shadowRoot!.querySelector('input[type="file"]') as HTMLInputElement
    setInputFile(input, fileWith('not valid json'))

    await vi.waitFor(() =>
      expect(element.shadowRoot!.querySelector('.error')?.textContent).toBeTruthy(),
    )
    expect(detail).toEqual([])
  })

  it('rejects a well-formed file with an unsupported version', async () => {
    render(html`<transfer-controls .facts=${{}}></transfer-controls>`, document.body)
    const element = document.querySelector('transfer-controls')!
    await element.updateComplete

    const detail: Array<{ facts: FactMap }> = []
    element.addEventListener('facts-import', (event) => {
      detail.push((event as CustomEvent<{ facts: FactMap }>).detail)
    })

    const input = element.shadowRoot!.querySelector('input[type="file"]') as HTMLInputElement
    setInputFile(input, fileWith(JSON.stringify({ version: 2, facts: {} })))

    await vi.waitFor(() =>
      expect(element.shadowRoot!.textContent).toContain('Unsupported file version'),
    )
    expect(detail).toEqual([])
  })
})
