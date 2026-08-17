import { validateDataset, type Dataset } from '@hades/schema'
import codexAchievements from './codex/achievements.json'
import codexFacts from './codex/facts.json'
import collections from './collections.json'
import prophecyAchievements from './prophecies/achievements.json'
import prophecyFacts from './prophecies/facts.json'

/** The curated dataset. Validation runs at import time, so bad data fails fast. */
export const dataset: Dataset = validateDataset({
  collections,
  facts: [...prophecyFacts, ...codexFacts],
  achievements: [...prophecyAchievements, ...codexAchievements],
})
