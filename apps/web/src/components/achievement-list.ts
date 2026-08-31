import { achievementProgress, type FactMap } from '@hades/engine'
import type { Achievement, Collection } from '@hades/schema'
import { colorVar } from '@hades/ui'
import { css, html, LitElement, type TemplateResult } from 'lit'

interface SectionGroup {
  collection: string
  section: string | undefined
  items: Achievement[]
}

interface CollectionBlock {
  collection: string
  groups: SectionGroup[]
}

/** Joins a collection id and a section slug into one collapse-state key. */
function sectionKey(collection: string, section: string): string {
  return `${collection}:${section}`
}

/**
 * A view at or below this many rows defaults every section open, matching
 * the behaviour from before sections could collapse. Above it, a section
 * defaults closed unless the caller says otherwise. Chosen so a filtered,
 * short view stays exactly as before (Weapon Aspects and Mirror of Night
 * are 24 rows each, filtered alone) while the unfiltered "All" view (545
 * rows) and a large single collection filtered alone (Boons 174, Codex
 * 119, Daedalus 72) default closed. A single collapsed section is worse
 * than an open one, so this only ever closes a section nobody asked to
 * keep open.
 */
const LARGE_LIST_ROW_THRESHOLD = 40

/**
 * Groups achievements by collection, then by section within each collection,
 * preserving first-appearance order at both levels. A collection's
 * achievements with no section collect into one group keyed by `undefined`,
 * rendered flat with no heading.
 *
 * Grouping by collection first — not by section alone — is what keeps two
 * collections apart. A bare section key cannot: the no-section group used to
 * be keyed on `undefined` alone, which silently merged every unsectioned
 * collection into one block once a second one existed.
 */
function groupByCollectionAndSection(achievements: Achievement[]): CollectionBlock[] {
  const blocks: CollectionBlock[] = []
  const blockByCollection = new Map<string, CollectionBlock>()
  const groupByCompositeKey = new Map<string, SectionGroup>()
  for (const achievement of achievements) {
    let block = blockByCollection.get(achievement.collection)
    if (!block) {
      block = { collection: achievement.collection, groups: [] }
      blockByCollection.set(achievement.collection, block)
      blocks.push(block)
    }
    const key = `${achievement.collection} ${achievement.section ?? ''}`
    let group = groupByCompositeKey.get(key)
    if (!group) {
      group = { collection: achievement.collection, section: achievement.section, items: [] }
      groupByCompositeKey.set(key, group)
      block.groups.push(group)
    }
    group.items.push(achievement)
  }
  return blocks
}

/** Words that stay lower case mid-heading, matching how the game writes them. */
const LOWERCASE_HEADING_WORDS = new Set(['of'])

/**
 * Turns a section slug such as `chthonic-gods` into `Chthonic Gods`, and
 * `others-of-note` into `Others of Note` rather than `Others Of Note`: the
 * first word is always capitalised, every other word is title-cased unless
 * it is in `LOWERCASE_HEADING_WORDS`.
 */
