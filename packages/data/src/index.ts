import { validateDataset, type Dataset } from '@hades/schema'
import aspectAchievements from './aspects/achievements.json'
import aspectFacts from './aspects/facts.json'
import codexAchievements from './codex/achievements.json'
import codexFacts from './codex/facts.json'
import collections from './collections.json'
import keepsakeAchievements from './keepsakes/achievements.json'
import keepsakeFacts from './keepsakes/facts.json'
import prophecyAchievements from './prophecies/achievements.json'
import prophecyFacts from './prophecies/facts.json'

/** The curated dataset. Validation runs at import time, so bad data fails fast. */
export const dataset: Dataset = validateDataset({
  collections,
  facts: [...prophecyFacts, ...codexFacts, ...keepsakeFacts, ...aspectFacts],
  achievements: [...prophecyAchievements, ...codexAchievements, ...keepsakeAchievements, ...aspectAchievements],
})
