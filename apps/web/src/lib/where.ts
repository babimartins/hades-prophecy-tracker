/**
 * Where in the game you perform an action.
 *
 * The Next Steps view groups by this, because a ranked list of actions is not
 * a plan until it says where each one happens. Three places, which is what the
 * owner chose: what you buy from the Contractor, what you do around the House,
 * and what you do on a run.
 */
export type Place = 'contractor' | 'house' | 'run'

export const PLACE_LABEL: Readonly<Record<Place, string>> = {
  contractor: 'House Contractor',
  house: 'House of Hades',
  run: 'During a run',
}

export const PLACES: readonly Place[] = ['contractor', 'house', 'run']

/**
 * Every namespace is named here on purpose, with no default.
 *
 * A prefix rule with a fallback is how `contractor:renovation-tasks` was once
 * counted as one of the 164 Contractor jobs when it is the prophecy's 0-30
 * counter. `AGENTS.md` records that. A namespace added later fails the
 * integrity test instead of landing silently in the wrong block.
 */
const PLACE_BY_NAMESPACE: Readonly<Record<string, Place>> = {
  // Bought from the Contractor, in the House.
  contractor: 'contractor',
  lounge: 'contractor',
  workorder: 'contractor',

  // Done around the House, between runs.
  ambrosia: 'house',
  companion: 'house',
  favor: 'house',
  invite: 'house',
  lyre: 'house',
  nectar: 'house',
  perk: 'house',
  pet: 'house',
  talent: 'house',
  talk: 'house',

  // Done on a run. The Pact is set at the door but only pays out in the run,
  // and Charon's shop and the Well of Charon are both inside the Underworld.
  achievement: 'run',
  artifact: 'run',
  aspect: 'run',
  blessing: 'run',
  boon: 'run',
  catch: 'run',
  codex: 'run',
  combat: 'run',
  curse: 'run',
  daedalus: 'run',
  encounter: 'run',
  escape: 'run',
  fish: 'run',
  keepsake: 'run',
  meet: 'run',
  miniboss: 'run',
  pact: 'run',
  reach: 'run',
  spend: 'run',
  weapon: 'run',
  wellofcharon: 'run',
}

export function placeOf(factId: string): Place | undefined {
  return PLACE_BY_NAMESPACE[factId.split(':')[0] ?? '']
}

export { PLACE_BY_NAMESPACE }
