import { dataset } from '@hades/data'
import { achievementProgress, isComplete, subjectsOfType } from '@hades/engine'
import type { FactMap } from '@hades/engine'
import { colorVar, spaceVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { ProgressState } from '../state/progress-state.js'
import { createIndexedDbStore } from '../storage/indexeddb-store.js'
import type { ProgressStore } from '../storage/progress-store.js'
import { StateController } from './state-controller.js'
import { buildRows, isFoe } from './character-table.js'
import './character-table.js'
import './next-steps-page.js'
import './rail-section.js'
import './subject-page.js'
import './transfer-controls.js'
import './weapon-table.js'

export type SectionId =
  | 'next'
  | 'characters'
  | 'weapons'
  | 'fated'
  | 'house'
  | 'collections'


interface Section {
  id: SectionId
  label: string
}

/**
 * How many characters the default view shows, and how many exist.
 *
 * Computed once. `buildRows({})` walks 73 characters and calls `subjectFacts`,
 * `subjectProgress` and `subjectCapabilities` on each, every one a filter over
 * 692 facts — about 25ms, measured, to produce a number that cannot change at
 * runtime. Doing it inside `render` paid that on every shell update.
 */
const SHOWN_CHARACTERS = buildRows({}).filter((row) => !isFoe(row)).length
const TOTAL_CHARACTERS = subjectsOfType(dataset, 'character').length

/**
 * The order the owner approved. Collections is last on purpose.
 *
 * Next Steps came later and leads, because it answers the question she opens
 * the app with. The other five keep the order she walked through.
 */
export const SECTIONS: readonly Section[] = [
  { id: 'next', label: 'Next Steps' },
  { id: 'characters', label: 'Characters' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'fated', label: 'Fated List' },
  { id: 'house', label: 'The House' },
  { id: 'collections', label: 'Collections' },
]

/**
 * The application shell.
 *
 * Its one structural rule: **the page never scrolls.** The header, the tab bar
 * and the footer are fixed, and whichever region holds the section's main
 * content scrolls inside the frame. The owner asked for this directly — a long
 * table gets a scrollbar, the page height stays put.
 */
export class AppShell extends LitElement {
  static override readonly styles = css`
    :host {
      /*
       * The shell is the fixed-height frame. 100dvh rather than 100vh so a
       * phone's collapsing address bar does not leave a scrollable sliver.
       */
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
    }

    /* padding-inline, not the padding shorthand. As padding: 0 20px this rule
       beat the main and footer rules on specificity and silently zeroed their
       vertical padding, so the content sat flush against the header and the
       footer buttons had no room at all. */
    .wrap {
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 1120px;
      padding-inline: ${spaceVar('--hd-space-5')};
      width: 100%;
    }

    /* No divider. The header's own surface colour separates it from the page,
       and the active tab's indicator is the only line in the region. Carrying
       a border here as well put two parallel lines a tab's height apart, which
       reads as a stray rule rather than as an edge. */
    header {
      background: ${colorVar('--hd-color-surface')};
      flex: none;
    }

    .top {
      align-items: center;
      display: flex;
      gap: ${spaceVar('--hd-space-4')};
      padding-top: ${spaceVar('--hd-space-4')};
    }

    h1 {
      font-family: var(--hd-font-display, serif);
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
    }

    .overall {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.8rem;
      margin-left: auto;
      text-align: right;
    }

    .overall b {
      color: ${colorVar('--hd-color-accent')};
      font-variant-numeric: tabular-nums;
    }

    /* No padding below the tabs. The active tab's indicator has to land on
       the header's own divider; separated from it by even a little, the two
       read as a pair of stray parallel lines. The room between the tabs and
       the content is main's padding-top instead. */
    nav {
      display: flex;
      gap: ${spaceVar('--hd-space-hair')};
      margin-top: ${spaceVar('--hd-space-3')};
      overflow-x: auto;
      scrollbar-width: none;
    }

    nav::-webkit-scrollbar {
      display: none;
    }

    nav button {
      background: none;
      border: 0;
      border-bottom: 2px solid transparent;
      border-radius: 8px 8px 0 0;
      color: ${colorVar('--hd-color-muted')};
      cursor: pointer;
      font: inherit;
      padding: ${spaceVar('--hd-space-2')} ${spaceVar('--hd-space-4')};
      white-space: nowrap;
    }

    nav button:hover {
      color: ${colorVar('--hd-color-text')};
    }

    nav button[aria-current='page'] {
      border-bottom-color: ${colorVar('--hd-color-accent')};
      color: ${colorVar('--hd-color-accent')};
    }

    /*
     * main carries .wrap, whose margin: 0 auto would stop a flex item
     * from stretching. width: 100% restores the full track so max-width
     * can cap it and the auto margins can centre it. Without this the page
     * collapses to its content width and sits off to one side.
     */
    main {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      padding-top: ${spaceVar('--hd-space-5')};
    }

    .phead {
      align-items: baseline;
      display: flex;
      flex-wrap: wrap;
      gap: ${spaceVar('--hd-space-3')};
      margin: 0 0 ${spaceVar('--hd-space-3')};
    }

    .phead h2 {
      font-family: var(--hd-font-display, serif);
      font-size: 1.35rem;
      margin: 0;
    }

    .phead .count {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.78rem;
    }

    [data-page] {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    [data-page][hidden] {
      display: none;
    }

    footer {
      border-top: 1px solid ${colorVar('--hd-color-muted')};
      color: ${colorVar('--hd-color-muted')};
      flex: none;
      font-size: 0.72rem;
      padding-block: ${spaceVar('--hd-space-3')};
    }

    .error {
      color: ${colorVar('--hd-color-accent')};
    }

    footer {
      align-items: center;
      display: flex;
      gap: ${spaceVar('--hd-space-3')};
      justify-content: space-between;
    }
  `

  static override readonly properties = {
    section: { type: String },
    subject: { type: String },
    error: { type: String },
  }

  section: SectionId = 'next'
  /** The open subject, or empty for the section's index. Not a sixth tab. */
  subject = ''
  error = ''

  #state = new ProgressState(this.#createStore())
  #controller = new StateController(this, this.#state)

  #createStore(): ProgressStore {
    return createIndexedDbStore()
  }

  get facts(): FactMap {
    return this.#controller.state.facts
  }

  /** Facts the player has recorded, out of every fact in the dataset. */
  get recorded(): { done: number; total: number } {
    const facts = this.facts
    let done = 0
    for (const fact of dataset.facts) {
      const value = facts[fact.id]
      if (fact.kind === 'number' && fact.max !== undefined) {
        if (typeof value === 'number' && value >= fact.max) done += 1
      } else if (value === true || (typeof value === 'number' && value > 0)) {
        done += 1
      }
    }
    return { done, total: dataset.facts.length }
  }

  #select(section: SectionId): void {
    this.section = section
    this.subject = ''
  }

  async #setFact(event: CustomEvent<{ id: string; value: boolean | number }>): Promise<void> {
    try {
      await this.#controller.state.setFact(event.detail.id, event.detail.value)
      this.error = ''
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'an unknown error'
      this.error = `Your progress did not save: ${detail}.`
    }
  }

  /** The counts under a section heading, computed rather than written down. */
  #summary(section: SectionId): string {
    const facts = (namespace: string): number =>
      dataset.facts.filter((fact) => fact.id.startsWith(`${namespace}:`)).length
    switch (section) {
      case 'next':
        return 'what to do, and where you do it'
      case 'characters':
        return `${TOTAL_CHARACTERS} characters · ${SHOWN_CHARACTERS} with more than combat · ${facts('nectar')} with affinity`
      case 'weapons':
        return `${subjectsOfType(dataset, 'weapon').length} weapons · ${facts('aspect')} aspects · ${facts('daedalus')} enchantments`
      case 'fated': {
        const prophecies = dataset.achievements.filter((a) => a.collection === 'prophecy')
        const complete = prophecies.filter((a) =>
          isComplete(achievementProgress(a, this.facts)),
        ).length
        return `${prophecies.length} minor prophecies · ${complete} complete`
      }
      case 'house':
        return 'what you buy and what you configure'
      case 'collections':
        return 'closed lists with no other owner'
    }
  }

  #body(section: SectionId): TemplateResult {
    if (this.subject) {
      return html`<subject-page .subjectId=${this.subject} .facts=${this.facts}></subject-page>`
    }
    switch (section) {
      case 'next':
        return html`<next-steps-page .facts=${this.facts}></next-steps-page>`
      case 'characters':
        return html`<character-table .facts=${this.facts}></character-table>`
      case 'weapons':
        return html`<weapon-table .facts=${this.facts}></weapon-table>`
      case 'fated':
      case 'house':
      case 'collections':
        return html`<rail-section .section=${section} .facts=${this.facts}></rail-section>`
    }
  }

  override render(): TemplateResult {
    const { done, total } = this.recorded
    return html`
      <header>
        <div class="wrap">
          <div class="top">
            <h1>Hades Tracker</h1>
            <p class="overall">
              <b>${done}</b> of ${total} actions recorded
            </p>
          </div>
          <nav aria-label="Sections">
            ${SECTIONS.map(
              (section) => html`
                <button
                  data-section=${section.id}
                  aria-current=${this.section === section.id ? 'page' : nothing}
                  @click=${() => this.#select(section.id)}
                >
                  ${section.label}
                </button>
              `,
            )}
          </nav>
        </div>
      </header>

      <main
        class="wrap"
        @open-subject=${(event: CustomEvent<{ id: string }>) => {
          this.subject = event.detail.id
        }}
        @close-subject=${() => {
          this.subject = ''
        }}
        @set-fact=${(event: CustomEvent<{ id: string; value: boolean | number }>) =>
          void this.#setFact(event)}
      >
        ${SECTIONS.map(
          (section) => html`
            <div data-page=${section.id} ?hidden=${this.section !== section.id}>
              ${this.section === section.id
                ? html`
                    ${this.subject
                      ? nothing
                      : html`
                          <div class="phead">
                            <h2>${section.label}</h2>
                            <span class="count">${this.#summary(section.id)}</span>
                          </div>
                        `}
                    ${this.#body(section.id)}
                  `
                : nothing}
            </div>
          `,
        )}
      </main>

      <footer class="wrap">
        ${this.error
          ? html`<span class="error" role="alert">${this.error}</span>`
          : html`Progress stays in this browser. Use Backup to keep a copy.`}
        <transfer-controls
          .facts=${this.facts}
          @facts-import=${(event: CustomEvent<{ facts: FactMap }>) =>
            void this.#controller.state.replaceAll(event.detail.facts)}
        ></transfer-controls>
      </footer>
    `
  }
}

customElements.define('app-shell', AppShell)

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell
  }
}
