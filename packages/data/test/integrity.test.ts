import { collectFactIds, NAMESPACES_WITHOUT_CAPABILITY } from '@hades/engine'
import type { RequirementChild } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { dataset } from '../src/index.js'

describe('dataset integrity', () => {
  it('passes schema validation', () => {
    expect(dataset.achievements.length).toBeGreaterThan(0)
  })

  it('has no duplicate fact id', () => {
    const ids = dataset.facts.map((fact) => fact.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no duplicate achievement id', () => {
    const ids = dataset.achievements.map((achievement) => achievement.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('references only declared facts', () => {
    const declared = new Set(dataset.facts.map((fact) => fact.id))
    const unknown: string[] = []
    for (const achievement of dataset.achievements) {
      for (const factId of collectFactIds(achievement.requirement)) {
        if (!declared.has(factId)) unknown.push(`${achievement.id} -> ${factId}`)
      }
    }
    expect(unknown).toEqual([])
  })

  it('declares no orphan fact', () => {
    const used = new Set(
      dataset.achievements.flatMap((achievement) => collectFactIds(achievement.requirement)),
    )
    const orphans = dataset.facts.filter((fact) => !used.has(fact.id)).map((fact) => fact.id)
    expect(orphans).toEqual([])
  })

  it('assigns every fact and achievement to a declared collection', () => {
    const collections = new Set(dataset.collections.map((collection) => collection.id))
    for (const fact of dataset.facts) expect(collections.has(fact.collection)).toBe(true)
    for (const item of dataset.achievements) expect(collections.has(item.collection)).toBe(true)
  })

  it('gives every number fact a max value', () => {
    const missing = dataset.facts
      .filter((fact) => fact.kind === 'number' && fact.max === undefined)
      .map((fact) => fact.id)
    expect(missing).toEqual([])
  })

  it('never asks an atLeast node for more than the fact allows', () => {
    const factsById = new Map(dataset.facts.map((fact) => [fact.id, fact]))
    const violations: string[] = []

    function walk(achievementId: string, node: RequirementChild): void {
      if (typeof node === 'string') return
      if (node.kind === 'atLeast') {
        const fact = factsById.get(node.fact)
        if (fact?.max !== undefined && node.value > fact.max) {
          violations.push(`${achievementId} -> ${node.fact} (atLeast ${node.value} > max ${fact.max})`)
        }
        return
      }
      for (const child of node.of) walk(achievementId, child)
    }

    for (const achievement of dataset.achievements) walk(achievement.id, achievement.requirement)
    expect(violations).toEqual([])
  })

  it('documents every number fact used as a plain (non-atLeast) requirement child', () => {
    // Before the Critical-1 fix, `requirement-tree` dispatched on the
    // requirement node shape, not on the fact's own `kind`: a number fact
    // reached as a plain child rendered as a lossy boolean checkbox that
    // could silently destroy a stored rank (untick, then re-tick, and a
    // stored 5 becomes a 1). The fix makes `requirement-tree` check
    // `fact.kind` for every plain child and render the same bounded numeric
    // control as an `atLeast` node whenever it is `number`
    // (apps/web/src/components/requirement-tree.ts,
    // apps/web/test/requirement-tree.browser.test.ts), so this pattern is
    // now safe by construction rather than forbidden.
    //
    // This test is a canary, not a ban: it pins the current, known-safe
    // shape so a change to it is a deliberate, reviewed edit, not a silent
    // one.
    const factsById = new Map(dataset.facts.map((fact) => [fact.id, fact]))
    const plainNumberFactIds = new Set<string>()
    let referenceCount = 0

    function walk(node: RequirementChild): void {
      if (typeof node === 'string') {
        const fact = factsById.get(node)
        if (fact?.kind === 'number') {
          plainNumberFactIds.add(node)
          referenceCount += 1
        }
        return
      }
      if (node.kind === 'atLeast') return
      for (const child of node.of) walk(child)
    }

    for (const achievement of dataset.achievements) walk(achievement.requirement)

    expect(referenceCount).toBe(16)
    expect(plainNumberFactIds.size).toBe(15)
  })

  it('has no two facts whose labels normalize to the same string', () => {
    const normalize = (label: string): string => label.toLowerCase().trim().replace(/\s+/g, ' ')
    const idsByLabel = new Map<string, string[]>()
    for (const fact of dataset.facts) {
      const key = normalize(fact.label)
      const ids = idsByLabel.get(key) ?? []
      ids.push(fact.id)
      idsByLabel.set(key, ids)
    }
    const duplicates = [...idsByLabel.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ids.join(' vs. '))
    expect(duplicates).toEqual([])
  })

  it('exposes how many achievements reference each fact', () => {
    const referenceCount = new Map<string, number>()
    for (const fact of dataset.facts) referenceCount.set(fact.id, 0)
    for (const achievement of dataset.achievements) {
      for (const factId of collectFactIds(achievement.requirement)) {
        referenceCount.set(factId, (referenceCount.get(factId) ?? 0) + 1)
      }
    }

    const distribution = new Map<number, number>()
    for (const count of referenceCount.values()) {
      distribution.set(count, (distribution.get(count) ?? 0) + 1)
    }

    // Not an assertion that sharing exists: it may legitimately be zero, as it
    // was for the first 30 entries. This makes the number visible in test
    // output instead of it staying unmeasured.
    console.log(
      'Fact reference count distribution (referenced-by-N-achievements -> fact count):',
      Object.fromEntries([...distribution.entries()].sort((a, b) => a[0] - b[0])),
    )

    // Every fact must be counted exactly once, whatever its share count is.
    const totalFacts = [...distribution.entries()].reduce((sum, [, facts]) => sum + facts, 0)
    expect(totalFacts).toBe(dataset.facts.length)
  })
})

describe('the subject roster', () => {
  it('holds one entry per Codex entry, plus Persephone', () => {
    // Persephone is the one subject the Codex cannot supply. The Codex page
    // lists her in neither its section tables nor its exclusion list, yet she
    // has facts and gives the Pom Blossom keepsake.
    const codexEntries = dataset.achievements.filter((a) => a.collection === 'codex')
    expect(codexEntries).toHaveLength(119)
    expect(dataset.subjects).toHaveLength(120)
    // The six weapons take their true name, so their subject id does not match
    // the Codex slug. Compare on the display name instead, which is shared.
    const codexNames = new Set(codexEntries.map((entry) => entry.name))
    const withoutCodexEntry = dataset.subjects.filter(
      (subject) => !codexNames.has(subject.name),
    )
    expect(withoutCodexEntry.map((s) => s.id)).toEqual(['persephone'])
  })

  it('has no duplicate subject id', () => {
    const ids = dataset.subjects.map((subject) => subject.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('splits into the four types as the Codex sections dictate', () => {
    const counts: Record<string, number> = {}
    for (const subject of dataset.subjects) {
      counts[subject.type] = (counts[subject.type] ?? 0) + 1
    }
    expect(counts).toEqual({ character: 73, collectible: 34, region: 7, weapon: 6 })
  })

  it('names the six weapons by their true name, not their Codex display name', () => {
    const weapons = dataset.subjects.filter((s) => s.type === 'weapon').map((s) => s.id)
    expect(weapons.sort()).toEqual([
      'aegis',
      'coronacht',
      'exagryph',
      'malphon',
      'stygius',
      'varatha',
    ])
  })

  it('keeps the Codex display name, so a weapon reads as the player sees it', () => {
    const stygius = dataset.subjects.find((s) => s.id === 'stygius')
    expect(stygius?.name).toBe('Stygian Blade')
  })
})

describe('facts tagged with a subject', () => {
  const tagged = dataset.facts.filter((fact) => fact.subjects.length > 0)
  const systemFacts = dataset.facts.filter((fact) => fact.subjects.length === 0)

  it('names only subjects that exist in the roster', () => {
    const roster = new Set(dataset.subjects.map((subject) => subject.id))
    const unknown: string[] = []
    for (const fact of tagged) {
      for (const id of fact.subjects) {
        if (!roster.has(id)) unknown.push(`${fact.id} -> ${id}`)
      }
    }
    expect(unknown).toEqual([])
  })

  it('splits into tagged and deliberately subject-less', () => {
    expect(tagged).toHaveLength(611)
    expect(systemFacts).toHaveLength(81)
    expect(tagged.length + systemFacts.length).toBe(dataset.facts.length)
    expect(dataset.facts).toHaveLength(692)
  })

  it('gives a system fact an empty list, never a missing key and never a subject', () => {
    // The two states mean different things. An empty list says "this names no
    // subject on purpose". A missing key says "nobody has established it yet".
    // Asserting only that the key exists would let a `pact:*` fact tagged
    // ["zeus"] through, so this asserts the list is actually empty.
    const wrong = dataset.facts
      .filter((fact) => NAMESPACES_WITHOUT_CAPABILITY.includes(fact.id.split(':')[0]!))
      .filter((fact) => fact.subjects.length !== 0)
      .map((fact) => `${fact.id} -> ${JSON.stringify(fact.subjects)}`)
    expect(wrong).toEqual([])
  })

  it('covers the aggregate facts that name no namespace of their own', () => {
    // `codex:sections-revealed` counts Codex sections. It sits in a namespace
    // that is otherwise a subject, so the namespace rule cannot reach it.
    const aggregate = dataset.facts.find((fact) => fact.id === 'codex:sections-revealed')
    expect(aggregate?.subjects).toEqual([])
  })

  it('leaves every subject named by at least one fact', () => {
    const named = new Set(tagged.flatMap((fact) => fact.subjects))
    const orphans = dataset.subjects.filter((subject) => !named.has(subject.id))
    expect(orphans.map((subject) => subject.id)).toEqual([])
  })

  it('leaves nothing unresolved', () => {
    // Every fact names its subjects or declares it has none. The schema now
    // requires the key, so this is belt and braces, and it is the assertion
    // that says phase 2 finished.
    const missing = dataset.facts.filter((fact) => !Array.isArray(fact.subjects))
    expect(missing).toEqual([])
  })
})

describe('fact descriptions', () => {
  const described = dataset.facts.filter((fact) => fact.description !== undefined)

  it('covers every namespace whose label states an action but not an effect', () => {
    const byNamespace: Record<string, number> = {}
    for (const fact of described) {
      const namespace = fact.id.split(':')[0]!
      byNamespace[namespace] = (byNamespace[namespace] ?? 0) + 1
    }
    expect(byNamespace).toEqual({
      boon: 149,
      daedalus: 72,
      keepsake: 25,
      wellofcharon: 25,
      pact: 15,
      curse: 13,
      blessing: 12,
    })
    expect(described).toHaveLength(311)
  })

  it('never stores a blank or whitespace-only description', () => {
    const blank = described.filter((fact) => fact.description!.trim().length === 0)
    expect(blank).toEqual([])
  })

  it('leaves no wiki markup in a description', () => {
    // The harvest strips templates, links, bold markers and HTML. Anything left
    // means a shape the cleaner did not know about.
    //
    // `style=` and a bare `|` are in this list because they were not, and 15
    // Pact descriptions shipped reading `style="text-align:left;" | All foes
    // deal bonus damage`. A spot-check caught it; this test did not.
    const dirty = described
      .filter((fact) =>
        /\{\{|\]\]|\[\[|'''|<[a-z/]|style\s*=|class\s*=|colspan|rowspan|\|/i.test(
          fact.description!,
        ),
      )
      .map((fact) => `${fact.id}: ${fact.description!.slice(0, 60)}`)
    expect(dirty).toEqual([])
  })

  it('starts every description with a capital letter, not with leftover syntax', () => {
    const odd = described
      .filter((fact) => !/^[A-Z(]/.test(fact.description!))
      .map((fact) => `${fact.id}: ${fact.description!.slice(0, 50)}`)
    expect(odd).toEqual([])
  })
})
