import { achievementProgress, type FactMap } from '@hades/engine'
import type { Achievement, Fact } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement } from 'lit'
import './requirement-tree.js'

export class AchievementDetail extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
    }
    p.description {
      color: var(--hd-color-muted, #b9a98c);
    }
    button.back {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      margin-bottom: 12px;
      padding: 6px 10px;
    }
  `

  static override readonly properties = {
    achievement: { type: Object },
    facts: { type: Object },
    factsById: { type: Object },
  }

  achievement: Achievement | undefined
  facts: FactMap = {}
  factsById: Map<string, Fact> = new Map()

  override render() {
    const achievement = this.achievement
    if (!achievement) return html`<p>Select a prophecy.</p>`
    const progress = achievementProgress(achievement, this.facts)

    return html`
      <button
        class="back"
        type="button"
        @click=${() =>
          this.dispatchEvent(new CustomEvent('detail-close', { bubbles: true, composed: true }))}
      >
        Back
      </button>
      <hd-card>
        <span slot="header">${achievement.name}</span>
        <p class="description">${achievement.description}</p>
        <hd-progress
          .value=${progress.done}
          .max=${progress.total}
          label=${achievement.name}
        ></hd-progress>
        <requirement-tree
          .node=${achievement.requirement}
          .facts=${this.facts}
          .factsById=${this.factsById}
        ></requirement-tree>
      </hd-card>
    `
  }
}

customElements.define('achievement-detail', AchievementDetail)

declare global {
  interface HTMLElementTagNameMap {
    'achievement-detail': AchievementDetail
  }
}
