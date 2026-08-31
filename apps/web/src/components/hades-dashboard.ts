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
    .entries-complete {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.8rem;
      margin: 6px 0 0;
    }
    /*
     * Whichever view is active (the detail, or the filter/search/list
     * group) is the last thing in the document, with nothing after it. A
     * short achievement-detail -- one prophecy, a handful of steps -- can
     * be shorter than the viewport, and a browser cannot scroll an
     * element's top flush with the viewport top when there is not enough
     * document left below it: it scrolls as far as the document's natural
     * end allows and stops there, leaving the opened entry sitting low in
     * the viewport instead of at its top. A guaranteed minimum height
     * gives the scrollIntoView call in scrollActiveViewIntoPlace enough
     * room below the target to always reach the top, whatever the entry's
     * own length. 100dvh accounts for a mobile browser's address bar;
     * 100vh is the fallback where dvh is unsupported.
     */
    .active-view {
      min-height: 100vh;
      min-height: 100dvh;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin-bottom: 24px;
    }
    /*
     * A grid item's automatic minimum size defaults to its content's
     * min-content width, which a minmax(260px, 1fr) track's explicit
     * 260px minimum does not override on its own -- an unbreakable run of
     * text anywhere in an hd-card's subtree could still force every card in
     * its column wider than 260px, and every card sharing that column
     * along with it. min-width: 0 is what actually lets a card shrink to
     * the track's own size.
     */
    .grid > * {
      min-width: 0;
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
   *
   * `scrollIntoView` fires the instant this element's own render lands, but
   * `achievement-detail` (and the components it mounts — hd-progress,
   * requirement-tree) render themselves a moment later, each on its own
   * microtask. Scrolling before that leaves the browser measuring a
   * near-empty element: the scroll lands short of the true top, and once
   * the content grows in underneath it, scroll anchoring "corrects" the
   * position again — undoing most of the scroll and leaving only a sliver
   * of the opened entry on screen. Waiting one animation frame runs after
   * every microtask-scheduled child update has settled, so the target's
   * real height and position are in place before `start` is measured
   * against them. `body { overflow-anchor: none }` (theme.css) is a second
   * line of defence against the same class of bug.
   */
  protected override updated(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has('openId')) return
    void this.#scrollActiveViewIntoPlace()
  }

  async #scrollActiveViewIntoPlace(): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
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
    // `overall.done` counts completed entries: ticking one sub-item of a
    // multi-sub-item entry moves it by nothing, so the bar barely crawls
    // across 545 entries even on a productive session. `overallProgress`
    // itself is untouched — this is what the interface chooses to show as
    // Overall, counting every recorded fact instead, so every tick moves
    // it. The entries-complete count stays visible as text underneath.
    const factsRecorded = Object.keys(facts).length

    return html`
      <h1>Hades Prophecy Tracker</h1>
      ${this.saveError ? html`<p class="error">${this.saveError}</p>` : null}
      <div class="grid top-row">
        <hd-card>
          <span slot="header">Overall</span>
          <hd-progress
            .value=${factsRecorded}
            .max=${dataset.facts.length}
            label="Actions recorded"
          ></hd-progress>
          <p class="entries-complete">${overall.done} / ${overall.total} entries complete</p>
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
            <div class="active-view">
              <achievement-detail
                .achievement=${dataset.achievements.find((item) => item.id === this.openId)}
                .facts=${facts}
                .factsById=${this.#factsById}
                @fact-toggle=${this.onFactToggle}
                @detail-close=${() => (this.openId = undefined)}
              ></achievement-detail>
            </div>
          `
        : html`
            <div class="active-view">
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
                .narrowed=${this.query !== '' || this.selectedCollection !== undefined}
                @achievement-open=${this.onOpen}
                @section-toggle=${this.onSectionToggle}
              ></achievement-list>
            </div>
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
