/**
 * The one trophy awarded for earning every other trophy.
 *
 * Named by id because the game has exactly one of that shape, the way
 * `subject-labels.ts` names the nine Olympians.
 */
export const DERIVED_TROPHY = 'achievement:god-of-blood'

/**
 * The trophies that are a threshold over a pool the app already lists in full,
 * and where that pool lives.
 *
 * Every action they need is recorded somewhere the player can reach. Printing
 * the pool a second time here costs 845 more rows in one pane and tells them
 * nothing new, so each shows its roll-up and the way to its items instead. The
 * roll-up is the part that exists nowhere else: 0/50 of the 164 jobs.
 */
export const DERIVED_FROM: Readonly<Record<string, string>> = {
  [DERIVED_TROPHY]: 'the other 49 trophies on this list',
  'achievement:home-makeover': 'the six Contractor rooms on this rail',
  'achievement:blessed-by-the-gods': 'Collections, under Boons by type',
  'achievement:tools-of-the-architect': 'each weapon page, under Daedalus',
  'achievement:had-to-happen': 'the Fated List',
}
