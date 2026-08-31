import { dataset } from '@hades/data'
import {
  achievementProgress,
  collectFactIds,
  factTargets,
  isComplete,
  type FactMap,
} from '@hades/engine'
import type { Achievement, Fact, RequirementChild } from '@hades/schema'
import { colorVar, spaceVar } from '@hades/ui'
import { DERIVED_FROM, DERIVED_TROPHY } from '../lib/derived.js'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { factState } from './fact-row.js'
import './fact-row.js'
import type { RailItem } from './rail-view.js'
import './rail-view.js'

export type RailSectionId = 'fated' | 'house' | 'collections'

const RAIL_LABEL: Readonly<Record<RailSectionId, string>> = {
  fated: 'Prophecies',
  house: 'House systems',
  collections: 'Collections',
}

interface Group {
  id: string
  label: string
  /**
   * What each fact must reach inside this group, when the group speaks for an
   * entry. A rail item built from a whole namespace has no entry and no
   * targets, so each row falls back to the fact's own max.
   */
  targets?: Readonly<Record<string, number>> | undefined
  /** What this system is, for a reader who may never have met it. */
  about?: string | undefined
  /** How the tracker counts it, when the game is familiar but our rule is not. */
  rule?: string | undefined
  /** The entry's own text, which the game itself prints. */
  prose?: string | undefined
  facts: Fact[]
  achievements: Achievement[]
}


const factById = new Map(dataset.facts.map((fact) => [fact.id, fact]))
const collectionDescription = new Map(
  dataset.collections.map((collection) => [collection.id, collection.description]),
)

function targetsOf(achievements: Achievement[]): Readonly<Record<string, number>> | undefined {
  if (achievements.length !== 1) return undefined
  return factTargets(achievements[0]!.requirement)
}

function factsOf(achievement: Achievement): Fact[] {
  return collectFactIds(achievement.requirement)
    .map((id) => factById.get(id))
    .filter((fact): fact is Fact => fact !== undefined)
}

function factsIn(namespaces: string[]): Fact[] {
  return dataset.facts.filter((fact) => namespaces.includes(fact.id.split(':')[0] ?? ''))
}

/**
 * The three rail sections.
 *
 * The Fated List is one group per prophecy — all 55, including the 392 that
 * hold a single sub-item, which render as one line rather than being folded
 * away or padded out.
 *
 * The House holds the systems, and the Contractor and the Well of Charon are
 * **shops, not subjects**: eleven of the Contractor's twelve facts belong to
 * characters, so a shop is the view where you check a price, not an owner.
 *
 * Collections holds the closed lists that belong to no character and no weapon.
 * The Codex is not among them: it dissolved into the subjects it describes.
 */
function groupsFor(section: RailSectionId): Group[] {
  if (section === 'fated') {
    return dataset.achievements
      .filter((achievement) => achievement.collection === 'prophecy')
      .map((achievement) => ({
        id: achievement.id,
        label: achievement.name,
        prose: achievement.description,
        facts: factsOf(achievement),
        targets: factTargets(achievement.requirement),
        achievements: [achievement],
      }))
  }

  if (section === 'house') {
    return [
      { id: 'mirror', label: 'Mirror of Night', facts: factsIn(['talent']), achievements: [],
        rule: 'Both sides of a pair count separately.' },
      house('pact', 'Pact of Punishment', ['pact'], 'A single point in a Condition ticks it off.'),
      ...contractorRooms(),
      { id: 'well-of-charon', label: 'Well of Charon', facts: factsIn(['wellofcharon']),
        achievements: [], rule: 'Ticked the first time you buy each ware.' },
      house('perk', 'Wretched Broker', ['perk']),
      {
        id: 'statue',
        label: 'Skelly’s Challenge Statues',
        about: collectionDescription.get('statue'),
        facts: STATUE_FACTS.map((id) => factById.get(id)).filter((f): f is Fact => f !== undefined),
        targets: targetsOf(dataset.achievements.filter((a) => a.collection === 'statue')),
        achievements: dataset.achievements.filter((a) => a.collection === 'statue'),
      },
      {
        id: 'achievement',
        label: 'Platform achievements',
        about: collectionDescription.get('achievement'),
        facts: [],
        // God of Blood is the capstone, so it reads last. The wiki lists it
        // first, where its roll-up over the other 49 looks like the section
        // total rather than one more trophy.
        achievements: dataset.achievements
          .filter((a) => a.collection === 'achievement')
          .sort((a, b) => Number(a.id === DERIVED_TROPHY) - Number(b.id === DERIVED_TROPHY)),
      },
    ]
  }

  return [
    { id: 'fish', label: 'Fish', facts: factsIn(['catch']), achievements: [],
      rule: 'Ticked the first time you land each species.' },
    { id: 'artifacts', label: 'Artifacts', facts: factsIn(['artifact']), achievements: [] },
    { id: 'boons', label: 'Boons by type', facts: factsIn(['boon', 'blessing', 'curse']),
      achievements: [],
      rule: 'The same boons each god lists, grouped by type instead of by giver.' },
    { id: 'companions', label: 'Companions', facts: factsIn(['companion']), achievements: [],
      rule: 'Each needs a completed favor and one Ambrosia.' },
  ]
}

