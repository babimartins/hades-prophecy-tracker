import { dataset } from '@hades/data'
import { overallProgress, type FactMap } from '@hades/engine'
import type { Fact } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement } from 'lit'
import { collectionsWithEntries, visibleAchievements } from '../lib/achievement-filter.js'
import { ProgressState } from '../state/progress-state.js'
import { createIndexedDbStore } from '../storage/indexeddb-store.js'
import type { ProgressStore } from '../storage/progress-store.js'
import './achievement-detail.js'
import './achievement-list.js'
import './collection-filter.js'
import './next-steps-panel.js'
import './search-box.js'
import './transfer-controls.js'
import { StateController } from './state-controller.js'

function describeSaveFailure(cause: unknown): string {
  const detail = cause instanceof Error ? cause.message : 'an unknown error'
  return `Your progress did not save: ${detail}.`
}

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
    .error {
      color: var(--hd-color-accent, #c8102e);
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin-bottom: 24px;
    }
  `

  static override readonly properties = {
    openId: { state: true },
    saveError: { state: true },
    query: { state: true },
    selectedCollection: { state: true },
    collapsedSections: { state: true },
  }

  openId: string | undefined
  saveError = ''
  query = ''
  selectedCollection: string | undefined = undefined
  collapsedSections: Record<string, boolean> = {}

  readonly #controller: StateController
  readonly #factsById: Map<string, Fact> = new Map(
    dataset.facts.map((fact) => [fact.id, fact]),
  )

  /** `store` is injectable so a test can verify a failed save is never presented as a success. */
  constructor(store: ProgressStore = createIndexedDbStore()) {
    super()
    this.#controller = new StateController(this, new ProgressState(store))
  }

  private onOpen(event: CustomEvent<{ id: string }>): void {
    this.openId = event.detail.id
  }

  private onSearch(event: CustomEvent<{ query: string }>): void {
    this.query = event.detail.query
    this.openId = undefined
  }

  private onCollectionSelect(event: CustomEvent<{ id: string | undefined }>): void {
    this.selectedCollection = event.detail.id
    this.openId = undefined
  }

  private onSectionToggle(event: CustomEvent<{ section: string; open: boolean }>): void {
    const { section, open } = event.detail
    this.collapsedSections = { ...this.collapsedSections, [section]: !open }
  }

  private async onFactToggle(
    event: CustomEvent<{ id: string; value: boolean | number }>,
  ): Promise<void> {
    try {
      await this.#controller.state.setFact(event.detail.id, event.detail.value)
      this.saveError = ''
    } catch (cause) {
      this.saveError = describeSaveFailure(cause)
    }
  }

  private async onImport(event: CustomEvent<{ facts: FactMap }>): Promise<void> {
    try {
      await this.#controller.state.replaceAll(event.detail.facts)
      this.saveError = ''
    } catch (cause) {
      this.saveError = describeSaveFailure(cause)
    }
  }

  override render() {
    const facts = this.#controller.state.facts
    const overall = overallProgress(dataset, facts)

    return html`
      <h1>Hades Prophecy Tracker</h1>
      ${this.saveError ? html`<p class="error">${this.saveError}</p>` : null}
      <div class="grid">
        <hd-card>
          <span slot="header">Overall</span>
          <hd-progress
            .value=${overall.done}
            .max=${overall.total}
            label="Overall progress"
          ></hd-progress>
        </hd-card>
        ${dataset.collections
          .filter((collection) => (overall.byCollection[collection.id]?.total ?? 0) > 0)
          .map((collection) => {
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
        <hd-card>
          <span slot="header">Next steps</span>
          <next-steps-panel
            .catalog=${dataset}
            .facts=${facts}
            .limit=${8}
            @fact-toggle=${this.onFactToggle}
          ></next-steps-panel>
        </hd-card>
        <hd-card>
          <span slot="header">Backup</span>
          <transfer-controls .facts=${facts} @facts-import=${this.onImport}></transfer-controls>
        </hd-card>
      </div>
      ${this.openId
        ? html`
            <achievement-detail
              .achievement=${dataset.achievements.find((item) => item.id === this.openId)}
              .facts=${facts}
              .factsById=${this.#factsById}
              @fact-toggle=${this.onFactToggle}
              @detail-close=${() => (this.openId = undefined)}
            ></achievement-detail>
          `
        : html`
            <collection-filter
              .collections=${collectionsWithEntries(dataset)}
              .selected=${this.selectedCollection}
              @collection-select=${this.onCollectionSelect}
            ></collection-filter>
            <search-box .value=${this.query} @search-change=${this.onSearch}></search-box>
            <achievement-list
              .achievements=${visibleAchievements(dataset, this.selectedCollection, this.query)}
              .facts=${facts}
              .collapsedSections=${this.collapsedSections}
              @achievement-open=${this.onOpen}
              @section-toggle=${this.onSectionToggle}
            ></achievement-list>
          `}
    `
  }
}

customElements.define('hades-dashboard', HadesDashboard)

declare global {
  interface HTMLElementTagNameMap {
    'hades-dashboard': HadesDashboard
  }
}
