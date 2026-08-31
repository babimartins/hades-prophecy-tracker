import { dataset } from '@hades/data'
import {
  subjectCapabilities,
  subjectFacts,
  subjectProgress,
  subjectsOfType,
  type FactMap,
} from '@hades/engine'
import type { Subject } from '@hades/schema'
import { colorVar, spaceVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { CODEX_SECTION_LABEL, markersFor, sectionOf } from '../lib/subject-labels.js'

export type SortKey = 'name' | 'hearts' | 'keepsake' | 'boons' | 'favor'

export interface CharacterRow {
  subject: Subject
  section: string
  hearts: { done: number; max: number } | null
  keepsake: { done: number; max: number } | null
  boons: { done: number; total: number } | null
  favor: { done: number; total: number } | null
  markers: string[]
}

export function buildRows(facts: FactMap): CharacterRow[] {
  return subjectsOfType(dataset, 'character').map((subject) => {
    const owned = subjectFacts(dataset, subject.id)
    const progress = subjectProgress(dataset, subject.id, facts)

    const affinity = owned.find((fact) => fact.id.startsWith('nectar:'))
    const keepsake = owned.find((fact) => fact.id.startsWith('keepsake:'))


    return {
      subject,
      section: sectionOf(subject) || CODEX_SECTION_LABEL[subject.type] || '',
      hearts: affinity
        ? { done: numeric(facts[affinity.id]), max: affinity.max ?? 1 }
        : null,
      keepsake: keepsake ? { done: numeric(facts[keepsake.id]), max: keepsake.max ?? 3 } : null,
      boons: progress.byCapability.boons
        ? { done: progress.byCapability.boons.done, total: progress.byCapability.boons.total }
        : null,
      favor: progress.byCapability.quest
        ? { done: progress.byCapability.quest.done, total: progress.byCapability.quest.total }
        : null,
      markers: markersFor(subject.id),
    }
  })
}

function numeric(value: boolean | number | undefined): number {
  if (typeof value === 'number') return value
  return value === true ? 1 : 0
}

export type FilterId =
  | 'all'
  | 'olympian'
  | 'affinity'
  | 'fightable'
  | 'favor'
  | 'companion'
  | 'not-foes'
  | 'foes'

/**
 * A foe is a character whose only capabilities are `codex` and `combat`. The
 * taxonomy research established that "foe" is not a type: it is the shape a
 * character takes when nothing else is filled in. The default view hides them,
 * because 44 of the 73 characters would otherwise bury the 29 with content.
 */
export function isFoe(row: CharacterRow): boolean {
  const capabilities = subjectCapabilities(dataset, row.subject.id)
  return capabilities.every((capability) => capability === 'codex' || capability === 'combat')
}

const FILTERS: readonly { id: FilterId; label: string; match: (row: CharacterRow) => boolean }[] = [
  // All means all 73. It used to hide the 39 foes, so it read "All · 34"
  // beside a heading saying 73 and the two numbers argued with each other.
  { id: 'all', label: 'All', match: () => true },
  { id: 'olympian', label: 'Olympians', match: (row) => row.markers.includes('Olympian') },
  { id: 'affinity', label: 'With affinity', match: (row) => row.hearts !== null },
  { id: 'fightable', label: 'Fightable', match: (row) => row.markers.includes('Fightable') },
  { id: 'favor', label: 'With a favor', match: (row) => row.markers.includes('Favor') },
  {
    id: 'companion',
    // The characters who give one, not the companions themselves. `companion`
    // means two opposite things and the chip has to pick one; a player asking
    // "who still owes me a companion" is asking about the givers.
    label: 'Gives a companion',
    match: (row) => row.markers.includes('Gives a companion'),
  },
  // The pair at the end splits the roster in two: 34 with something to do
  // beyond fighting, 39 without. They sit together so the sum reads at a
  // glance.
  { id: 'not-foes', label: 'Not foes', match: (row) => !isFoe(row) },
  { id: 'foes', label: 'Foes', match: (row) => isFoe(row) },
]

export class CharacterTable extends LitElement {
  static override readonly styles = css`
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: ${spaceVar('--hd-space-2')};
      margin: 0 0 ${spaceVar('--hd-space-4')};
    }

    .chip {
      background: none;
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 20px;
      color: ${colorVar('--hd-color-muted')};
      cursor: pointer;
      font: inherit;
      font-size: 0.75rem;
      padding: ${spaceVar('--hd-space-1')} ${spaceVar('--hd-space-3')};
    }

    .chip[aria-pressed='true'] {
      border-color: ${colorVar('--hd-color-accent')};
      color: ${colorVar('--hd-color-accent')};
    }

    /* The table body is the scroll region: the page height stays frozen. */
    .table {
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 12px;
      flex: 1;
      margin-bottom: ${spaceVar('--hd-space-4')};
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
      padding: ${spaceVar('--hd-space-2')} ${spaceVar('--hd-space-4')};
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
      z-index: 1;
    }

    thead button {
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: 0;
    }

    tbody tr {
      cursor: pointer;
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

    .pips {
      display: inline-flex;
      gap: ${spaceVar('--hd-space-1')};
      vertical-align: middle;
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

    .count {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      margin-left: ${spaceVar('--hd-space-2')};
    }

    .cellnum {
      align-items: center;
      display: flex;
      gap: ${spaceVar('--hd-space-2')};
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

    /* A bar fills in the accent and turns gold when it is full: one warm
       scale, which is what the owner chose the bronze for. Without this a
       finished bar and a nearly finished one are the same colour. */
    .bar i.done {
      background: ${colorVar('--hd-color-done')};
    }

    .tag {
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 20px;
      display: inline-block;
      font-size: 0.68rem;
      margin-right: ${spaceVar('--hd-space-1')};
      padding: ${spaceVar('--hd-space-hair')} ${spaceVar('--hd-space-2')};
      white-space: nowrap;
    }

    .empty {
      color: ${colorVar('--hd-color-muted')};
    }
  `

  static override readonly properties = {
    facts: { attribute: false },
    sort: { type: String },
    ascending: { type: Boolean },
    filter: { type: String },
  }

  facts: FactMap = {}
  sort: SortKey = 'name'
  ascending = true
  filter: FilterId = 'all'

  /**
   * A filter narrows the default population, it does not replace it. Counting
   * "Fightable" across all 73 gave 42 while "All" showed 34, and clicking it
   * surfaced the bare foes the default view deliberately hides.
   */
  #visible(filter: FilterId, rows: CharacterRow[]): CharacterRow[] {
    const entry = FILTERS.find((candidate) => candidate.id === filter)
    if (!entry) return rows
    if (filter === 'foes' || filter === 'all') return rows.filter(entry.match)
    return rows.filter((row) => !isFoe(row) && entry.match(row))
  }

  get rows(): CharacterRow[] {
    const rows = this.#visible(this.filter, buildRows(this.facts))
    const direction = this.ascending ? 1 : -1
    return rows.sort((a, b) => {
      if (this.sort === 'name') return direction * a.subject.name.localeCompare(b.subject.name)
      const key = this.sort
      return (
        direction * (rank(a, key) - rank(b, key)) ||
        a.subject.name.localeCompare(b.subject.name)
      )
    })
  }

  #sortBy(key: SortKey): void {
    if (this.sort === key) this.ascending = !this.ascending
    else {
      this.sort = key
      this.ascending = true
    }
  }

  #open(row: CharacterRow): void {
    this.dispatchEvent(
      new CustomEvent('open-subject', { detail: { id: row.subject.id }, bubbles: true, composed: true }),
    )
  }

  #header(key: SortKey, label: string): TemplateResult {
    const active = this.sort === key
    return html`
      <th aria-sort=${active ? (this.ascending ? 'ascending' : 'descending') : 'none'}>
        <button @click=${() => this.#sortBy(key)}>${label}${active ? (this.ascending ? ' ↑' : ' ↓') : ''}</button>
      </th>
    `
  }

  #pips(value: { done: number; max: number } | null): TemplateResult {
    if (!value) return html`<span class="empty">—</span>`
    return html`
      <span class="pips" role="img" aria-label=${`${value.done} of ${value.max}`}>
        ${Array.from({ length: value.max }, (_, index) => html`<i class=${index < value.done ? 'on' : ''}></i>`)}
      </span>
      <span class="count">${value.done}/${value.max}</span>
    `
  }

  #ratio(value: { done: number; total: number } | null): TemplateResult {
    if (!value) return html`<span class="empty">—</span>`
    const percent = value.total === 0 ? 0 : Math.round((value.done / value.total) * 100)
    return html`
      <span class="cellnum">
        <span class="count">${value.done}/${value.total}</span>
        <span class="bar"
          ><i
            class=${value.done >= value.total ? 'done' : ''}
            style=${`width:${percent}%`}
          ></i
        ></span>
      </span>
    `
  }

  override render(): TemplateResult {
    const all = buildRows(this.facts)
    const rows = this.rows
    return html`
      <div class="filters">
        ${FILTERS.map(
          (entry) => html`
            <button
              class="chip"
              data-filter=${entry.id}
              aria-pressed=${this.filter === entry.id}
              @click=${() => {
                this.filter = entry.id
              }}
            >
              ${entry.label} · ${this.#visible(entry.id, all).length}
            </button>
          `,
        )}
      </div>

      <div class="table">
        <table>
          <thead>
            <tr>
              ${this.#header('name', 'Character')} ${this.#header('hearts', 'Hearts')}
              ${this.#header('keepsake', 'Keepsake')} ${this.#header('boons', 'Boons')}
              ${this.#header('favor', 'Favor')}
              <th>Markers</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (row) => html`
                <tr
                  data-subject=${row.subject.id}
                  @click=${() => this.#open(row)}
                >
                  <td class="name">
                    <button
                      class="open"
                      aria-label=${`Open ${row.subject.name}`}
                      @click=${(event: Event) => {
                        event.stopPropagation()
                        this.#open(row)
                      }}
                    >
                      ${row.subject.name}
                    </button>
                    <small>${row.section}</small>
                  </td>
                  <td>${this.#pips(row.hearts)}</td>
                  <td>${this.#pips(row.keepsake)}</td>
                  <td>${this.#ratio(row.boons)}</td>
                  <td>${this.#ratio(row.favor)}</td>
                  <td>
                    ${row.markers.length
                      ? row.markers.map((marker) => html`<span class="tag">${marker}</span>`)
                      : html`<span class="empty">—</span>`}
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
      ${rows.length === 0 ? html`<p class="empty">No character matches that filter.</p>` : nothing}
    `
  }
}

function rank(row: CharacterRow, key: Exclude<SortKey, 'name'>): number {
  switch (key) {
    case 'hearts':
      return row.hearts ? row.hearts.done : -1
    case 'keepsake':
      return row.keepsake ? row.keepsake.done : -1
    case 'boons':
      return row.boons ? row.boons.done : -1
    case 'favor':
      return row.favor ? row.favor.done : -1
  }
}

customElements.define('character-table', CharacterTable)

declare global {
  interface HTMLElementTagNameMap {
    'character-table': CharacterTable
  }
}