function sectionHeading(section: string): string {
  return section
    .split('-')
    .map((word, index) =>
      index > 0 && LOWERCASE_HEADING_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/**
 * Fires `achievement-open` with `detail: { id }` when the user opens a row.
 * Fires `section-toggle` with `detail: { collection, section, open }` when a
 * section heading is expanded or collapsed.
 *
 * Groups by collection, then by section within it. A collection with no
 * sectioned entries renders as one flat list, exactly as before sections
 * existed. When the achievements span more than one collection — the
 * default "All" view, once more than one collection holds entries — a
 * heading naming the collection renders above each collection's groups, so
 * the boundary between (for example) prophecies and Codex entries is never
 * just an unlabelled change in row shape. `collections` supplies the
 * id-to-name lookup for that heading; an id missing from it falls back to
 * showing the raw id.
 *
 * Collapse state is a controlled prop, not internal state: a caller that
 * unmounts and remounts this component (for example, to show an entry's
 * detail view) must keep `collapsedSections` itself to preserve it. It is
 * keyed by `${collection}:${section}`, not by the bare section slug, so two
 * collections that happen to share a section slug collapse independently.
 *
 * A section with no explicit entry in `collapsedSections` defaults open on a
 * short list and closed on a long one — see `LARGE_LIST_ROW_THRESHOLD`. An
 * explicit entry always wins over the default, in either direction.
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
    /**
     * A section heading is a real control, not decorative small-caps text:
     * a visible surface, a border, and a hit area worth tapping. The native
     * disclosure marker is replaced by ::before so its rotation on open
     * matches the surface treatment, instead of a bare triangle glyph with
     * no background of its own.
     */
    summary {
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      font-family: var(--hd-font-display, serif);
      font-weight: 600;
      gap: 10px;
      list-style: none;
      padding: 10px 14px;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::before {
      content: '▸';
      display: inline-block;
      transition: transform 120ms ease-out;
    }
    details[open] > summary::before {
      transform: rotate(90deg);
    }
    summary:hover {
      background: rgba(255, 255, 255, 0.09);
    }
    summary:focus-visible {
      outline: 2px solid ${colorVar('--hd-color-accent')};
      outline-offset: 2px;
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
      padding: 6px 8px;
      text-align: left;
      width: 100%;
    }
    /**
     * A single-sub-item row shows the compact hd-progress status, not a
     * bar, so name and status fit on one line instead of stacking. See
     * hd-progress: it renders that compact status whenever max <= 1.
     */
    button[data-compact] {
      align-items: center;
      display: flex;
      gap: 12px;
    }
    button[data-compact] .name {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button:focus-visible {
      outline: 2px solid ${colorVar('--hd-color-accent')};
    }
    li[data-status='done'] .name::after {
      content: ' ✓';
      color: ${colorVar('--hd-color-done')};
    }
    .collection-heading {
      font-family: var(--hd-font-display, serif);
      font-size: 1.125rem;
      font-weight: 700;
      margin: 24px 0 8px;
    }
    .collection-heading:first-child {
      margin-top: 0;
    }
    .name {
      font-weight: 600;
    }
  `

  static override readonly properties = {
    achievements: { type: Array },
    collections: { type: Array },
    facts: { type: Object },
    collapsedSections: { type: Object },
  }

  achievements: Achievement[] = []
  /** Id-to-name lookup for the collection heading. See the class docblock. */
  collections: Collection[] = []
  facts: FactMap = {}
  collapsedSections: Record<string, boolean> = {}

  private open(id: string): void {
    this.dispatchEvent(
      new CustomEvent('achievement-open', { detail: { id }, bubbles: true, composed: true }),
    )
  }

  private collectionName(id: string): string {
    return this.collections.find((collection) => collection.id === id)?.name ?? id
  }

  /**
   * Fully controlled: `<details>`'s native `toggle` event fires for a
   * programmatic `open` change too, not only a user click, which would make
   * the very first render of an already-expanded section emit a spurious
   * event. Suppress the native default action instead, compute the new state
   * ourselves, apply it locally so a standalone instance still works, and
   * notify the caller.
   */
  private onSummaryClick(
    collection: string,
    section: string,
    currentlyOpen: boolean,
    event: MouseEvent,
  ): void {
    event.preventDefault()
    const open = !currentlyOpen
    const key = sectionKey(collection, section)
    this.collapsedSections = { ...this.collapsedSections, [key]: !open }
    this.dispatchEvent(
      new CustomEvent('section-toggle', {
        detail: { collection, section, open },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private renderRow(achievement: Achievement): TemplateResult {
    const progress = achievementProgress(achievement, this.facts)
    return html`
      <li data-status=${progress.status}>
        <button
          type="button"
          ?data-compact=${progress.total <= 1}
          @click=${() => this.open(achievement.id)}
        >
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
    const collection = group.collection
    const section = group.section
    const key = sectionKey(collection, section)
    const explicit = this.collapsedSections[key]
    const defaultOpen = this.achievements.length <= LARGE_LIST_ROW_THRESHOLD
    const open = explicit === undefined ? defaultOpen : !explicit
    return html`
      <details ?open=${open}>
        <summary
          @click=${(event: MouseEvent) => this.onSummaryClick(collection, section, open, event)}
        >
          ${sectionHeading(section)}
        </summary>
        <ul>
          ${group.items.map((achievement) => this.renderRow(achievement))}
        </ul>
      </details>
    `
  }

  private renderCollectionBlock(block: CollectionBlock, showHeading: boolean): TemplateResult {
    return html`
      ${showHeading
        ? html`<h2 class="collection-heading">${this.collectionName(block.collection)}</h2>`
        : null}
      ${block.groups.map((group) => this.renderGroup(group))}
    `
  }

  override render() {
    const blocks = groupByCollectionAndSection(this.achievements)
    const showHeadings = blocks.length > 1
    return html`${blocks.map((block) => this.renderCollectionBlock(block, showHeadings))}`
  }
}

customElements.define('achievement-list', AchievementList)

declare global {
  interface HTMLElementTagNameMap {
    'achievement-list': AchievementList
  }
}
