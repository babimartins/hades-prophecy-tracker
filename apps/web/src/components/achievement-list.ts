import { achievementProgress, type FactMap } from '@hades/engine'
import type { Achievement } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement } from 'lit'

/** Fires `achievement-open` with `detail: { id }` when the user opens a row. */
export class AchievementList extends LitElement {
  static override readonly styles = css`
    ul {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    button {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      display: grid;
      font: inherit;
      gap: 4px;
      padding: 8px;
      text-align: left;
      width: 100%;
    }
    button:focus-visible {
      outline: 2px solid var(--hd-color-accent, #c8102e);
    }
    li[data-status='done'] .name::after {
      content: ' ✓';
      color: var(--hd-color-done, #2f9e6f);
    }
    .name {
      font-weight: 600;
    }
  `

  static override readonly properties = {
    achievements: { type: Array },
    facts: { type: Object },
  }

  achievements: Achievement[] = []
  facts: FactMap = {}

  private open(id: string): void {
    this.dispatchEvent(
      new CustomEvent('achievement-open', { detail: { id }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <ul>
        ${this.achievements.map((achievement) => {
          const progress = achievementProgress(achievement, this.facts)
          return html`
            <li data-status=${progress.status}>
              <button type="button" @click=${() => this.open(achievement.id)}>
                <span class="name">${achievement.name}</span>
                <hd-progress
                  .value=${progress.done}
                  .max=${progress.total}
                  label=${achievement.name}
                ></hd-progress>
              </button>
            </li>
          `
        })}
      </ul>
    `
  }
}

customElements.define('achievement-list', AchievementList)

declare global {
  interface HTMLElementTagNameMap {
    'achievement-list': AchievementList
  }
}
