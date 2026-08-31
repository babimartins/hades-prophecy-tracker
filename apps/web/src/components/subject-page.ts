import { dataset } from '@hades/data'
import { subjectCapabilities, subjectFacts, subjectProgress, type FactMap } from '@hades/engine'
import type { Fact, Subject } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'

/**
 * The order blocks appear in, and the heading each capability takes.
 *
 * A block renders only when the subject owns facts in that capability, so a
 * page never shows an empty one. This is the whole point of deriving
 * capabilities rather than storing them: the page assembles itself from what
 * the subject actually offers.
 *
 * Milestones come first on a weapon, because that is what the player ticks
 * most often. Burying them is why the owner could not find where to record an
 * escape.
 */
const BLOCKS: readonly { capability: string; heading: string; why?: string }[] = [
  { capability: 'acquire', heading: 'Milestones', why: 'obtain, escape, Cerberus' },
  { capability: 'escape', heading: 'Milestones', why: 'obtain, escape, Cerberus' },
  { capability: 'combat', heading: 'Combat' },
  { capability: 'affinity', heading: 'Affinity', why: 'Nectar and Ambrosia' },
  { capability: 'boons', heading: 'Boons', why: 'only for those who grant them' },
  { capability: 'aspect', heading: 'Aspects', why: 'Titan Blood' },
  { capability: 'enchant', heading: 'Daedalus enchantments', why: 'taking it once is enough' },
  { capability: 'keepsake', heading: 'Keepsake' },
  { capability: 'quest', heading: 'Favor', why: 'quest content, not a capability' },
  { capability: 'companion', heading: 'Companion' },
  { capability: 'introduction', heading: 'Introduction' },
  { capability: 'dialogue', heading: 'Conversations' },
  { capability: 'invite', heading: 'Invite' },
  { capability: 'collect', heading: 'Collected' },
  { capability: 'catch', heading: 'Caught' },
  { capability: 'reach', heading: 'Reached' },
  { capability: 'pet', heading: 'Petting' },
  { capability: 'shop', heading: 'Shop' },
  { capability: 'codex', heading: 'Codex', why: 'dissolved into this page' },
]

const NAMESPACE_CAPABILITY: Readonly<Record<string, string>> = {
  codex: 'codex',
  meet: 'introduction',
  nectar: 'affinity',
  boon: 'boons',
  blessing: 'boons',
  curse: 'boons',
  keepsake: 'keepsake',
  companion: 'companion',
  combat: 'combat',
  encounter: 'combat',
  miniboss: 'combat',
  talk: 'dialogue',
  invite: 'invite',
  favor: 'quest',
  workorder: 'quest',
  lounge: 'quest',
  lyre: 'quest',
  aspect: 'aspect',
  daedalus: 'enchant',
  weapon: 'acquire',
  escape: 'escape',
  artifact: 'collect',
  catch: 'catch',
  reach: 'reach',
  pet: 'pet',
  spend: 'shop',
}

function namespaceCapability(namespace: string): string | undefined {
  return NAMESPACE_CAPABILITY[namespace]
}

export class SubjectPage extends LitElement {
  static override readonly styles = css`
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .back {
      background: none;
      border: 0;
      color: ${colorVar('--hd-color-muted')};
      cursor: pointer;
      font: inherit;
      font-size: 0.8rem;
      margin-bottom: 12px;
      padding: 0;
      text-align: left;
    }

    .head {
      align-items: flex-start;
      border-bottom: 1px solid ${colorVar('--hd-color-muted')};
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 14px;
    }

    h2 {
      font-family: var(--hd-font-display, serif);
      font-size: 1.4rem;
      margin: 0;
    }

    .sub {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.78rem;
      margin-top: 2px;
    }

    .rollup {
      margin-left: auto;
      text-align: right;
    }

    .rollup b {
      color: ${colorVar('--hd-color-accent')};
      font-family: var(--hd-font-display, serif);
      font-size: 1.3rem;
    }

    .rollup span {
      color: ${colorVar('--hd-color-muted')};
      display: block;
      font-size: 0.65rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    /* The block list is the scroll region, so the page height stays frozen. */
    .blocks {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 16px 4px 16px 0;
    }

    section {
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 12px;
      margin-bottom: 14px;
    }

    .block-head {
      align-items: center;
      background: ${colorVar('--hd-color-surface')};
      border-bottom: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 11px 11px 0 0;
      display: flex;
      gap: 10px;
      padding: 11px 14px;
    }

    h3 {
      font-family: var(--hd-font-display, serif);
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      margin: 0;
      text-transform: uppercase;
    }

    .why {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.68rem;
    }

    .count {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      margin-left: auto;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 4px 14px 10px;
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

    .label {
      flex: 1;
    }

    /* A description explains the term; the dotted rule is the affordance. */
    .described {
      border-bottom: 1px dotted ${colorVar('--hd-color-muted')};
      cursor: help;
    }

    .desc {
      color: ${colorVar('--hd-color-muted')};
      display: block;
      font-size: 0.72rem;
      margin-top: 2px;
    }

    .reveal {
      background: none;
      border: 1px solid ${colorVar('--hd-color-muted')};
      border-radius: 6px;
      color: ${colorVar('--hd-color-muted')};
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      padding: 2px 8px;
    }
  `

