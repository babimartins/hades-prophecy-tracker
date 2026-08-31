import { dataset } from '@hades/data'
import { subjectFacts, subjectsOfType, type FactMap } from '@hades/engine'
import type { Fact, Subject } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, type TemplateResult } from 'lit'
import { displayId } from '../lib/subject-labels.js'

export interface WeaponRow {
  subject: Subject
  display: string
  unlocked: Fact | undefined
  escaped: Fact | undefined
  aspects: { fact: Fact; level: number; max: number }[]
  daedalus: { done: number; total: number }
}

function numeric(value: boolean | number | undefined): number {
  if (typeof value === 'number') return value
  return value === true ? 1 : 0
}

export function buildWeaponRows(facts: FactMap): WeaponRow[] {
  return subjectsOfType(dataset, 'weapon').map((subject) => {
    const owned = subjectFacts(dataset, subject.id)
    const enchantments = owned.filter((fact) => fact.id.startsWith('daedalus:'))
    return {
      subject,
      display: subject.name,
      unlocked: owned.find((fact) => fact.id.startsWith('weapon:')),
      escaped: owned.find((fact) => fact.id.startsWith('escape:')),
      aspects: owned
        .filter((fact) => fact.id.startsWith('aspect:'))
        .map((fact) => ({
          fact,
          level: numeric(facts[fact.id]),
          // read the fact's own max, never a hard-coded 5
          max: fact.max ?? 1,
        })),
      daedalus: {
        done: enchantments.filter((fact) => facts[fact.id] === true).length,
        total: enchantments.length,
      },
    }
  })
}

/**
 * Terms a player does not meet under these names in the game, explained where
 * the number is rather than in a block above the table.
 */
const HEADER_TOOLTIP: Readonly<Record<string, string>> = {
  aspects:
    'An alternate form of the weapon, bought with Titan Blood at the weapon rack. Every weapon has four, and each levels from 1 to 5.',
  daedalus:
    'An upgrade offered by a Daedalus Hammer during a run. It lasts only that run; what is permanent is having taken it once.',
}

export class WeaponTable extends LitElement {
  static override readonly styles = css`
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .table {
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 12px;
      flex: 1;
      margin-bottom: 14px;
      min-height: 0;
      overflow: auto;
    }

    table {
      border-collapse: collapse;
      min-width: 720px;
      width: 100%;
    }

    th,
    td {
      border-bottom: 1px solid ${colorVar('--hd-color-muted')};
      padding: 9px 14px;
      text-align: left;
      vertical-align: middle;
    }

    thead th {
      background: ${colorVar('--hd-color-surface')};
      font-size: 0.68rem;
      letter-spacing: 0.07em;
      position: sticky;
      text-transform: uppercase;
      top: 0;
      white-space: nowrap;
      z-index: 2;
    }

    td.name .open {
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      padding: 0;
      text-align: left;
    }

    td.name .open:hover {
      text-decoration: underline;
    }

    td.name {
      font-weight: 600;
      white-space: nowrap;
    }

    td.name small {
      color: ${colorVar('--hd-color-muted')};
      display: block;
      font-size: 0.68rem;
      font-weight: 400;
    }

    .check {
      background: none;
      border: 1.5px solid ${colorVar('--hd-color-muted')};
      border-radius: 5px;
      cursor: pointer;
      display: block;
      height: 18px;
      padding: 0;
      width: 18px;
    }

    .check[aria-checked='true'] {
      background: ${colorVar('--hd-color-done')};
      border-color: ${colorVar('--hd-color-done')};
    }

    .pipset {
      display: inline-flex;
      gap: 14px;
    }

    .pips {
      display: inline-flex;
      gap: 3px;
    }

    .pips i {
      background: ${colorVar('--hd-color-muted')};
      border-radius: 50%;
      display: block;
      height: 9px;
      width: 9px;
    }

    .pips i.on {
      background: ${colorVar('--hd-color-accent')};
    }

    .cellnum {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .bar {
      background: ${colorVar('--hd-color-surface')};
      border-radius: 3px;
      height: 5px;
      overflow: hidden;
      width: 70px;
    }

    .bar i {
      background: ${colorVar('--hd-color-accent')};
      border-radius: 3px;
      display: block;
      height: 100%;
    }

    .count {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
    }

    /*
     * A header tooltip must open downwards. The header is sticky inside the
     * scroll container, which clips anything above it, so an upward box is
     * invisible.
     */
    .term {
      border-bottom: 1px dotted ${colorVar('--hd-color-muted')};
      cursor: help;
      position: relative;
      text-transform: none;
    }

    .term .box {
      background: ${colorVar('--hd-color-surface')};
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 8px;
      color: ${colorVar('--hd-color-text')};
      font-size: 0.75rem;
      left: 0;
      letter-spacing: normal;
      line-height: 1.5;
      opacity: 0;
      padding: 9px 12px;
      position: absolute;
      text-transform: none;
      top: calc(100% + 8px);
      visibility: hidden;
      width: 280px;
      z-index: 3;
    }

    .term:hover .box,
    .term:focus-visible .box {
      opacity: 1;
      visibility: visible;
    }
  `

