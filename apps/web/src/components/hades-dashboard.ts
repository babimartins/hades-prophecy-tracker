import { dataset } from '@hades/data'
import { overallProgress, type FactMap } from '@hades/engine'
import type { Fact } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, type PropertyValues } from 'lit'
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
      font-family: var(--hd-font-display, serif);
      font-size: 1.5rem;
      font-weight: 600;
    }
    .error {
      color: ${colorVar('--hd-color-accent')};
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin-bottom: 24px;
    }
    /**
     * Overall and Backup are short (roughly 105px each); Next steps is
     * tall. Three equal grid columns stretched every card to the tallest
     * and left a large void under Overall and Backup. Overall stacks above
     * Backup in one column instead, next to Next steps in a second, taller
     * column — each column sized by its own content, no stretch to match
     * an unrelated neighbour. Below 640px there is no room for two
     * columns, so all three stack in the original single-column order.
     */
    .top-row {
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .top-row {
        align-items: start;
        grid-template-areas: 'overall next' 'backup next';
        grid-template-columns: minmax(220px, 1fr) minmax(280px, 1.6fr);
      }
      .top-row hd-card:nth-of-type(1) {
        grid-area: overall;
      }
      .top-row hd-card:nth-of-type(2) {
        grid-area: next;
      }
      .top-row hd-card:nth-of-type(3) {
        grid-area: backup;
      }
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

  /**
   * Opening an entry, or returning from it, renders the new content at the
   * same place in the DOM the old content occupied — well below the 13
   * header cards. Without a scroll, the viewport never moves, so the click
   * looks like it did nothing. Puts whichever view just appeared in view,
   * without a router and without touching browser history.
   */
  protected override updated(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has('openId')) return
    const target = this.openId
      ? this.shadowRoot?.querySelector('achievement-detail')
      : this.shadowRoot?.querySelector('collection-filter')
    target?.scrollIntoView({ block: 'start' })
  }

  private onSearch(event: CustomEvent<{ query: string }>): void {
    this.query = event.detail.query
    this.openId = undefined
  }

  private onCollectionSelect(event: CustomEvent<{ id: string | undefined }>): void {
    this.selectedCollection = event.detail.id
    this.openId = undefined
  }

  private onSectionToggle(
    event: CustomEvent<{ collection: string; section: string; open: boolean }>,
  ): void {
    const { collection, section, open } = event.detail
    const key = `${collection}:${section}`
    this.collapsedSections = { ...this.collapsedSections, [key]: !open }
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
      <div class="grid top-row">
        <hd-card>
          <span slot="header">Overall</span>
          <hd-progress
            .value=${overall.done}
            .max=${overall.total}
            label="Overall progress"
          ></hd-progress>
        </hd-card>
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
      <div class="grid collections-grid">
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
              .collections=${collectionsWithEntries(dataset)}
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
