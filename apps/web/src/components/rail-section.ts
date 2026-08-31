import { dataset } from '@hades/data'
import { achievementProgress, collectFactIds, type FactMap } from '@hades/engine'
import type { Achievement, Fact } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import type { RailItem } from './rail-view.js'
import './rail-view.js'

export type RailSectionId = 'fated' | 'house' | 'collections'

interface Group {
  id: string
  label: string
  /** What this system is, for a reader who may never have met it. */
  about?: string | undefined
  /** How the tracker counts it, when the game is familiar but our rule is not. */
  rule?: string | undefined
  facts: Fact[]
  achievements: Achievement[]
}

const factById = new Map(dataset.facts.map((fact) => [fact.id, fact]))
const collectionDescription = new Map(
  dataset.collections.map((collection) => [collection.id, collection.description]),
)

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
        facts: factsOf(achievement),
        achievements: [achievement],
      }))
  }

  if (section === 'house') {
    return [
      house('mirror', 'Mirror of Night', ['talent'], 'Both sides of a pair count separately.'),
      house('pact', 'Pact of Punishment', ['pact'], 'A single point in a Condition ticks it off.'),
      house('contractor', 'House Contractor', ['workorder', 'lounge', 'contractor'],
        'A shop, not a subject: eleven of its twelve facts belong to a character.'),
      house('well-of-charon', 'Well of Charon', ['wellofcharon'],
        'Ticked the first time you buy each ware.'),
      house('perk', 'Wretched Broker', ['perk']),
      {
        id: 'achievement',
        label: 'Platform achievements',
        about: collectionDescription.get('achievement'),
        facts: [],
        achievements: [],
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
      margin: 0 0 12px;
    }

    .about {
      background: ${colorVar('--hd-color-surface')};
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 10px;
      margin: 0 0 14px;
      padding: 12px 14px;
    }

    .about h3 {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      margin: 0 0 6px;
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
      gap: 8px;
      margin: 0 0 14px;
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
      gap: 10px;
      padding: 7px 0;
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
      margin: 0 0 10px;
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

  #isDone(fact: Fact): boolean {
    const value = this.facts[fact.id]
    if (fact.kind === 'number' && fact.max !== undefined) {
      return typeof value === 'number' && value >= fact.max
    }
    return value === true || (typeof value === 'number' && value > 0)
  }

  #toggle(fact: Fact): void {
    const current = this.facts[fact.id]
    const next =
      fact.kind === 'number' && fact.max !== undefined
        ? typeof current === 'number' && current >= fact.max
          ? 0
          : fact.max
        : current !== true
    this.dispatchEvent(
      new CustomEvent('set-fact', {
        detail: { id: fact.id, value: next },
        bubbles: true,
        composed: true,
      }),
    )
  }

  #items(): RailItem[] {
    return this.groups.map((group) => {
      if (group.achievements.length === 1) {
        const progress = achievementProgress(group.achievements[0]!, this.facts)
        return { id: group.id, label: group.label, done: progress.done, total: progress.total }
      }
      const item: RailItem = {
        id: group.id,
        label: group.label,
        done: group.facts.filter((fact) => this.#isDone(fact)).length,
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
        .label=${this.section}
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
    return html`
      <h2>${group.label}</h2>
      ${group.about
        ? html`<div class="about"><h3>What this is</h3><p>${group.about}</p></div>`
        : nothing}
      ${group.rule ? html`<p class="rule"><span>${group.rule}</span></p>` : nothing}
      ${single
        ? html`<p class="single">One action. It is not folded away and it is not padded out.</p>`
        : nothing}
      ${group.facts.length === 0
        ? html`<p class="single">Nothing is tracked here yet.</p>`
        : html`
            <ul>
              ${group.facts.map(
                (fact) => html`
                  <li data-fact=${fact.id}>
                    <hd-checklist-item
                      .checked=${this.#isDone(fact)}
                      .label=${fact.spoiler === true
                        ? 'Hidden: this step names a story outcome'
                        : fact.label}
                      @toggle=${() => this.#toggle(fact)}
                    ></hd-checklist-item>
                    ${fact.description
                      ? html`<span class="desc">${fact.description}</span>`
                      : nothing}
                  </li>
                `,
              )}
            </ul>
          `}
    `
  }
}

customElements.define('rail-section', RailSection)

declare global {
  interface HTMLElementTagNameMap {
    'rail-section': RailSection
  }
}
