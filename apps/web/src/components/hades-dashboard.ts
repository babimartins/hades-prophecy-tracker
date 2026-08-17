import { dataset } from '@hades/data'
import { overallProgress } from '@hades/engine'
import '@hades/ui'
import { css, html, LitElement } from 'lit'
import { ProgressState } from '../state/progress-state.js'
import { createIndexedDbStore } from '../storage/indexeddb-store.js'
import './achievement-list.js'
import { StateController } from './state-controller.js'

export class HadesDashboard extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
      margin: 0 auto;
      max-width: 900px;
    }
    h1 {
      font-size: 1.5rem;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin-bottom: 24px;
    }
  `

  readonly #controller = new StateController(this, new ProgressState(createIndexedDbStore()))

  override render() {
    const facts = this.#controller.state.facts
    const overall = overallProgress(dataset, facts)

    return html`
      <h1>Hades Prophecy Tracker</h1>
      <div class="grid">
        <hd-card>
          <span slot="header">Overall</span>
          <hd-progress
            .value=${overall.done}
            .max=${overall.total}
            label="Overall progress"
          ></hd-progress>
        </hd-card>
        ${dataset.collections.map((collection) => {
          const bucket = overall.byCollection[collection.id]
          return html`
            <hd-card>
              <span slot="header">${collection.name}</span>
              <hd-progress
                .value=${bucket?.done ?? 0}
                .max=${bucket?.total ?? 0}
                label=${collection.name}
              ></hd-progress>
            </hd-card>
          `
        })}
      </div>
      <achievement-list .achievements=${dataset.achievements} .facts=${facts}></achievement-list>
    `
  }
}

customElements.define('hades-dashboard', HadesDashboard)

declare global {
  interface HTMLElementTagNameMap {
    'hades-dashboard': HadesDashboard
  }
}