/**
 * Skelly's three challenge statues, in the order he uncovers them.
 *
 * Heat 8 backs a prophecy and a trophy, Heat 16 backs a trophy, and Heat 32
 * backs neither. Without a group of its own the third would be in the dataset
 * and reachable from nowhere.
 */
const STATUE_FACTS = [
  'combat:defeat-hades-heat8',
  'combat:defeat-hades-heat16',
  'combat:defeat-hades-heat32',
]

const ROOM_LABEL: Readonly<Record<string, string>> = {
  'work-orders': 'Contractor · Work Orders',
  'great-hall': 'Contractor · Great Hall',
  'west-hall': 'Contractor · West Hall',
  lounge: 'Contractor · Lounge',
  'court-music': 'Contractor · Court Music',
  bedchambers: 'Contractor · Bedchambers',
}

/**
 * The Contractor sells from six separate lists, one per room, and the wiki
 * groups them that way. Flattening them into one 171-line pane would bury the
 * Work Orders, which are the only ones that unlock a character's story.
 */
function contractorRooms(): Group[] {
  const byRoom = new Map<string, Fact[]>()
  for (const achievement of dataset.achievements) {
    if (achievement.collection !== 'contractor') continue
    const room = achievement.section ?? ''
    const owned = byRoom.get(room) ?? []
    for (const fact of factsOf(achievement)) if (!owned.includes(fact)) owned.push(fact)
    byRoom.set(room, owned)
  }
  return [...byRoom.entries()].map(([room, facts], index) => ({
    id: `contractor-${room}`,
    label: ROOM_LABEL[room] ?? room,
    about: index === 0 ? collectionDescription.get('contractor') : undefined,
    rule:
      room === 'work-orders'
        ? 'These are the purchases that unlock a character’s story steps.'
        : undefined,
    facts,
    achievements: [],
  }))
}

/**
 * One sentence per `count` or `any` node in a requirement, wherever it sits.
 *
 * Without these the pane lists nine gods for a six-of-nine goal and never says
 * so. Nested `count` nodes inside the derived trophies are not reached, because
 * those panes list no facts at all.
 */
function countingLines(node: RequirementChild | undefined): string[] {
  if (node === undefined || typeof node === 'string') return []
  if (node.kind === 'atLeast') return []
  const here =
    node.kind === 'count'
      ? [`Any ${node.n} of these ${node.of.length} satisfy it.`]
      : node.kind === 'any'
        ? ['Any one of these satisfies it.']
        : []
  return [...here, ...node.of.flatMap((child) => countingLines(child))]
}

function house(id: string, label: string, namespaces: string[], rule?: string): Group {
  return {
    id,
    label,
    about: collectionDescription.get(id),
    rule,
    facts: factsIn(namespaces),
    achievements: [],
  }
}

