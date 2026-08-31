import type { FactMap } from '@hades/engine'
import { colorVar, spaceVar } from '@hades/ui'
import { css, html, LitElement } from 'lit'
import { parseTransfer, toTransfer } from '../storage/transfer.js'

/** Fires `facts-import` with `detail: { facts }` after a successful import. */
export class TransferControls extends LitElement {
  static override readonly styles = css`
    .row {
      display: flex;
      gap: ${spaceVar('--hd-space-2')};
    }
    button,
    label {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: ${spaceVar('--hd-space-2')} ${spaceVar('--hd-space-3')};
    }
    input[type='file'] {
      display: none;
    }
    .error {
      color: ${colorVar('--hd-color-accent')};
    }
  `

  static override readonly properties = {
    facts: { type: Object },
    error: { state: true },
  }

  facts: FactMap = {}
  error = ''

  private exportFacts(): void {
    const blob = new Blob([JSON.stringify(toTransfer(this.facts), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'hades-progress.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  private async importFacts(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const facts = parseTransfer(JSON.parse(await file.text()))
      this.error = ''
      this.dispatchEvent(
        new CustomEvent('facts-import', { detail: { facts }, bubbles: true, composed: true }),
      )
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : 'The file is not readable.'
    } finally {
      input.value = ''
    }
  }

  override render() {
    return html`
      <div class="row">
        <button type="button" @click=${this.exportFacts}>Export</button>
        <label>
          Import
          <input type="file" accept="application/json" @change=${this.importFacts} />
        </label>
      </div>
      ${this.error ? html`<p class="error">${this.error}</p>` : null}
    `
  }
}

customElements.define('transfer-controls', TransferControls)

declare global {
  interface HTMLElementTagNameMap {
    'transfer-controls': TransferControls
  }
}
