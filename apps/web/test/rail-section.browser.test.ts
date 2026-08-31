import { dataset } from '@hades/data'
import { collectFactIds, type FactMap } from '@hades/engine'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RailSection, RailSectionId } from '../src/components/rail-section.js'
import '../src/components/rail-section.js'
import '@hades/ui'

function section(): RailSection {
  const element = document.body.querySelector('rail-section')
  if (!element) throw new Error('rail-section did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = section().shadowRoot
  if (!shadow) throw new Error('rail-section has no shadow root')
  return shadow
}

function railRoot(): ShadowRoot {
  const rail = root().querySelector('rail-view')
  if (!rail?.shadowRoot) throw new Error('rail-view has no shadow root')
  return rail.shadowRoot
}

async function mount(id: RailSectionId, facts: FactMap = {}): Promise<void> {
  render(html`<rail-section .section=${id} .facts=${facts}></rail-section>`, document.body)
  await section().updateComplete
  const rail = root().querySelector('rail-view')
  await (rail as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
}

function railLabels(): string[] {
  return [...railRoot().querySelectorAll('.rail .name')].map((name) => name.textContent ?? '')
}

describe('the Fated List', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount('fated')
  })

  it('lists all 55 prophecies', () => {
    expect(railLabels()).toHaveLength(55)
    expect(railLabels()).toContain('Close at Heart')
  })

  it('renders a one-action prophecy as one line, not folded and not padded', async () => {
    const single = dataset.achievements.find(
      (achievement) =>
        achievement.collection === 'prophecy' && achievement.name === 'Is There No Escape?',
    )
    expect(single).toBeDefined()
    railRoot().querySelector<HTMLButtonElement>(`button[data-item="${single!.id}"]`)?.click()
    await section().updateComplete
    expect(root().querySelectorAll('li')).toHaveLength(1)
    expect(root().querySelector('.single')?.textContent).toContain('One action')
  })

  it('shows every sub-item of a many-step prophecy, and only its own', async () => {
    // Close at Heart names 23 keepsakes, not the 25 the dataset holds: the Pom
    // Blossom and the Sigil of the Dead are obtainable only after the main
    // story and the in-game list does not ask for them. Reading the count from
    // the requirement rather than writing 23 down is what keeps this honest —
    // this entry was inflated to 25 once, to satisfy an orphan check.
    const closeAtHeart = dataset.achievements.find(
      (achievement) => achievement.name === 'Close at Heart',
    )
    const expected = collectFactIds(closeAtHeart!.requirement).length
    expect(expected).toBeGreaterThan(20)
    railRoot().querySelector<HTMLButtonElement>(`button[data-item="${closeAtHeart!.id}"]`)?.click()
    await section().updateComplete
    expect(root().querySelectorAll('li').length).toBe(expected)
  })
})

describe('The House', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount('house')
  })

  it('lists the six systems, with the shops among them', () => {
    expect(railLabels()).toEqual([
      'Mirror of Night',
      'Pact of Punishment',
      'House Contractor',
      'Well of Charon',
      'Wretched Broker',
      'Platform achievements',
    ])
  })

  it('explains a system the player may never have met', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="pact"]')?.click()
    await section().updateComplete
    const about = root().querySelector('.about')
    expect(about?.textContent).toContain('What this is')
    expect(about?.textContent?.toLowerCase()).toContain('difficulty')
  })

  it('states how we count, where the game is familiar but our rule is not', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="mirror"]')?.click()
    await section().updateComplete
    expect(root().querySelector('.rule')?.textContent).toContain('Both sides')
  })

  it('says plainly that platform achievements hold nothing yet', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="achievement"]')?.click()
    await section().updateComplete
    expect(root().querySelector('.single')?.textContent).toContain('Nothing is tracked')
  })
})

describe('Collections', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount('collections')
  })

  it('holds only the lists with no other owner, and never the Codex', () => {
    expect(railLabels()).toEqual(['Fish', 'Artifacts', 'Boons by type', 'Companions'])
    expect(railLabels().join(' ')).not.toContain('Codex')
  })

  it('counts the 18 fish', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="fish"]')?.click()
    await section().updateComplete
    expect(root().querySelectorAll('li')).toHaveLength(18)
  })

  it('asks to set a fact rather than writing it', async () => {
    const events: { id: string; value: unknown }[] = []
    section().addEventListener('set-fact', (event) => {
      events.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    railRoot().querySelector<HTMLButtonElement>('button[data-item="fish"]')?.click()
    await section().updateComplete
    const input = root()
      .querySelector('li fact-row')
      ?.shadowRoot?.querySelector('hd-checklist-item')
      ?.shadowRoot?.querySelector<HTMLInputElement>('input')
    expect(input).not.toBeNull()
    input!.click()
    expect(events).toHaveLength(1)
    expect(events[0]?.id).toMatch(/^catch:/)
  })
})

describe('what the rail pane must not lose', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('offers a Reveal on a spoiler row, as the subject page does', async () => {
    // Two of the six Companions rows were permanently unlabelled and identical
    // to each other, because the pane hid the label and offered no way back.
    await mount('collections')
    railRoot().querySelector<HTMLButtonElement>('button[data-item="companions"]')?.click()
    await section().updateComplete
    const shadow = root().querySelector('li[data-fact="companion:shady"] fact-row')?.shadowRoot
    expect(shadow?.querySelector('.reveal')).not.toBeNull()
  })

  it('prints a prophecy own text, which the game itself shows the player', async () => {
    await mount('fated')
    const queens = dataset.achievements.find((a) => a.name === "The Queen's Plan")
    railRoot().querySelector<HTMLButtonElement>(`button[data-item="${queens!.id}"]`)?.click()
    await section().updateComplete
    expect(root().querySelector('.prose')?.textContent).toContain('son of the god of the dead')
  })

  it('states a count node rather than listing nine things for a six-of-nine goal', async () => {
    // The rail said 6 while the pane listed 9 checkboxes and never said why.
    await mount('fated')
    const queens = dataset.achievements.find((a) => a.name === "The Queen's Plan")
    railRoot().querySelector<HTMLButtonElement>(`button[data-item="${queens!.id}"]`)?.click()
    await section().updateComplete
    const counting = root().querySelector('.counting')?.textContent ?? ''
    expect(counting).toMatch(/Any 6 of these 9/)
  })

  it('shows the pane roll-up the rail already shows', async () => {
    await mount('fated')
    const queens = dataset.achievements.find((a) => a.name === "The Queen's Plan")
    railRoot().querySelector<HTMLButtonElement>(`button[data-item="${queens!.id}"]`)?.click()
    await section().updateComplete
    expect(root().querySelector('.pnum')?.textContent).toContain('/6')
  })

  it('gives a familiar system a counting rule and no explaining block', async () => {
    // Use the weakest level that works. Mirror of Night is in the bedroom from
    // the first run; only our rule about its two sides needs saying.
    await mount('house')
    railRoot().querySelector<HTMLButtonElement>('button[data-item="mirror"]')?.click()
    await section().updateComplete
    expect(root().querySelector('.rule')).not.toBeNull()
    expect(root().querySelector('.about')).toBeNull()
  })
})
