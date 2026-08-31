import { dataset } from '@hades/data'
import { nextSteps, type FactMap } from '@hades/engine'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import type { NextStepsPage } from '../src/components/next-steps-page.js'
import '../src/components/next-steps-page.js'
import { DERIVED_FROM } from '../src/lib/derived.js'
import { PLACE_BY_NAMESPACE, placeOf } from '../src/lib/where.js'
import '@hades/ui'

function page(): NextStepsPage {
  const element = document.body.querySelector('next-steps-page')
  if (!element) throw new Error('next-steps-page did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = page().shadowRoot
  if (!shadow) throw new Error('next-steps-page has no shadow root')
  return shadow
}

async function mount(facts: FactMap = {}): Promise<void> {
  render(html`<next-steps-page .facts=${facts}></next-steps-page>`, document.body)
  await page().updateComplete
}

function railRoot(): ShadowRoot {
  const rail = root().querySelector('rail-view')
  if (!rail?.shadowRoot) throw new Error('rail-view has no shadow root')
  return rail.shadowRoot
}

/** Selects a place on the rail and returns the pane, which is the light DOM. */
async function block(place: string): Promise<ShadowRoot> {
  railRoot().querySelector<HTMLButtonElement>(`button[data-item="${place}"]`)?.click()
  await page().updateComplete
  return root()
}

describe('where an action happens', () => {
  it('maps every namespace in the dataset, with no default', () => {
    // A prefix rule with a fallback is how contractor:renovation-tasks was once
    // counted as one of the 164 Contractor jobs when it is the prophecy's 0-30
    // counter. A namespace added later must fail here, not land in a block.
    const namespaces = [...new Set(dataset.facts.map((fact) => fact.id.split(':')[0]!))]
    const unmapped = namespaces.filter((ns) => PLACE_BY_NAMESPACE[ns] === undefined)
    expect(unmapped).toEqual([])
  })

  it('files a Work Order under the Contractor and a boon under a run', () => {
    expect(placeOf('workorder:singers-gamble')).toBe('contractor')
    expect(placeOf('boon:zeus:lightning-strike')).toBe('run')
    expect(placeOf('nectar:eurydice')).toBe('house')
  })
})

describe('the Next Steps page', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount()
  })

  it('lists the three places on the rail, in the order they are declared', () => {
    const labels = [...railRoot().querySelectorAll('.rail .name')].map((n) => n.textContent?.trim())
    expect(labels).toEqual(['House Contractor', 'House of Hades', 'During a run'])
  })

  it('opens on the first place and swaps the pane when another is chosen', async () => {
    expect(root().querySelector('h2')?.textContent?.trim()).toBe('House Contractor')
    await block('run')
    expect(root().querySelector('h2')?.textContent?.trim()).toBe('During a run')
  })

  it('counts a place on the rail in facts, over everything that belongs to it', async () => {
    // The pane shows the front of the queue; the rail bar shows the whole
    // place, so it does not read as nearly done when 25 of 610 are listed.
    const item = railRoot().querySelector('button[data-item="run"]')?.textContent ?? ''
    expect(item).toMatch(/0\/\d{3}/)
  })

  it('leads each place with the action that unblocks the most', async () => {
    // On an empty save the two Work Orders top the Contractor pane: each one
    // opens a story chain that four other entries wait on.
    const pane = await block('contractor')
    expect(pane.querySelector('li')?.getAttribute('data-fact')).toBe(
      'workorder:knave-kings-sentence',
    )
    const counts = [...pane.querySelectorAll('.blocks-count')].map((n) =>
      Number((n.textContent ?? '').replace(/\D/g, '')),
    )
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('leaves the roll-up entries out of the count and out of the names', async () => {
    // God of Blood reaches 692 facts and Had to Happen 460, so counting them
    // adds one to almost every row and puts their names on all of them.
    const text = root().textContent ?? ''
    for (const id of Object.keys(DERIVED_FROM)) {
      const name = dataset.achievements.find((a) => a.id === id)!.name
      expect([id, text.includes(name)]).toEqual([id, false])
    }
    const withRollups = nextSteps(dataset, {})
    const without = nextSteps(dataset, {}, Object.keys(DERIVED_FROM))
    const top = without[0]!
    expect(withRollups.find((s) => s.fact === top.fact)!.blocks).toBeGreaterThan(top.blocks)

    // The count on the page must be the one without them. Checking only the
    // names let a version through that still counted all five: God of Blood
    // and Had to Happen both reach this action, so 8 became 10.
    const shown = (await block('contractor')).querySelector('.blocks-count')?.textContent ?? ''
    expect(shown.replace(/\D/g, '')).toBe(String(top.blocks))
    expect(top.blocks).toBe(8)
  })

  it('names the entries an action would advance', async () => {
    // Case-insensitive: the trophy writes it "End To Torment" and the prophecy
    // "End to Torment", and which capitalisation survives the dedupe is not
    // what this test is about.
    const pane = await block('contractor')
    expect((pane.querySelector('li .unlocks')?.textContent ?? '').toLowerCase()).toContain(
      'end to torment',
    )
  })

  it('names a goal once, though a trophy and a prophecy may share it', async () => {
    // 18 names belong to more than one entry. "End To Torment" the trophy and
    // "End to Torment" the prophecy differ only in a capital T, and printing
    // both reads as a bug.
    const shown = (await block('contractor')).querySelector('li .unlocks')?.textContent ?? ''
    const names = shown
      .split('·')[1]
      ?.split(',')
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean)
    expect(names).toBeDefined()
    expect(new Set(names).size).toBe(names!.length)
  })

  it('says it is a ranking and not an order, because prerequisites are unknown', () => {
    // Nothing in the dataset records what the story has unlocked, so an action
    // gated behind progress appears as readily as one available now.
    expect(root().querySelector('.lede')?.textContent).toMatch(/not an\s+order/)
  })

  it('sets a row to the hardest target any unfinished entry asks for', async () => {
    // A keepsake is wanted at rank 1 by Something From Everyone and at rank 3
    // by Friends Forever. Here it must stay listed until rank 3, because it is
    // still blocking something. Taking the easiest target instead would tick
    // it done at rank 1 and drop it while Friends Forever still waits.
    const keepsake = [...(await block('run')).querySelectorAll('li')].find((li) =>
      (li.getAttribute('data-fact') ?? '').startsWith('keepsake:'),
    )
    expect(keepsake).toBeDefined()
    const row = keepsake!.querySelector('fact-row') as HTMLElement & { target?: number }
    expect(row.target).toBe(3)
    // A keepsake stops at 3, so it draws pips rather than a typed field.
    const pips = row.shadowRoot?.querySelector('.pips')
    expect(pips?.getAttribute('aria-valuemax')).toBe('3')
  })

  it('drops an action down the list as entries stop needing it', async () => {
    // The Lambent Plume blocks four entries at rank 0. At rank 1 it stops
    // blocking Something From Everyone and falls out of the top of the block.
    const before = nextSteps(dataset, {}, Object.keys(DERIVED_FROM))
    const after = nextSteps(dataset, { 'keepsake:lambent-plume': 1 }, Object.keys(DERIVED_FROM))
    const rank = (steps: typeof before): number =>
      steps.findIndex((s) => s.fact === 'keepsake:lambent-plume')
    expect(rank(after)).toBeGreaterThan(rank(before))
    await mount({ 'keepsake:lambent-plume': 3 })
    const ids = [...(await block('run')).querySelectorAll('li')].map((li) =>
      li.getAttribute('data-fact'),
    )
    expect(ids).not.toContain('keepsake:lambent-plume')
  })

  it('drops an action out of the list once nothing needs it', async () => {
    const before = (await block('contractor')).querySelectorAll('li').length
    await mount({ 'workorder:knave-kings-sentence': true })
    const ids = [...(await block('contractor')).querySelectorAll('li')].map((li) =>
      li.getAttribute('data-fact'),
    )
    expect(ids).not.toContain('workorder:knave-kings-sentence')
    expect(before).toBeGreaterThan(0)
  })

  it('caps a place at the front of its queue', async () => {
    // "During a run" alone has 610 unfinished actions. The pane shows the
    // front of the queue; the rail bar carries the whole count.
    for (const place of ['contractor', 'house', 'run']) {
      const n = (await block(place)).querySelectorAll('li').length
      expect([place, n <= 25]).toEqual([place, true])
    }
    expect((await block('run')).querySelectorAll('li')).toHaveLength(25)
  })
})

describe('the rail keeps the width the component gives it', () => {
  it('is as wide here as on every other rail section', async () => {
    // `rail-view` sets `:host { display: grid; grid-template-columns: 290px …}`.
    // An outer rule beats `:host`, so a `display: flex` written on the host
    // from the parent killed the column and the rail shrank to its content.
    render(html``, document.body)
    await mount()
    const rail = railRoot().querySelector('.rail')!
    expect(Math.round(rail.getBoundingClientRect().width)).toBeGreaterThan(240)
  })
})
