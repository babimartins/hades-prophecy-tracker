import { subjectCapabilities, subjectFacts, subjectProgress, subjectsOfType } from '@hades/engine'
import { describe, expect, it } from 'vitest'
import { dataset } from '../src/index.js'

describe('the subject axis against the real dataset', () => {
  it('gives every weapon the same five capabilities', () => {
    const expected = ['acquire', 'aspect', 'codex', 'enchant', 'escape']
    for (const weapon of subjectsOfType(dataset, 'weapon')) {
      expect([weapon.id, subjectCapabilities(dataset, weapon.id).sort()]).toEqual([
        weapon.id,
        expected,
      ])
      expect(subjectFacts(dataset, weapon.id)).toHaveLength(19)
    }
  })

  it('gives Zeus the five capabilities his tagged facts imply', () => {
    // `dialogue` is absent because the 18 `talk:` facts are among the 113 that
    // phase 2 still has to source. It appears once they carry a subject.
    expect(subjectCapabilities(dataset, 'zeus').sort()).toEqual([
      'affinity',
      'boons',
      'codex',
      'introduction',
      'invite',
    ])
  })

  it('never divides by zero, on any of the 119 subjects', () => {
    for (const subject of dataset.subjects) {
      const progress = subjectProgress(dataset, subject.id, {})
      expect(Number.isFinite(progress.ratio)).toBe(true)
      expect(progress.total).toBeGreaterThan(0)
    }
  })

  it('has no fact tagged with two subjects yet', () => {
    // The `subjects` field is an array for the 28 duo boons, which resolve in
    // phase 2. Until then no real fact exercises the second slot, so the
    // fixture in packages/engine is the only place that covers it. When this
    // test starts failing, phase 2 has done its job.
    const shared = dataset.facts.filter((fact) => (fact.subjects?.length ?? 0) > 1)
    expect(shared).toEqual([])
  })

  it('counts each tagged fact once per subject it names', () => {
    const summed = dataset.subjects.reduce(
      (running, subject) => running + subjectFacts(dataset, subject.id).length,
      0,
    )
    const tagged = dataset.facts.filter((fact) => (fact.subjects?.length ?? 0) > 0).length
    expect(tagged).toBe(501)
    expect(summed).toBe(501)
  })
})
