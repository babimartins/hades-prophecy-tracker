import { dataset } from '@hades/data'
import type { FactMap } from '@hades/engine'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { ProgressState } from '../state/progress-state.js'
import { createIndexedDbStore } from '../storage/indexeddb-store.js'
import type { ProgressStore } from '../storage/progress-store.js'
import { StateController } from './state-controller.js'

export type SectionId = 'characters' | 'weapons' | 'fated' | 'house' | 'collections'

interface Section {
  id: SectionId
  label: string
}

/** The order the owner approved. Collections is last on purpose. */
export const SECTIONS: readonly Section[] = [
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

    .wrap {
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 1120px;
      padding: 0 20px;
      width: 100%;
    }

    header {
      background: ${colorVar('--hd-color-surface')};
      border-bottom: 1px solid ${colorVar('--hd-color-muted')};
      flex: none;
    }

    .top {
      align-items: center;
      display: flex;
      gap: 16px;
      padding-top: 14px;
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

    nav {
      display: flex;
      gap: 2px;
      margin-top: 12px;
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
      padding: 9px 15px;
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
      padding-top: 22px;
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
      padding: 10px 0;
    }

    .placeholder {
      color: ${colorVar('--hd-color-muted')};
      padding: 24px 0;
    }
  `

  static override readonly properties = {
    section: { type: String },
    error: { type: String },
  }

  section: SectionId = 'characters'
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

      <main class="wrap">
        ${SECTIONS.map(
          (section) => html`
            <div data-page=${section.id} ?hidden=${this.section !== section.id}>
              <p class="placeholder">${section.label}</p>
            </div>
          `,
        )}
      </main>

      <footer class="wrap">
        Progress stays in this browser. Export it from The House to keep a copy.
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