export class RailSection extends LitElement {
  static override readonly styles = css`
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    h2 {
      font-family: var(--hd-font-display, serif);
      font-size: 1.25rem;
      margin: 0;
    }

    /* The generic li rule below is a centred flex row for a single fact. A
       trophy is a block with a heading and its own list, so it opts out. */
    .trophy {
      align-items: stretch;
      border-bottom: 0;
      border-top: 1px solid ${colorVar('--hd-color-surface')};
      display: block;
      padding: ${spaceVar('--hd-space-3')} 0;
    }

    .trophy:first-child {
      border-top: none;
    }

    .thead {
      align-items: baseline;
      display: flex;
      gap: ${spaceVar('--hd-space-3')};
      justify-content: space-between;
    }

    .thead h3 {
      font-size: 0.95rem;
      margin: 0;
    }

    .tnum {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.78rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .tnum.done {
      color: ${colorVar('--hd-color-done')};
    }

    .tdesc {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.78rem;
      margin: ${spaceVar('--hd-space-1')} 0 0;
    }

    .tfacts {
      list-style: none;
      margin: ${spaceVar('--hd-space-2')} 0 0;
      padding: 0;
    }

    .panehead {
      align-items: flex-start;
      display: flex;
      flex-wrap: wrap;
      gap: ${spaceVar('--hd-space-4')};
      margin-bottom: ${spaceVar('--hd-space-4')};
    }

    .prose {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.82rem;
      margin: ${spaceVar('--hd-space-1')} 0 0;
      max-width: 62ch;
    }

    .counting {
      font-size: 0.82rem;
      margin: ${spaceVar('--hd-space-2')} 0 0;
    }

    .pnum {
      margin-left: auto;
      text-align: right;
    }

    .pnum b {
      color: ${colorVar('--hd-color-accent')};
      font-family: var(--hd-font-display, serif);
      font-size: 1.2rem;
    }

    .pnum span {
      color: ${colorVar('--hd-color-muted')};
      display: block;
      font-size: 0.62rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .about {
      background: ${colorVar('--hd-color-surface')};
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 10px;
      margin: 0 0 ${spaceVar('--hd-space-4')};
      padding: ${spaceVar('--hd-space-3')} ${spaceVar('--hd-space-4')};
    }

    .about h3 {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      margin: 0 0 ${spaceVar('--hd-space-2')};
      text-transform: uppercase;
    }

    .about p {
      margin: 0;
    }

    .rule {
      align-items: baseline;
      color: ${colorVar('--hd-color-muted')};
      display: flex;
      font-size: 0.8rem;
      gap: ${spaceVar('--hd-space-2')};
      margin: 0 0 ${spaceVar('--hd-space-4')};
    }

    .rule::before {
      content: 'How this counts';
      flex: none;
      font-size: 0.6rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      align-items: center;
      border-bottom: 1px solid ${colorVar('--hd-color-surface')};
      display: flex;
      gap: ${spaceVar('--hd-space-3')};
      padding: ${spaceVar('--hd-space-2')} 0;
    }

    li:last-child {
      border-bottom: 0;
    }

    .desc {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
    }

    .single {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.8rem;
      margin: 0 0 ${spaceVar('--hd-space-3')};
    }
  `

  static override readonly properties = {
    section: { type: String },
    facts: { attribute: false },
    selected: { type: String },
  }

  section: RailSectionId = 'fated'
  facts: FactMap = {}
  selected = ''

  get groups(): Group[] {
    return groupsFor(this.section)
  }