  static override readonly properties = {
    facts: { attribute: false },
  }

  facts: FactMap = {}

  #open(row: WeaponRow): void {
    this.dispatchEvent(
      new CustomEvent('open-subject', {
        detail: { id: row.subject.id },
        bubbles: true,
        composed: true,
      }),
    )
  }

  #toggle(event: Event, fact: Fact | undefined): void {
    // A tick belongs to the row, not to the navigation. Without this the click
    // opens the weapon page instead of recording the escape.
    event.stopPropagation()
    if (!fact) return
    this.dispatchEvent(
      new CustomEvent('set-fact', {
        detail: { id: fact.id, value: this.facts[fact.id] !== true },
        bubbles: true,
        composed: true,
      }),
    )
  }

  #tick(fact: Fact | undefined, label: string): TemplateResult {
    const checked = fact ? this.facts[fact.id] === true : false
    return html`
      <button
        class="check"
        role="checkbox"
        aria-checked=${checked}
        aria-label=${label}
        @click=${(event: Event) => this.#toggle(event, fact)}
      ></button>
    `
  }

  #term(key: string, label: string): TemplateResult {
    return html`
      <th>
        <span class="term" tabindex="0"
          >${label}<span class="box" role="tooltip">${HEADER_TOOLTIP[key]}</span></span
        >
      </th>
    `
  }

  override render(): TemplateResult {
    const rows = buildWeaponRows(this.facts)
    return html`
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>Weapon</th>
              <th>Unlocked</th>
              <th>Escaped</th>
              ${this.#term('aspects', 'Aspects')} ${this.#term('daedalus', 'Daedalus')}
              <th>Aspect levels</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => {
              const levels = row.aspects.reduce((total, aspect) => total + aspect.level, 0)
              const ceiling = row.aspects.reduce((total, aspect) => total + aspect.max, 0)
              return html`
                <tr
                  data-weapon=${row.subject.id}
                  tabindex="0"
                  @click=${() => this.#open(row)}
                  @keydown=${(event: KeyboardEvent) => {
                    // Only when the row itself has focus: Space is the native
                    // activation key for the tick buttons inside it, and a row
                    // handler would swallow it and navigate instead.
                    if (event.target !== event.currentTarget) return
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    this.#open(row)
                  }}
                >
                  <td class="name">
                    <button
                      class="open"
                      aria-label=${`Open ${row.display}`}
                      @click=${(event: Event) => {
                        event.stopPropagation()
                        this.#open(row)
                      }}
                    >
                      ${displayId(row.subject)}
                    </button>
                    <small>${row.display}</small>
                  </td>
                  <td>${this.#tick(row.unlocked, `${row.display} unlocked`)}</td>
                  <td>${this.#tick(row.escaped, `Escaped with ${row.display}`)}</td>
                  <td>
                    <span class="pipset">
                      ${row.aspects.map(
                        (aspect) => html`
                          <span
                            class="pips"
                            role="img"
                            aria-label=${`${aspect.fact.label}: ${aspect.level} of ${aspect.max}`}
                          >
                            ${Array.from(
                              { length: aspect.max },
                              (_, index) => html`<i class=${index < aspect.level ? 'on' : ''}></i>`,
                            )}
                          </span>
                        `,
                      )}
                    </span>
                  </td>
                  <td>
                    <span class="cellnum">
                      <span class="count">${row.daedalus.done}/${row.daedalus.total}</span>
                      <span class="bar"
                        ><i
                          style=${`width:${
                            row.daedalus.total === 0
                              ? 0
                              : Math.round((row.daedalus.done / row.daedalus.total) * 100)
                          }%`}
                        ></i
                      ></span>
                    </span>
                  </td>
                  <td class="count">${levels}/${ceiling}</td>
                </tr>
              `
            })}
          </tbody>
        </table>
      </div>
    `
  }
}

customElements.define('weapon-table', WeaponTable)

declare global {
  interface HTMLElementTagNameMap {
    'weapon-table': WeaponTable
  }
}
