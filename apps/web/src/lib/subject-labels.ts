import { dataset } from '@hades/data'
import { subjectCapabilities } from '@hades/engine'
import type { Subject } from '@hades/schema'

/** The Codex's own section names, as the game writes them. */
export const CODEX_SECTION_LABEL: Readonly<Record<string, string>> = {
  'chthonic-gods': 'Chthonic Gods',
  'olympian-gods': 'Olympian Gods',
  'others-of-note': 'Others of Note',
  fables: 'Fables',
  'perilous-foes': 'Perilous Foes',
  'the-underworld': 'The Underworld',
  'infernal-arms': 'Infernal Arms',
  artifacts: 'Artifacts',
  'river-denizens': 'River Denizens',
  character: 'Character',
  weapon: 'Weapon',
  collectible: 'Collectible',
  region: 'Region',
}

/**
 * A subject's Codex section, looked up **by id**.
 *
 * Never by name. Two Codex entries are both named "Chaos" — the deity in
 * Chthonic Gods and the realm in The Underworld — so a name-keyed map keeps
 * whichever came last and files the god under The Underworld. `AGENTS.md`
 * records this by name: qualify the id instead.
 *
 * The six weapons take their true name as their subject id while their Codex
 * entry uses the display name, so they are matched on the display name they
 * share. Persephone has no Codex entry at all and falls through to her type.
 */
const SECTION_BY_CODEX_ID = new Map(
  dataset.achievements
    .filter((achievement) => achievement.collection === 'codex')
    .map((achievement) => [achievement.id, achievement.section ?? '']),
)

const SECTION_BY_DISPLAY_NAME = new Map(
  dataset.achievements
    .filter((achievement) => achievement.collection === 'codex')
    .map((achievement) => [achievement.name, achievement.section ?? '']),
)

export function sectionOf(subject: Subject): string {
  const byId = SECTION_BY_CODEX_ID.get(`codex:${subject.id}`)
  const slug = byId ?? SECTION_BY_DISPLAY_NAME.get(subject.name) ?? ''
  return CODEX_SECTION_LABEL[slug] ?? ''
}

const OLYMPIANS = new Set([
  'zeus',
  'poseidon',
  'athena',
  'aphrodite',
  'ares',
  'artemis',
  'dionysus',
  'demeter',
  'hermes',
])

/**
 * The markers that survive, per the spec: a tag earns its place only if it
 * varies. Affinity, Keepsake and Codex hold for nearly every named character,
 * and the blocks below show them anyway.
 *
 * `companion` means two opposite things — a companion **is** one, its giver
 * **gives** one — and the engine's own comment says the interface must read
 * the subject's other capabilities to choose the word. It does, here.
 */
export function markersFor(subjectId: string): string[] {
  const capabilities = subjectCapabilities(dataset, subjectId)
  const markers: string[] = []
  if (OLYMPIANS.has(subjectId)) markers.push('Olympian')
  else if (capabilities.includes('boons')) markers.push('Grants boons')
  if (capabilities.includes('combat')) markers.push('Fightable')
  if (capabilities.includes('quest')) markers.push('Favor')
  if (capabilities.includes('companion')) {
    markers.push(subjectId.startsWith('companion-') ? 'Companion' : 'Gives a companion')
  }
  return markers
}

/** A weapon's subject id is its true name in lower case. */
export function displayId(subject: Subject): string {
  if (subject.type !== 'weapon') return subject.name
  return subject.id.charAt(0).toUpperCase() + subject.id.slice(1)
}
