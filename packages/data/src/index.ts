import { validateDataset, type Dataset } from '@hades/schema'
import trophyAchievements from './achievements/achievements.json'
import trophyFacts from './achievements/facts.json'
import aspectAchievements from './aspects/achievements.json'
import aspectFacts from './aspects/facts.json'
import boonAchievements from './boons/achievements.json'
import boonFacts from './boons/facts.json'
import codexAchievements from './codex/achievements.json'
import contractorAchievements from './contractor/achievements.json'
import contractorFacts from './contractor/facts.json'
import codexFacts from './codex/facts.json'
import collections from './collections.json'
import daedalusAchievements from './daedalus/achievements.json'
import daedalusFacts from './daedalus/facts.json'
import keepsakeAchievements from './keepsakes/achievements.json'
import keepsakeFacts from './keepsakes/facts.json'
import mirrorAchievements from './mirror/achievements.json'
import mirrorFacts from './mirror/facts.json'
import pactAchievements from './pact/achievements.json'
import pactFacts from './pact/facts.json'
import perkAchievements from './perk/achievements.json'
import perkFacts from './perk/facts.json'
import prophecyAchievements from './prophecies/achievements.json'
import prophecyFacts from './prophecies/facts.json'
import subjects from './subjects.json'
import wellOfCharonAchievements from './well-of-charon/achievements.json'
import wellOfCharonFacts from './well-of-charon/facts.json'

/** The curated dataset. Validation runs at import time, so bad data fails fast. */
export const dataset: Dataset = validateDataset({
  collections,
  facts: [
    ...prophecyFacts,
    ...trophyFacts,
    ...codexFacts,
    ...contractorFacts,
    ...keepsakeFacts,
    ...aspectFacts,
    ...boonFacts,
    ...daedalusFacts,
    ...mirrorFacts,
    ...pactFacts,
    ...perkFacts,
    ...wellOfCharonFacts,
  ],
  subjects,
  achievements: [
    ...prophecyAchievements,
    ...trophyAchievements,
    ...codexAchievements,
    ...contractorAchievements,
    ...keepsakeAchievements,
    ...aspectAchievements,
    ...boonAchievements,
    ...daedalusAchievements,
    ...mirrorAchievements,
    ...pactAchievements,
    ...perkAchievements,
    ...wellOfCharonAchievements,
  ],
})