  static override readonly properties = {
    subjectId: { type: String },
    facts: { attribute: false },
    revealed: { attribute: false },
  }

  subjectId = ''
  facts: FactMap = {}
  revealed: Set<string> = new Set()

  get subject(): Subject | undefined {
    return dataset.subjects.find((candidate) => candidate.id === this.subjectId)
  }

  #back(): void {
    this.dispatchEvent(new CustomEvent('close-subject', { bubbles: true, composed: true }))
  }

  #reveal(factId: string): void {
    this.revealed = new Set([...this.revealed, factId])
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

  #isDone(fact: Fact): boolean {
    const value = this.facts[fact.id]
    if (fact.kind === 'number' && fact.max !== undefined) {
      return typeof value === 'number' && value >= fact.max
    }
    return value === true || (typeof value === 'number' && value > 0)
  }

  #row(fact: Fact): TemplateResult {
    const hidden = fact.spoiler === true && !this.revealed.has(fact.id)
    return html`
      <li data-fact=${fact.id} class=${this.#isDone(fact) ? 'done' : ''}>
        <hd-checklist-item
          .checked=${this.#isDone(fact)}
          .label=${hidden ? 'Hidden: this step names a story outcome' : fact.label}
          @toggle=${() => this.#toggle(fact)}
        ></hd-checklist-item>
        ${hidden
          ? html`<button class="reveal" @click=${() => this.#reveal(fact.id)}>Reveal</button>`
          : fact.description
            ? html`<span class="desc" title=${fact.description}>${fact.description}</span>`
            : nothing}
      </li>
    `
  }

  override render(): TemplateResult {
    const subject = this.subject
    if (!subject) return html`<p>Unknown subject.</p>`

    const owned = subjectFacts(dataset, subject.id)
    const capabilities = subjectCapabilities(dataset, subject.id)
    const progress = subjectProgress(dataset, subject.id, this.facts)

    const seen = new Set<string>()
    const blocks = BLOCKS.filter((block) => {
      if (!capabilities.includes(block.capability)) return false
      if (seen.has(block.heading)) return false
      seen.add(block.heading)
      return true
    })

    return html`
      <button class="back" @click=${this.#back}>← Back</button>
      <div class="head">
        <div>
          <h2>${subject.name}</h2>
          <div class="sub">${subject.type}</div>
        </div>
        <div class="rollup">
          <b>${progress.done}/${progress.total}</b>
          <span>actions done</span>
        </div>
      </div>

      <div class="blocks">
        ${blocks.map((block) => {
          const headings = BLOCKS.filter((other) => other.heading === block.heading).map(
            (other) => other.capability,
          )
          const rows = owned.filter((fact) => {
            const capability = namespaceCapability(fact.id.split(':')[0] ?? '')
            return capability !== undefined && headings.includes(capability)
          })
          if (rows.length === 0) return nothing
          const done = rows.filter((fact) => this.#isDone(fact)).length
          return html`
            <section data-block=${block.heading}>
              <div class="block-head">
                <h3>${block.heading}</h3>
                ${block.why ? html`<span class="why">${block.why}</span>` : nothing}
                <span class="count">${done}/${rows.length}</span>
              </div>
              <ul>
                ${rows.map((fact) => this.#row(fact))}
              </ul>
            </section>
          `
        })}
      </div>
    `
  }
}

customElements.define('subject-page', SubjectPage)

declare global {
  interface HTMLElementTagNameMap {
    'subject-page': SubjectPage
  }
}
