import { achievementProgress, type FactMap } from '@hades/engine'
import type { Achievement } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement, type TemplateResult } from 'lit'

interface SectionGroup {
  section: string | undefined
  items: Achievement[]
}

/**
 * Groups achievements by section and preserves each group's first-appearance
 * order. Achievements with no section collect into one group keyed by
 * `undefined`, rendered flat with no heading.
 */
function groupBySection(achievements: Achievement[]): SectionGroup[] {
  const groups: SectionGroup[] = []
  const bySection = new Map<string | undefined, SectionGroup>()
  for (const achievement of achievements) {
    let group = bySection.get(achievement.section)
    if (!group) {
      group = { section: achievement.section, items: [] }
      bySection.set(achievement.section, group)
      groups.push(group)
    }
    group.items.push(achievement)
  }
  return groups
}

/** Turns a section slug such as `chthonic-gods` into `Chthonic Gods`. */
function sectionHeading(section: string): string {
  return section
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Fires `achievement-open` with `detail: { id }` when the user opens a row.
 * Fires `section-toggle` with `detail: { section, open }` when a section
 * heading is expanded or collapsed.
 *
 * Renders one flat list when no achievement carries a `section` — unchanged
 * from before sections existed. Renders grouped, collapsible sections
 * otherwise. Collapse state is a controlled prop, not internal state: a
 * caller that unmounts and remounts this component (for example, to show an
 * entry's detail view) must keep `collapsedSections` itself to preserve it.
 */
export class AchievementList extends LitElement {
  static override readonly styles = css`
    ul {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    details {
      margin-bottom: 12px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      padding: 8px 0;
    }
    summary:focus-visible {
      outline: 2px solid var(--hd-color-accent, #c8102e);
    }
    details ul {
      margin-top: 8px;
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
    collapsedSections: { type: Object },
  }

  achievements: Achievement[] = []
  facts: FactMap = {}
  collapsedSections: Record<string, boolean> = {}

  private open(id: string): void {
    this.dispatchEvent(
      new CustomEvent('achievement-open', { detail: { id }, bubbles: true, composed: true }),
    )
  }

  /**
   * Fully controlled: `<details>`'s native `toggle` event fires for a
   * programmatic `open` change too, not only a user click, which would make
   * the very first render of an already-expanded section emit a spurious
   * event. Suppress the native default action instead, compute the new state
   * ourselves, apply it locally so a standalone instance still works, and
   * notify the caller.
   */
  private onSummaryClick(section: string, currentlyOpen: boolean, event: MouseEvent): void {
    event.preventDefault()
    const open = !currentlyOpen
    this.collapsedSections = { ...this.collapsedSections, [section]: !open }
    this.dispatchEvent(
      new CustomEvent('section-toggle', {
        detail: { section, open },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private renderRow(achievement: Achievement): TemplateResult {
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
  }

  private renderGroup(group: SectionGroup): TemplateResult {
    if (group.section === undefined) {
      return html`<ul>
        ${group.items.map((achievement) => this.renderRow(achievement))}
      </ul>`
    }
    const section = group.section
    const open = !this.collapsedSections[section]
    return html`
      <details ?open=${open}>
        <summary @click=${(event: MouseEvent) => this.onSummaryClick(section, open, event)}>
          ${sectionHeading(section)}
        </summary>
        <ul>
          ${group.items.map((achievement) => this.renderRow(achievement))}
        </ul>
      </details>
    `
  }

  override render() {
    const hasSections = this.achievements.some((achievement) => achievement.section !== undefined)
    if (!hasSections) {
      return html`<ul>
        ${this.achievements.map((achievement) => this.renderRow(achievement))}
      </ul>`
    }
    return html`${groupBySection(this.achievements).map((group) => this.renderGroup(group))}`
  }
}

customElements.define('achievement-list', AchievementList)

declare global {
  interface HTMLElementTagNameMap {
    'achievement-list': AchievementList
  }
}
