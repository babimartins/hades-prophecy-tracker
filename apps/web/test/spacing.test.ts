import { describe, expect, it } from 'vitest'

/**
 * Every gap, pad and margin comes from the scale.
 *
 * Before the scale the app used 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15,
 * 16, 20 and 22 pixels — very nearly every integer — so nothing lined up with
 * anything and the owner could see it from across the room. Contrast tests and
 * layout tests both passed the whole time; only a person looking at it caught
 * it, which is why this one reads the source.
 */
/**
 * Read through Vite rather than through `node:fs`. This file runs in the
 * browser project alongside the component tests, which has no node types.
 */
const SOURCES = import.meta.glob('../src/components/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const SPACING = /\b(padding|margin|gap)(-(?:top|bottom|left|right|block|inline))?:\s*([^;]+);/g

/**
 * Comments are stripped first. One of them quotes the old `padding: 0 20px`
 * to explain why it was wrong, and a scan that reads comments would report
 * the explanation as the offence.
 */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function sources(): { name: string; text: string }[] {
  return Object.entries(SOURCES).map(([path, text]) => ({
    name: path.split('/').pop() ?? path,
    text: withoutComments(text),
  }))
}

describe('the spacing scale', () => {
  it('finds spacing declarations to check, so an empty pass cannot look green', () => {
    const total = sources().reduce(
      (running, file) => running + [...file.text.matchAll(SPACING)].length,
      0,
    )
    expect(total).toBeGreaterThan(60)
  })

  it('writes no raw pixel spacing anywhere in a component', () => {
    const offenders: string[] = []
    for (const file of sources()) {
      for (const match of file.text.matchAll(SPACING)) {
        const value = match[3]!
        if (/\d+px/.test(value)) offenders.push(`${file.name}: ${match[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('uses only names the scale declares', () => {
    const allowed = new Set([
      '--hd-space-hair',
      '--hd-space-1',
      '--hd-space-2',
      '--hd-space-3',
      '--hd-space-4',
      '--hd-space-5',
      '--hd-space-6',
    ])
    const used = new Set<string>()
    for (const file of sources()) {
      for (const match of file.text.matchAll(/--hd-space-[a-z0-9]+/g)) used.add(match[0])
    }
    expect([...used].filter((name) => !allowed.has(name))).toEqual([])
    // and the scale is actually reached for, not declared and ignored
    expect(used.size).toBeGreaterThan(4)
  })
})