  #isDone(fact: Fact, targets?: Readonly<Record<string, number>> | undefined): boolean {
    return factState(fact, this.facts, targets?.[fact.id]) === 'done'
  }

  #items(): RailItem[] {
    return this.groups.map((group) => {
      if (group.achievements.length > 1) {
        // The only group counted in achievements rather than facts, so the
        // sub-label names the unit. `subjectProgress` counts facts and
        // `overallProgress` counts achievements, and the two never add up.
        const earned = group.achievements.filter((achievement) =>
          isComplete(achievementProgress(achievement, this.facts)),
        ).length
        return {
          id: group.id,
          label: group.label,
          done: earned,
          total: group.achievements.length,
          sub: 'trophies earned',
        }
      }
      if (group.achievements.length === 1) {
        const progress = achievementProgress(group.achievements[0]!, this.facts)
        return { id: group.id, label: group.label, done: progress.done, total: progress.total }
      }
      const item: RailItem = {
        id: group.id,
        label: group.label,
        done: group.facts.filter((fact) => this.#isDone(fact, group.targets)).length,
        total: group.facts.length,
      }
      if (group.facts.length === 0) item.sub = 'none yet'
      return item
    })
  }

  override render(): TemplateResult {
    const groups = this.groups
    const current = groups.find((group) => group.id === this.selected) ?? groups[0]
    return html`
      <rail-view
        .items=${this.#items()}
        .selected=${current?.id ?? ''}
        .label=${RAIL_LABEL[this.section]}
        @rail-select=${(event: CustomEvent<{ id: string }>) => {
          this.selected = event.detail.id
        }}
      >
        ${current ? this.#pane(current) : nothing}
      </rail-view>
    `
  }

  #pane(group: Group): TemplateResult {
    const single = group.facts.length === 1
    const achievement = group.achievements[0]
    const rollup = achievement ? achievementProgress(achievement, this.facts) : null
    // A `count` node means any N of the children satisfy it. Flattening the
    // tree loses that, so the rail says 6 while the pane lists 9 things to do.
    // Search the whole tree, not only the root: The Queen's Plan wraps its
    // six-of-nine in an `all` beside the dialogue it also needs, and reading
    // only the root dropped the line that explains the pane.
    const counting = countingLines(achievement?.requirement).join(' ')
    return html`
      <div class="panehead">
        <div>
          <h2>${group.label}</h2>
          ${group.prose ? html`<p class="prose">${group.prose}</p>` : nothing}
          ${counting ? html`<p class="counting">${counting}</p>` : nothing}
        </div>
        ${rollup
          ? html`<div class="pnum"><b>${rollup.done}/${rollup.total}</b><span>done</span></div>`
          : nothing}
      </div>
      ${group.about
        ? html`<div class="about"><h3>What this is</h3><p>${group.about}</p></div>`
        : nothing}
      ${group.rule ? html`<p class="rule"><span>${group.rule}</span></p>` : nothing}
      ${single
        ? html`<p class="single">One action. It is not folded away and it is not padded out.</p>`
        : nothing}
      ${group.achievements.length > 1
        ? html`
            <ul class="trophies">
              ${group.achievements.map((trophy) => this.#trophy(trophy, group))}
            </ul>
          `
        : nothing}
      ${group.achievements.length > 1
        ? nothing
        : group.facts.length === 0
        ? html`<p class="single">Nothing is tracked here yet.</p>`
        : html`
            <ul>
              ${group.facts.map(
                (fact) => html`
                  <li
                    data-fact=${fact.id}
                    class=${factState(fact, this.facts, group.targets?.[fact.id])}
                  >
                    <fact-row
                      .fact=${fact}
                      .facts=${this.facts}
                      .target=${group.targets?.[fact.id]}
                    ></fact-row>
                  </li>
                `,
              )}
            </ul>
          `}
    `
  }

  /**
   * One trophy, with every action it needs listed under it.
   *
   * God of Blood is "Earn all other Trophies", so its requirement is literally
   * the other 49 requirements: 207 distinct facts, every one of them already
   * shown under the trophy it belongs to. Repeating them would make the pane
   * twice as long and no more informative, so it shows its roll-up and says
   * where its actions live. It is named by id because the game has exactly one
   * trophy of that shape, the way `subject-labels.ts` names the nine Olympians.
   */
  #trophy(trophy: Achievement, group: Group): TemplateResult {
    const derivedFrom = DERIVED_FROM[trophy.id]
    const derived = trophy.id === DERIVED_TROPHY
    // Its own evaluation sums the units of all 49 requirements. That comes to
    // 10283. The number is true and useless. It counts trophies, not units.
    const others = group.achievements.filter((other) => other.id !== trophy.id)
    const progress = derived
      ? {
          done: others.filter((other) => isComplete(achievementProgress(other, this.facts)))
            .length,
          total: others.length,
        }
      : achievementProgress(trophy, this.facts)
    const facts = derivedFrom === undefined ? factsOf(trophy) : []
    const targets = factTargets(trophy.requirement)
    return html`
      <li class="trophy" data-achievement=${trophy.id}>
        <div class="thead">
          <h3>${trophy.name}</h3>
          <span class="tnum ${progress.done >= progress.total ? 'done' : ''}"
            >${progress.done}/${progress.total}</span
          >
        </div>
        ${trophy.description ? html`<p class="tdesc">${trophy.description}</p>` : nothing}
        ${derivedFrom !== undefined
          ? html`<p class="tdesc">Its actions are ${derivedFrom}.</p>`
          : html`
              <ul class="tfacts">
                ${facts.map(
                  (fact) => html`
                    <li data-fact=${fact.id} class=${factState(fact, this.facts, targets[fact.id])}>
                      <fact-row
                        .fact=${fact}
                        .facts=${this.facts}
                        .target=${targets[fact.id]}
                      ></fact-row>
                    </li>
                  `,
                )}
              </ul>
            `}
      </li>
    `
  }
}

customElements.define('rail-section', RailSection)

declare global {
  interface HTMLElementTagNameMap {
    'rail-section': RailSection
  }
}
