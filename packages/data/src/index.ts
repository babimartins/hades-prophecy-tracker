import { validateDataset, type Dataset } from '@hades/schema'
import aspectAchievements from './aspects/achievements.json'
import aspectFacts from './aspects/facts.json'
import boonAchievements from './boons/achievements.json'
import boonFacts from './boons/facts.json'
import codexAchievements from './codex/achievements.json'
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

/** The curated dataset. Validation runs at import time, so bad data fails fast. */
export const dataset: Dataset = validateDataset({
  collections,
  facts: [
    ...prophecyFacts,
    ...codexFacts,
    ...keepsakeFacts,
    ...aspectFacts,
    ...boonFacts,
    ...daedalusFacts,
    ...mirrorFacts,
    ...pactFacts,
    ...perkFacts,
  ],
  achievements: [
    ...prophecyAchievements,
    ...codexAchievements,
    ...keepsakeAchievements,
    ...aspectAchievements,
    ...boonAchievements,
    ...daedalusAchievements,
    ...mirrorAchievements,
    ...pactAchievements,
    ...perkAchievements,
  ],
})
