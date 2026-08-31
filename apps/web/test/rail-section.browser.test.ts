import { dataset } from '@hades/data'
import { achievementProgress, collectFactIds, type FactMap } from '@hades/engine'
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

  it('lists the systems, with the Contractor split by room', () => {
    // The Contractor sells from six separate lists and the wiki groups them
    // that way. One 171-line pane would bury the Work Orders, which are the
    // only purchases that unlock a character's story.
    expect(railLabels()).toEqual([
      'Mirror of Night',
      'Pact of Punishment',
      'Contractor · Work Orders',
      'Contractor · Great Hall',
      'Contractor · West Hall',
      'Contractor · Lounge',
      'Contractor · Bedchambers',
      'Contractor · Court Music',
      'Well of Charon',
      'Wretched Broker',
      'Platform achievements',
    ])
  })

  it('shows every purchase in a room, with the Work Orders kept apart', async () => {
    railRoot()
      .querySelector<HTMLButtonElement>('button[data-item="contractor-court-music"]')
      ?.click()
    await section().updateComplete
    expect(root().querySelectorAll('li')).toHaveLength(24)

    railRoot()
      .querySelector<HTMLButtonElement>('button[data-item="contractor-work-orders"]')
      ?.click()
    await section().updateComplete
    expect(root().querySelectorAll('li')).toHaveLength(37)
    expect(root().querySelector('.rule')?.textContent).toContain('story steps')
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

  it('keeps the pane readable by not printing a pool it lists elsewhere', async () => {
    // Before this, Had to Happen alone drew all 55 prophecies as 460 rows,
    // Home Makeover drew 164 and Blessed by the Gods 149. The pane ran to
    // 1129 rows. It now draws 284, and the largest single block is 25.
    railRoot().querySelector<HTMLButtonElement>('button[data-item="achievement"]')?.click()
    await section().updateComplete
    expect(root().querySelectorAll('fact-row').length).toBe(284)
    const biggest = Math.max(
      ...[...root().querySelectorAll('.trophy')].map((t) => t.querySelectorAll('fact-row').length),
    )
    expect(biggest).toBe(25)
    const makeover = root().querySelector('[data-achievement="achievement:home-makeover"]')
    // The roll-up is the part that exists nowhere else.
    expect(makeover?.querySelector('.tnum')?.textContent?.trim()).toBe('0/50')
    expect(makeover?.textContent).toContain('Contractor rooms')
  })

  it('lists all 50 platform trophies, each with the actions it needs', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="achievement"]')?.click()
    await section().updateComplete
    const trophies = [...root().querySelectorAll('.trophy')]
    expect(trophies).toHaveLength(50)
    // The owner's rule: anything that needs sub-items must list them. The five
    // exceptions are thresholds over pools the app lists in full elsewhere,
    // and each says where. They are named here so that adding a sixth is a
    // reviewed edit rather than something that slides past.
    const withoutActions = trophies
      .filter((trophy) => trophy.querySelectorAll('fact-row').length === 0)
      .map((trophy) => trophy.getAttribute('data-achievement'))
    expect(withoutActions.sort()).toEqual([
      'achievement:blessed-by-the-gods',
      'achievement:god-of-blood',
      'achievement:had-to-happen',
      'achievement:home-makeover',
      'achievement:tools-of-the-architect',
    ])
    for (const trophy of trophies) {
      if (trophy.querySelectorAll('fact-row').length > 0) continue
      expect([
        trophy.getAttribute('data-achievement'),
        (trophy.textContent ?? '').includes('Its actions are'),
      ]).toEqual([trophy.getAttribute('data-achievement'), true])
    }
  })

  it('shows God of Blood as the other 49, without repeating 207 rows', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="achievement"]')?.click()
    await section().updateComplete
    const god = root().querySelector('[data-achievement="achievement:god-of-blood"]')
    expect(god?.textContent).toContain('other 49')
    expect(god?.querySelectorAll('fact-row')).toHaveLength(0)
  })

  it('counts God of Blood in trophies, not in the 10283 units it sums to', async () => {
    // Its requirement is the other 49 requirements, so evaluating it adds up
    // every unit inside them. The sum is true and unreadable.
    railRoot().querySelector<HTMLButtonElement>('button[data-item="achievement"]')?.click()
    await section().updateComplete
    const god = root().querySelector('[data-achievement="achievement:god-of-blood"]')
    expect(god?.querySelector('.tnum')?.textContent?.trim()).toBe('0/49')
  })

  it('reads God of Blood last, after the trophies it is made of', async () => {
    railRoot().querySelector<HTMLButtonElement>('button[data-item="achievement"]')?.click()
    await section().updateComplete
    const ids = [...root().querySelectorAll('.trophy')].map((t) =>
      t.getAttribute('data-achievement'),
    )
    expect(ids[ids.length - 1]).toBe('achievement:god-of-blood')
  })

  it('counts the rail item in trophies earned, and says so', async () => {
    const trophy = dataset.achievements.find((a) => a.id === 'achievement:river-denizens')!
    const facts: FactMap = Object.fromEntries(
      collectFactIds(trophy.requirement).map((id) => [id, true]),
    )
    render(html``, document.body)
    await mount('house', facts)
    const item = railRoot().querySelector('button[data-item="achievement"]')
    // Every fish fact ticked earns exactly this one trophy, not 6 of 882.
    expect(item?.textContent).toContain('trophies earned')
    expect(item?.textContent).toContain('50')
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
    const queens = dataset.achievements.find((a) => a.name === "The Queen's Plan")!
    railRoot().querySelector<HTMLButtonElement>(`button[data-item="${queens.id}"]`)?.click()
    await section().updateComplete
    // 15, not the 6 this pinned when the requirement was the count alone: six
    // bonds plus the nine conversations the Epilogue Guide names.
    const rollup = achievementProgress(queens, {})
    expect(rollup.total).toBe(15)
    expect(root().querySelector('.pnum')?.textContent).toContain(`/${rollup.total}`)
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

describe('a shop shows its prices', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('puts the price beside the purchase, with the currency it asks for', async () => {
    await mount('house')
    railRoot()
      .querySelector<HTMLButtonElement>('button[data-item="contractor-court-music"]')
      ?.click()
    await section().updateComplete
    const cost = root().querySelector('li fact-row')?.shadowRoot?.querySelector('.cost')
    expect(cost?.textContent?.trim()).toMatch(/^\d+ (Diamond|Gemstones|Obol)$/)
  })

  it('shows the Well of Charon in Obols', async () => {
    await mount('house')
    railRoot().querySelector<HTMLButtonElement>('button[data-item="well-of-charon"]')?.click()
    await section().updateComplete
    const costs = [...root().querySelectorAll('li fact-row')]
      .map((row) => row.shadowRoot?.querySelector('.cost')?.textContent?.trim())
      .filter(Boolean)
    expect(costs).toHaveLength(22)
    expect(costs.every((text) => text!.endsWith('Obol'))).toBe(true)
  })
})
