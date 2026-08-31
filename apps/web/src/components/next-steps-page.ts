import { dataset } from '@hades/data'
import { factTargets, nextSteps, unlockedBy, type FactMap } from '@hades/engine'
import type { Fact } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, nothing, type TemplateResult } from 'lit'
import { DERIVED_FROM } from '../lib/derived.js'
import { PLACES, PLACE_LABEL, placeOf, type Place } from '../lib/where.js'
import { factState } from './fact-row.js'
import './fact-row.js'
import type { RailItem } from './rail-view.js'
import './rail-view.js'

/**
 * How many actions a place shows.
 *
 * The pane is one column now rather than a third of the width, so it holds
 * more than the three blocks did. It is still a cap: "During a run" has 610
 * unfinished actions and the point of this view is the front of the queue.
 */
const PER_PLACE = 25

const factById = new Map(dataset.facts.map((fact) => [fact.id, fact]))

/** Every fact that belongs to each place, for the rail's own progress. */
const FACTS_BY_PLACE: Readonly<Record<Place, Fact[]>> = (() => {
  const out: Record<Place, Fact[]> = { contractor: [], house: [], run: [] }
  for (const fact of dataset.facts) {
    const place = placeOf(fact.id)
    if (place !== undefined) out[place].push(fact)
  }
  return out
})()

/** The roll-up entries, which are skipped when counting and when naming. */
const IGNORE = Object.keys(DERIVED_FROM)

interface Step {
  fact: Fact
  blocks: number
  unlocks: string[]
  target: number | undefined
}

/**
 * What to do next, grouped by where you do it.
 *
 * A ranked list of actions is not a plan until it says where each one happens,
 * which is why this groups rather than sorts. The owner opens the app before a
 * run, so "what can I do on this run" and "what do I buy first" are separate
 * questions and get separate blocks.
 *
 * **This ranks by reach, not by order.** The dataset holds no prerequisites, so
 * an action gated behind story progress appears as readily as one available
 * now. The heading says so rather than implying a sequence.
 */
export class NextStepsPage extends LitElement {
  static override readonly styles = css`
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .lede {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.8rem;
      margin: 0 0 14px;
      max-width: 62ch;
    }

    rail-view {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .panehead {
      margin-bottom: 12px;
    }

    h2 {
      font-family: var(--hd-font-display, serif);
      font-size: 1.25rem;
      margin: 0;
    }

    .count {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
      margin: 2px 0 10px;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      border-bottom: 1px solid ${colorVar('--hd-color-surface')};
      padding: 8px 0;
    }

    li:last-child {
      border-bottom: 0;
    }

    .blocks-count {
      color: ${colorVar('--hd-color-accent')};
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
    }

    .unlocks {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.72rem;
      margin: 2px 0 0;
    }

    .empty {
      color: ${colorVar('--hd-color-muted')};
      font-size: 0.8rem;
    }
  `

  static override readonly properties = { facts: { attribute: false }, selected: { type: String } }

  facts: FactMap = {}
  /** Which place the pane shows. Empty means the first. */
  selected = ''

  /** Every unmet action that has a place, grouped, most blocking first. */
  get grouped(): Readonly<Record<Place, Step[]>> {
    const out: Record<Place, Step[]> = { contractor: [], house: [], run: [] }
    for (const step of nextSteps(dataset, this.facts, IGNORE)) {
      const place = placeOf(step.fact)
      const fact = factById.get(step.fact)
      if (place === undefined || fact === undefined) continue
      if (out[place].length >= PER_PLACE) continue
      out[place].push({
        fact,
        blocks: step.blocks,
        unlocks: unlockedBy(step.fact, dataset, this.facts, IGNORE).slice(0, 3),
        target: this.#targetFor(step.fact),
      })
    }
    return out
  }

  /**
   * The most demanding target any incomplete entry sets for this action.
   *
   * A keepsake wanted at rank 1 by one entry and rank 3 by another is not done
   * here until the harder one is met, because this view is about what is still
   * blocking something.
   */
  #targetFor(factId: string): number | undefined {
    let target: number | undefined
    for (const achievement of dataset.achievements) {
      if (IGNORE.includes(achievement.id)) continue
      const value = factTargets(achievement.requirement)[factId]
      if (value !== undefined) target = Math.max(target ?? 0, value)
    }
    return target
  }

  /** How much of each place is finished, for the rail's own bars. */
  #items(): RailItem[] {
    return PLACES.map((place) => {
      const facts = FACTS_BY_PLACE[place]
      const done = facts.filter(
        (fact) => factState(fact, this.facts, this.#targetFor(fact.id)) === 'done',
      ).length
      return { id: place, label: PLACE_LABEL[place], done, total: facts.length }
    })
  }

  override render(): TemplateResult {
    const grouped = this.grouped
    const current = (PLACES.find((place) => place === this.selected) ?? PLACES[0]) as Place
    const steps = grouped[current]
    return html`
      <p class="lede">
        Ranked by how many unfinished entries each action would advance. It is not an
        order: nothing here knows what the story has unlocked for you yet.
      </p>
      <rail-view
        .items=${this.#items()}
        .selected=${current}
        .label=${'Where you act'}
        @rail-select=${(event: CustomEvent<{ id: string }>) => {
          this.selected = event.detail.id as Place
        }}
      >
        <div class="panehead">
          <h2>${PLACE_LABEL[current]}</h2>
          <p class="count">
            ${steps.length === 0
              ? 'nothing left here'
              : `the ${steps.length} that unblock the most`}
          </p>
        </div>
        ${steps.length === 0
          ? html`<p class="empty">Every action here is done.</p>`
          : html`
              <ul>
                ${steps.map(
                  (step) => html`
                    <li data-fact=${step.fact.id}>
                      <fact-row
                        .fact=${step.fact}
                        .facts=${this.facts}
                        .target=${step.target}
                      ></fact-row>
                      <p class="unlocks">
                        <span class="blocks-count">unlocks ${step.blocks}</span>
                        ${step.unlocks.length > 0 ? html` · ${step.unlocks.join(', ')}` : nothing}
                      </p>
                    </li>
                  `,
                )}
              </ul>
            `}
      </rail-view>
    `
  }
}

customElements.define('next-steps-page', NextStepsPage)

declare global {
  interface HTMLElementTagNameMap {
    'next-steps-page': NextStepsPage
  }
}
