# Hades Prophecy Tracker — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed dashboard that tracks the Fated List of Minor Prophecies down to each sub-item, with progress stored in the browser.

**Architecture:** A pnpm monorepo. `schema` defines the data model with Zod. `data` holds curated JSON. `engine` evaluates requirement trees with pure functions. `ui` holds generic Lit web components. `apps/web` joins them and owns persistence.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript (strict), Zod 4, Lit 3, Vite, Vitest (node and browser mode with Playwright), ESLint, Prettier, GitHub Actions, GitHub Pages.

## Global Constraints

- Node 22. The file `.nvmrc` holds `22`.
- Package manager is pnpm. Never run `npm install` or `yarn`.
- TypeScript runs in strict mode. `any` is not allowed in committed code.
- All code, comments, commit messages and documentation are in English.
- Internal packages use the `@hades/` scope and the `workspace:*` protocol.
- Internal packages resolve to their TypeScript source, not to `dist`. Vite and
  Vitest compile the source. A filtered test command therefore needs no build
  first. `tsc -b` still runs in `typecheck` and `build` to check types.
- ES modules only. Every relative import ends with `.js`.
- Every package with tests carries a `tsconfig.test.json` that extends its
  `tsconfig.json`, includes `src` and `test`, and emits nothing. The package
  `typecheck` script runs both projects: `tsc -b && tsc -p tsconfig.test.json`.
  Without it, `tsc` never reads the test files and a `@ts-expect-error` in a
  test becomes a dead annotation.
- `packages/engine` must not import a DOM type or an I/O module.
- `packages/ui` must not import `@hades/data` or `@hades/schema`.
- The deploy target is GitHub Pages under the path `/hades-prophecy-tracker/`.
- Commit after every task. One commit per task.

---

### Task 1: Monorepo foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `.prettierrc.json`
- Create: `eslint.config.js`

**Interfaces:**
- Consumes: nothing.
- Produces: root scripts `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Every later package extends `tsconfig.base.json`.

- [ ] **Step 1: Create the workspace files**

`.nvmrc`:
```
22
```

`.gitignore`:
```
node_modules/
dist/
.turbo/
coverage/
*.tsbuildinfo
.DS_Store
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

`package.json`:
```json
{
  "name": "hades-prophecy-tracker",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "build": "turbo run build",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "eslint": "^9.13.0",
    "prettier": "^3.3.3",
    "turbo": "^2.2.3",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.11.0"
  }
}
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "experimentalDecorators": false,
    "useDefineForClassFields": false
  }
}
```

Note: `useDefineForClassFields` must stay `false`. Lit decorators break when it is `true`.

`.prettierrc.json`:
```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

`eslint.config.js`:
```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
)
```

- [ ] **Step 2: Install and verify**

Run:
```bash
pnpm install
pnpm lint
```
Expected: install succeeds. `turbo run lint` reports no packages with a `lint` task and exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: set up pnpm monorepo with turbo, typescript, eslint and prettier"
```

---

### Task 2: Schema package

**Files:**
- Create: `packages/schema/package.json`
- Create: `packages/schema/tsconfig.json`
- Create: `packages/schema/src/collection.ts`
- Create: `packages/schema/src/fact.ts`
- Create: `packages/schema/src/requirement.ts`
- Create: `packages/schema/src/achievement.ts`
- Create: `packages/schema/src/dataset.ts`
- Create: `packages/schema/src/index.ts`
- Test: `packages/schema/test/schema.test.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json` from Task 1.
- Produces:
  - `type FactId = string`, `factIdSchema`
  - `type Fact = { id: FactId; label: string; kind: 'boolean' | 'number'; max?: number; collection: string }`
  - `type Requirement` with node kinds `all`, `any`, `count`, `atLeast`
  - `type RequirementChild = FactId | Requirement`
  - `type Achievement = { id: string; name: string; description: string; collection: string; requirement: Requirement }`
  - `type Collection = { id: string; name: string }`
  - `type Dataset = { collections: Collection[]; facts: Fact[]; achievements: Achievement[] }`
  - `datasetSchema`, `validateDataset(input: unknown): Dataset`

- [ ] **Step 1: Create the package files**

`packages/schema/package.json`:
```json
{
  "name": "@hades/schema",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --noEmit false",
    "test": "vitest run",
    "lint": "eslint src test"
  },
  "dependencies": { "zod": "^4.0.0" },
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^3.0.0" }
}
```

`packages/schema/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/schema/test/schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { validateDataset } from '../src/index.js'

const validDataset = {
  collections: [{ id: 'prophecy', name: 'Fated List of Minor Prophecies' }],
  facts: [
    { id: 'nectar:dusa', label: 'Give Nectar to Dusa', kind: 'boolean', collection: 'prophecy' },
    {
      id: 'pact:extreme-measures',
      label: 'Extreme Measures',
      kind: 'number',
      max: 4,
      collection: 'prophecy',
    },
  ],
  achievements: [
    {
      id: 'prophecy:example',
      name: 'Example',
      description: 'An example prophecy.',
      collection: 'prophecy',
      requirement: {
        kind: 'all',
        of: ['nectar:dusa', { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 }],
      },
    },
  ],
}

describe('validateDataset', () => {
  it('accepts a valid dataset', () => {
    const result = validateDataset(validDataset)
    expect(result.achievements[0]?.name).toBe('Example')
  })

  it('rejects a fact id with a bad shape', () => {
    const bad = structuredClone(validDataset)
    bad.facts[0]!.id = 'Nectar Dusa'
    expect(() => validateDataset(bad)).toThrow()
  })

  it('rejects an unknown node kind', () => {
    const bad = structuredClone(validDataset)
    // @ts-expect-error deliberate invalid input
    bad.achievements[0].requirement = { kind: 'most', of: ['nectar:dusa'] }
    expect(() => validateDataset(bad)).toThrow()
  })

  it('rejects a count node without n', () => {
    const bad = structuredClone(validDataset)
    // @ts-expect-error deliberate invalid input
    bad.achievements[0].requirement = { kind: 'count', of: ['nectar:dusa'] }
    expect(() => validateDataset(bad)).toThrow()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @hades/schema test`
Expected: FAIL. The module `../src/index.js` does not exist.

- [ ] **Step 4: Write the implementation**

`packages/schema/src/collection.ts`:
```ts
import { z } from 'zod'

export const collectionIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)

export const collectionSchema = z.object({
  id: collectionIdSchema,
  name: z.string().min(1),
})

export type Collection = z.infer<typeof collectionSchema>
```

`packages/schema/src/fact.ts`:
```ts
import { z } from 'zod'
import { collectionIdSchema } from './collection.js'

/** A fact id has colon separated segments, for example `aspect:varatha:guan-yu`. */
export const factIdSchema = z.string().regex(/^[a-z0-9]+(:[a-z0-9-]+)+$/)

export type FactId = string

export const factSchema = z.object({
  id: factIdSchema,
  label: z.string().min(1),
  kind: z.enum(['boolean', 'number']),
  max: z.number().int().positive().optional(),
  collection: collectionIdSchema,
})

export type Fact = z.infer<typeof factSchema>
```

`packages/schema/src/requirement.ts`:
```ts
import { z } from 'zod'
import { factIdSchema, type FactId } from './fact.js'

export type Requirement =
  | { kind: 'all'; of: RequirementChild[] }
  | { kind: 'any'; of: RequirementChild[] }
  | { kind: 'count'; of: RequirementChild[]; n: number }
  | { kind: 'atLeast'; fact: FactId; value: number }

export type RequirementChild = FactId | Requirement

export const requirementSchema: z.ZodType<Requirement> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('all'), of: z.array(requirementChildSchema).min(1) }),
    z.object({ kind: z.literal('any'), of: z.array(requirementChildSchema).min(1) }),
    z.object({
      kind: z.literal('count'),
      of: z.array(requirementChildSchema).min(1),
      n: z.number().int().positive(),
    }),
    z.object({
      kind: z.literal('atLeast'),
      fact: factIdSchema,
      value: z.number().int().positive(),
    }),
  ]),
)

export const requirementChildSchema: z.ZodType<RequirementChild> = z.lazy(() =>
  z.union([factIdSchema, requirementSchema]),
)

export function isFactChild(child: RequirementChild): child is FactId {
  return typeof child === 'string'
}
```

`packages/schema/src/achievement.ts`:
```ts
import { z } from 'zod'
import { collectionIdSchema } from './collection.js'
import { requirementSchema } from './requirement.js'

export const achievementSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(:[a-z0-9-]+)+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  collection: collectionIdSchema,
  requirement: requirementSchema,
})

export type Achievement = z.infer<typeof achievementSchema>
```

`packages/schema/src/dataset.ts`:
```ts
import { z } from 'zod'
import { achievementSchema } from './achievement.js'
import { collectionSchema } from './collection.js'
import { factSchema } from './fact.js'

export const datasetSchema = z.object({
  collections: z.array(collectionSchema).min(1),
  facts: z.array(factSchema),
  achievements: z.array(achievementSchema),
})

export type Dataset = z.infer<typeof datasetSchema>

/** Parses and returns the dataset. Throws a ZodError when the input is invalid. */
export function validateDataset(input: unknown): Dataset {
  return datasetSchema.parse(input)
}
```

`packages/schema/src/index.ts`:
```ts
export * from './achievement.js'
export * from './collection.js'
export * from './dataset.js'
export * from './fact.js'
export * from './requirement.js'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @hades/schema test`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(schema): add fact and requirement model with zod validation"
```

---

### Task 3: Engine — requirement evaluation

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/src/facts.ts`
- Create: `packages/engine/src/evaluate.ts`
- Create: `packages/engine/src/index.ts`
- Test: `packages/engine/test/evaluate.test.ts`

**Interfaces:**
- Consumes: `Requirement`, `RequirementChild`, `FactId` from `@hades/schema`.
- Produces:
  - `type FactValue = boolean | number`
  - `type FactMap = Readonly<Record<FactId, FactValue | undefined>>`
  - `interface Evaluation { done: number; total: number; missing: FactId[] }`
  - `evaluate(node: RequirementChild, facts: FactMap): Evaluation`
  - `isSatisfied(factId: FactId, facts: FactMap): boolean`
  - `collectFactIds(node: RequirementChild): FactId[]`

- [ ] **Step 1: Create the package files**

`packages/engine/package.json`:
```json
{
  "name": "@hades/engine",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --noEmit false",
    "test": "vitest run",
    "lint": "eslint src test"
  },
  "dependencies": { "@hades/schema": "workspace:*" },
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^3.0.0" }
}
```

`packages/engine/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"],
  "references": [{ "path": "../schema" }]
}
```

- [ ] **Step 2: Write the failing test**

`packages/engine/test/evaluate.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { evaluate } from '../src/index.js'

describe('evaluate', () => {
  it('counts a single unmet fact', () => {
    expect(evaluate('nectar:dusa', {})).toEqual({ done: 0, total: 1, missing: ['nectar:dusa'] })
  })

  it('counts a single met fact', () => {
    expect(evaluate('nectar:dusa', { 'nectar:dusa': true })).toEqual({
      done: 1,
      total: 1,
      missing: [],
    })
  })

  it('treats a positive number fact as met', () => {
    expect(evaluate('aspect:varatha:guan-yu', { 'aspect:varatha:guan-yu': 3 }).done).toBe(1)
  })

  it('treats a zero number fact as unmet', () => {
    expect(evaluate('aspect:varatha:guan-yu', { 'aspect:varatha:guan-yu': 0 }).done).toBe(0)
  })

  it('sums an all node', () => {
    const node = { kind: 'all', of: ['a:one', 'a:two', 'a:three'] } as const
    expect(evaluate(node, { 'a:one': true })).toEqual({
      done: 1,
      total: 3,
      missing: ['a:two', 'a:three'],
    })
  })

  it('completes an any node when one child is met', () => {
    const node = { kind: 'any', of: ['a:one', 'a:two'] } as const
    expect(evaluate(node, { 'a:two': true })).toEqual({ done: 1, total: 1, missing: [] })
  })

  it('lists every child of an unmet any node as missing', () => {
    const node = { kind: 'any', of: ['a:one', 'a:two'] } as const
    expect(evaluate(node, {})).toEqual({ done: 0, total: 1, missing: ['a:one', 'a:two'] })
  })

  it('caps a count node at n', () => {
    const node = { kind: 'count', of: ['a:one', 'a:two', 'a:three'], n: 2 } as const
    const facts = { 'a:one': true, 'a:two': true, 'a:three': true }
    expect(evaluate(node, facts)).toEqual({ done: 2, total: 2, missing: [] })
  })

  it('reports the remaining children of an incomplete count node', () => {
    const node = { kind: 'count', of: ['a:one', 'a:two', 'a:three'], n: 2 } as const
    expect(evaluate(node, { 'a:one': true })).toEqual({
      done: 1,
      total: 2,
      missing: ['a:two', 'a:three'],
    })
  })

  it('measures an atLeast node against the threshold', () => {
    const node = { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 } as const
    expect(evaluate(node, { 'pact:extreme-measures': 3 })).toEqual({
      done: 3,
      total: 4,
      missing: ['pact:extreme-measures'],
    })
  })

  it('caps an atLeast node at the threshold', () => {
    const node = { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 } as const
    expect(evaluate(node, { 'pact:extreme-measures': 9 })).toEqual({
      done: 4,
      total: 4,
      missing: [],
    })
  })

  it('evaluates nested nodes', () => {
    const node = {
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two', 'a:three'] }],
    } as const
    expect(evaluate(node, { 'a:three': true })).toEqual({
      done: 1,
      total: 2,
      missing: ['a:one'],
    })
  })

  it('does not repeat a fact id in missing', () => {
    const node = { kind: 'all', of: ['a:one', 'a:one'] } as const
    expect(evaluate(node, {}).missing).toEqual(['a:one'])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @hades/engine test`
Expected: FAIL. The module `../src/index.js` does not exist.

- [ ] **Step 4: Write the implementation**

`packages/engine/src/facts.ts`:
```ts
import type { FactId, RequirementChild } from '@hades/schema'
import { isFactChild } from '@hades/schema'

export type FactValue = boolean | number

export type FactMap = Readonly<Record<FactId, FactValue | undefined>>

/** A boolean fact counts when true. A number fact counts when greater than zero. */
export function isSatisfied(factId: FactId, facts: FactMap): boolean {
  const value = facts[factId]
  if (typeof value === 'number') return value > 0
  return value === true
}

/** Reads a fact as a number. A true boolean reads as 1. A missing fact reads as 0. */
export function numericValue(factId: FactId, facts: FactMap): number {
  const value = facts[factId]
  if (typeof value === 'number') return value
  return value === true ? 1 : 0
}

/** Returns every fact id used in the node, in order, without repeats. */
export function collectFactIds(node: RequirementChild): FactId[] {
  const found: FactId[] = []
  walk(node, found)
  return unique(found)
}

function walk(node: RequirementChild, found: FactId[]): void {
  if (isFactChild(node)) {
    found.push(node)
    return
  }
  if (node.kind === 'atLeast') {
    found.push(node.fact)
    return
  }
  for (const child of node.of) walk(child, found)
}

export function unique(ids: readonly FactId[]): FactId[] {
  return [...new Set(ids)]
}
```

`packages/engine/src/evaluate.ts`:
```ts
import { isFactChild, type FactId, type RequirementChild } from '@hades/schema'
import { isSatisfied, numericValue, unique, type FactMap } from './facts.js'

export interface Evaluation {
  /** Units completed. */
  done: number
  /** Units needed for completion. */
  total: number
  /** Fact ids that still block completion. */
  missing: FactId[]
}

export function evaluate(node: RequirementChild, facts: FactMap): Evaluation {
  if (isFactChild(node)) {
    return isSatisfied(node, facts)
      ? { done: 1, total: 1, missing: [] }
      : { done: 0, total: 1, missing: [node] }
  }

  switch (node.kind) {
    case 'all': {
      const results = node.of.map((child) => evaluate(child, facts))
      return {
        done: sum(results.map((r) => r.done)),
        total: sum(results.map((r) => r.total)),
        missing: unique(results.flatMap((r) => r.missing)),
      }
    }
    case 'any': {
      const results = node.of.map((child) => evaluate(child, facts))
      const met = results.some(isComplete)
      return met
        ? { done: 1, total: 1, missing: [] }
        : { done: 0, total: 1, missing: unique(results.flatMap((r) => r.missing)) }
    }
    case 'count': {
      const results = node.of.map((child) => evaluate(child, facts))
      const met = results.filter(isComplete).length
      const done = Math.min(met, node.n)
      return {
        done,
        total: node.n,
        missing:
          done >= node.n
            ? []
            : unique(results.filter((r) => !isComplete(r)).flatMap((r) => r.missing)),
      }
    }
    case 'atLeast': {
      const value = Math.min(numericValue(node.fact, facts), node.value)
      return {
        done: value,
        total: node.value,
        missing: value >= node.value ? [] : [node.fact],
      }
    }
  }
}

export function isComplete(result: Evaluation): boolean {
  return result.done >= result.total
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
```

`packages/engine/src/index.ts`:
```ts
export * from './evaluate.js'
export * from './facts.js'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @hades/engine test`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(engine): evaluate requirement trees against a fact map"
```

---

### Task 4: Engine — progress, impact and next steps

**Files:**
- Create: `packages/engine/src/progress.ts`
- Create: `packages/engine/src/next-steps.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/progress.test.ts`
- Test: `packages/engine/test/next-steps.test.ts`

**Interfaces:**
- Consumes: `evaluate`, `isComplete`, `collectFactIds`, `isSatisfied`, `FactMap` from Task 3.
- Produces:
  - `type Status = 'todo' | 'partial' | 'done'`
  - `interface AchievementProgress extends Evaluation { id: string; status: Status; ratio: number }`
  - `achievementProgress(achievement: Achievement, facts: FactMap): AchievementProgress`
  - `interface CollectionProgress { done: number; total: number; ratio: number }`
  - `interface OverallProgress extends CollectionProgress { byCollection: Record<string, CollectionProgress> }`
  - `overallProgress(dataset: Dataset, facts: FactMap): OverallProgress`
  - `impact(factId: FactId, dataset: Dataset): number`
  - `nextSteps(dataset: Dataset, facts: FactMap): FactId[]`

- [ ] **Step 1: Write the failing tests**

`packages/engine/test/progress.test.ts`:
```ts
import type { Achievement, Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { achievementProgress, overallProgress } from '../src/index.js'

const achievement: Achievement = {
  id: 'prophecy:example',
  name: 'Example',
  description: 'An example.',
  collection: 'prophecy',
  requirement: { kind: 'all', of: ['a:one', 'a:two'] },
}

const dataset: Dataset = {
  collections: [
    { id: 'prophecy', name: 'Prophecies' },
    { id: 'codex', name: 'Codex' },
  ],
  facts: [
    { id: 'a:one', label: 'One', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Two', kind: 'boolean', collection: 'prophecy' },
    { id: 'b:one', label: 'Three', kind: 'boolean', collection: 'codex' },
  ],
  achievements: [
    achievement,
    {
      id: 'codex:example',
      name: 'Codex example',
      description: 'Another example.',
      collection: 'codex',
      requirement: { kind: 'all', of: ['b:one'] },
    },
  ],
}

describe('achievementProgress', () => {
  it('reports todo when nothing is done', () => {
    const result = achievementProgress(achievement, {})
    expect(result.status).toBe('todo')
    expect(result.ratio).toBe(0)
    expect(result.id).toBe('prophecy:example')
  })

  it('reports partial when some of the work is done', () => {
    const result = achievementProgress(achievement, { 'a:one': true })
    expect(result.status).toBe('partial')
    expect(result.ratio).toBe(0.5)
    expect(result.missing).toEqual(['a:two'])
  })

  it('reports done when every fact is met', () => {
    const result = achievementProgress(achievement, { 'a:one': true, 'a:two': true })
    expect(result.status).toBe('done')
    expect(result.ratio).toBe(1)
  })
})

describe('overallProgress', () => {
  it('counts completed achievements, not facts', () => {
    const result = overallProgress(dataset, { 'a:one': true, 'a:two': true })
    expect(result).toMatchObject({ done: 1, total: 2, ratio: 0.5 })
  })

  it('splits progress by collection', () => {
    const result = overallProgress(dataset, { 'b:one': true })
    expect(result.byCollection['prophecy']).toEqual({ done: 0, total: 1, ratio: 0 })
    expect(result.byCollection['codex']).toEqual({ done: 1, total: 1, ratio: 1 })
  })

  it('reports a ratio of 0 for a collection with no achievements', () => {
    const empty: Dataset = { ...dataset, achievements: [] }
    expect(empty.collections.length).toBe(2)
    expect(overallProgress(empty, {})).toMatchObject({ done: 0, total: 0, ratio: 0 })
  })
})
```

`packages/engine/test/next-steps.test.ts`:
```ts
import type { Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { impact, nextSteps } from '../src/index.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  facts: [
    { id: 'a:shared', label: 'Shared', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:one', label: 'One', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Two', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:first',
      name: 'First',
      description: 'First.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:one'] },
    },
    {
      id: 'prophecy:second',
      name: 'Second',
      description: 'Second.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:two'] },
    },
  ],
}

describe('impact', () => {
  it('counts every achievement that uses the fact', () => {
    expect(impact('a:shared', dataset)).toBe(2)
    expect(impact('a:one', dataset)).toBe(1)
    expect(impact('a:absent', dataset)).toBe(0)
  })
})

describe('nextSteps', () => {
  it('ranks a shared fact above a single use fact', () => {
    expect(nextSteps(dataset, {})).toEqual(['a:shared', 'a:one', 'a:two'])
  })

  it('drops facts that are already met', () => {
    expect(nextSteps(dataset, { 'a:shared': true })).toEqual(['a:one', 'a:two'])
  })

  it('drops facts whose achievements are all complete', () => {
    const facts = { 'a:shared': true, 'a:one': true, 'a:two': true }
    expect(nextSteps(dataset, facts)).toEqual([])
  })

  it('breaks a tie by fact id', () => {
    expect(nextSteps(dataset, { 'a:shared': true })).toEqual(['a:one', 'a:two'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @hades/engine test`
Expected: FAIL. `achievementProgress`, `overallProgress`, `impact` and `nextSteps` are not exported.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/progress.ts`:
```ts
import type { Achievement, Dataset } from '@hades/schema'
import { evaluate, isComplete, type Evaluation } from './evaluate.js'
import type { FactMap } from './facts.js'

export type Status = 'todo' | 'partial' | 'done'

export interface AchievementProgress extends Evaluation {
  id: string
  status: Status
  /** Completion between 0 and 1. */
  ratio: number
}

export function achievementProgress(
  achievement: Achievement,
  facts: FactMap,
): AchievementProgress {
  const result = evaluate(achievement.requirement, facts)
  const ratio = result.total === 0 ? 0 : result.done / result.total
  const status: Status = ratio >= 1 ? 'done' : ratio > 0 ? 'partial' : 'todo'
  return { ...result, id: achievement.id, ratio, status }
}

export interface CollectionProgress {
  done: number
  total: number
  ratio: number
}

export interface OverallProgress extends CollectionProgress {
  byCollection: Record<string, CollectionProgress>
}

/** Counts completed achievements, overall and per collection. */
export function overallProgress(dataset: Dataset, facts: FactMap): OverallProgress {
  const byCollection: Record<string, CollectionProgress> = {}
  for (const collection of dataset.collections) {
    byCollection[collection.id] = { done: 0, total: 0, ratio: 0 }
  }

  let done = 0
  for (const achievement of dataset.achievements) {
    const complete = isComplete(evaluate(achievement.requirement, facts))
    const bucket = byCollection[achievement.collection]
    if (bucket) {
      bucket.total += 1
      if (complete) bucket.done += 1
    }
    if (complete) done += 1
  }

  for (const bucket of Object.values(byCollection)) {
    bucket.ratio = bucket.total === 0 ? 0 : bucket.done / bucket.total
  }

  const total = dataset.achievements.length
  return { done, total, ratio: total === 0 ? 0 : done / total, byCollection }
}
```

`packages/engine/src/next-steps.ts`:
```ts
import type { Dataset, FactId } from '@hades/schema'
import { evaluate, isComplete } from './evaluate.js'
import { collectFactIds, isSatisfied, type FactMap } from './facts.js'

/** Counts the achievements that reference the fact. */
export function impact(factId: FactId, dataset: Dataset): number {
  return dataset.achievements.filter((achievement) =>
    collectFactIds(achievement.requirement).includes(factId),
  ).length
}

/**
 * Returns the unmet facts of every incomplete achievement.
 * The order runs from the highest number of incomplete achievements to the
 * lowest. Facts with the same count are ordered by id.
 */
export function nextSteps(dataset: Dataset, facts: FactMap): FactId[] {
  const counts = new Map<FactId, number>()

  for (const achievement of dataset.achievements) {
    const result = evaluate(achievement.requirement, facts)
    if (isComplete(result)) continue
    for (const factId of collectFactIds(achievement.requirement)) {
      if (isSatisfied(factId, facts)) continue
      counts.set(factId, (counts.get(factId) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([factId]) => factId)
}
```

`packages/engine/src/index.ts` (replace the file):
```ts
export * from './evaluate.js'
export * from './facts.js'
export * from './next-steps.js'
export * from './progress.js'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @hades/engine test`
Expected: PASS, 24 tests in total for the package.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add progress, impact and next step ranking"
```

---

### Task 5: Data package with the prophecy dataset

**Files:**
- Create: `packages/data/package.json`
- Create: `packages/data/tsconfig.json`
- Create: `packages/data/src/collections.json`
- Create: `packages/data/src/prophecies/facts.json`
- Create: `packages/data/src/prophecies/achievements.json`
- Create: `packages/data/src/index.ts`
- Test: `packages/data/test/integrity.test.ts`

**Interfaces:**
- Consumes: `validateDataset`, `Dataset`, `collectFactIds`.
- Produces: `export const dataset: Dataset` from `@hades/data`.

**Source rule:** every name, description and requirement comes from the in-game
Fated List of Minor Prophecies, checked against the Hades Wiki page "Fated List
of Minor Prophecies". Write no entry from memory. When the wiki and the game
disagree, the game wins.

- [ ] **Step 1: Create the package files**

`packages/data/package.json`:
```json
{
  "name": "@hades/data",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --noEmit false",
    "test": "vitest run",
    "lint": "eslint src test"
  },
  "dependencies": { "@hades/schema": "workspace:*" },
  "devDependencies": {
    "@hades/engine": "workspace:*",
    "typescript": "^5.6.3",
    "vitest": "^3.0.0"
  }
}
```

`packages/data/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src", "src/**/*.json"],
  "references": [{ "path": "../schema" }]
}
```

- [ ] **Step 2: Write the failing integrity test**

`packages/data/test/integrity.test.ts`:
```ts
import { collectFactIds } from '@hades/engine'
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
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @hades/data test`
Expected: FAIL. The module `../src/index.js` does not exist.

- [ ] **Step 4: Write the loader**

`packages/data/src/index.ts`:
```ts
import { validateDataset, type Dataset } from '@hades/schema'
import collections from './collections.json'
import prophecyAchievements from './prophecies/achievements.json'
import prophecyFacts from './prophecies/facts.json'

/** The curated dataset. Validation runs at import time, so bad data fails fast. */
export const dataset: Dataset = validateDataset({
  collections,
  facts: [...prophecyFacts],
  achievements: [...prophecyAchievements],
})
```

`packages/data/src/collections.json`:
```json
[{ "id": "prophecy", "name": "Fated List of Minor Prophecies" }]
```

- [ ] **Step 5: Author the first three prophecies**

Open the Hades Wiki page "Fated List of Minor Prophecies". Pick the first three
entries of the in-game list. Copy the name and the description exactly. Break
each requirement into facts.

Naming rules for fact ids:
- Namespace first, then target: `nectar:dusa`, `aspect:varatha:guan-yu`,
  `pact:extreme-measures`, `duo:mirage-shot`, `weapon:coronacht`.
- Lower case, hyphen between words, colon between segments.
- One fact for one action in the game. Never one fact for a whole prophecy.

`packages/data/src/prophecies/facts.json` follows this shape:
```json
[
  { "id": "nectar:dusa", "label": "Give Nectar to Dusa", "kind": "boolean", "collection": "prophecy" },
  { "id": "pact:extreme-measures", "label": "Extreme Measures rank", "kind": "number", "max": 4, "collection": "prophecy" }
]
```

`packages/data/src/prophecies/achievements.json` follows this shape:
```json
[
  {
    "id": "prophecy:chthonic-colleagues",
    "name": "Chthonic Colleagues",
    "description": "Copy the in-game description here.",
    "collection": "prophecy",
    "requirement": { "kind": "all", "of": ["nectar:dusa", "nectar:hypnos"] }
  }
]
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @hades/data test`
Expected: PASS, 7 tests.

- [ ] **Step 7: Author the remaining prophecies in batches of ten**

Repeat for each batch:
1. Add the facts, then the achievements.
2. Run `pnpm --filter @hades/data test`.
3. Fix any failure before the next batch.
4. Commit the batch.

Use these node kinds:
- A list where every item is needed: `all`.
- A list where any one item works: `any`.
- "N of these": `count` with `n`.
- A rank or a level: `atLeast` over a number fact.

The in-game list holds 49 entries. Record the exact count in the commit message
of the last batch.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(data): add curated prophecy dataset with sub-item facts"
```

---

### Task 6: UI package with the first three components

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/tokens.css.ts`
- Create: `packages/ui/src/hd-progress.ts`
- Create: `packages/ui/src/hd-card.ts`
- Create: `packages/ui/src/hd-checklist-item.ts`
- Create: `packages/ui/src/index.ts`
- Test: `packages/ui/test/hd-progress.test.ts`
- Test: `packages/ui/test/hd-checklist-item.test.ts`

**Interfaces:**
- Consumes: nothing from other workspace packages. The UI package stays free of
  domain knowledge.
- Produces the custom elements:
  - `<hd-progress value="1" max="3" label="Progress">` with `role="progressbar"`.
  - `<hd-card>` with a `header` slot and a default slot.
  - `<hd-checklist-item label="…" ?checked>` which fires `hd-toggle` with
    `detail: { checked: boolean }`.

- [ ] **Step 1: Create the package files**

`packages/ui/package.json`:
```json
{
  "name": "@hades/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --noEmit false",
    "test": "vitest run",
    "lint": "eslint src test"
  },
  "dependencies": { "lit": "^3.2.0" },
  "devDependencies": {
    "@vitest/browser": "^3.0.0",
    "playwright": "^1.48.0",
    "typescript": "^5.6.3",
    "vitest": "^3.0.0"
  }
}
```

`packages/ui/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "experimentalDecorators": false,
    "useDefineForClassFields": false
  },
  "include": ["src"]
}
```

`packages/ui/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

Run once before the first browser test: `pnpm --filter @hades/ui exec playwright install chromium`.

- [ ] **Step 2: Write the failing tests**

`packages/ui/test/hd-progress.test.ts`:
```ts
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-progress.js'

describe('hd-progress', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('exposes the progressbar role with the current values', async () => {
    render(html`<hd-progress .value=${2} .max=${5} label="Prophecies"></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    const bar = element.shadowRoot!.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
    expect(bar.getAttribute('aria-valuemax')).toBe('5')
    expect(bar.getAttribute('aria-label')).toBe('Prophecies')
  })

  it('shows the ratio as a percentage', async () => {
    render(html`<hd-progress .value=${1} .max=${4}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('25%')
  })

  it('treats a max of zero as empty', async () => {
    render(html`<hd-progress .value=${0} .max=${0}></hd-progress>`, document.body)
    const element = document.querySelector('hd-progress')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('0%')
  })
})
```

`packages/ui/test/hd-checklist-item.test.ts`:
```ts
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/hd-checklist-item.js'

describe('hd-checklist-item', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('reflects the checked state on the checkbox', async () => {
    render(html`<hd-checklist-item label="Give Nectar to Dusa" checked></hd-checklist-item>`, document.body)
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input')!
    expect(input.checked).toBe(true)
    expect(element.shadowRoot!.textContent).toContain('Give Nectar to Dusa')
  })

  it('fires hd-toggle when the user clicks the checkbox', async () => {
    render(html`<hd-checklist-item label="Give Nectar to Dusa"></hd-checklist-item>`, document.body)
    const element = document.querySelector('hd-checklist-item')!
    await element.updateComplete
    const events: boolean[] = []
    element.addEventListener('hd-toggle', (event) => {
      events.push((event as CustomEvent<{ checked: boolean }>).detail.checked)
    })
    element.shadowRoot!.querySelector('input')!.click()
    expect(events).toEqual([true])
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @hades/ui test`
Expected: FAIL. The source modules do not exist.

- [ ] **Step 4: Write the components**

`packages/ui/src/tokens.css.ts`:
```ts
import { css } from 'lit'

/** Shared surface styles. A consumer overrides the custom properties. */
export const surface = css`
  :host {
    --hd-color-text: #f3ead9;
    --hd-color-muted: #a29684;
    --hd-color-surface: #1b1420;
    --hd-color-accent: #c8102e;
    --hd-color-done: #2f9e6f;
    --hd-radius: 8px;
    --hd-gap: 12px;
    color: var(--hd-color-text);
    font-family: system-ui, sans-serif;
  }
`
```

`packages/ui/src/hd-progress.ts`:
```ts
import { css, html, LitElement } from 'lit'
import { surface } from './tokens.css.js'

export class HdProgress extends LitElement {
  static override readonly styles = [
    surface,
    css`
      .track {
        background: rgba(255, 255, 255, 0.12);
        border-radius: var(--hd-radius);
        height: 10px;
        overflow: hidden;
      }
      .fill {
        background: var(--hd-color-accent);
        height: 100%;
        transition: width 160ms ease-out;
      }
      .fill[data-done='true'] {
        background: var(--hd-color-done);
      }
      .caption {
        color: var(--hd-color-muted);
        font-size: 0.8rem;
        margin-top: 4px;
      }
    `,
  ]

  static override readonly properties = {
    value: { type: Number },
    max: { type: Number },
    label: { type: String },
  }

  value = 0
  max = 0
  label = ''

  private get ratio(): number {
    return this.max <= 0 ? 0 : Math.min(this.value / this.max, 1)
  }

  override render() {
    const percent = Math.round(this.ratio * 100)
    return html`
      <div
        class="track"
        role="progressbar"
        aria-label=${this.label}
        aria-valuenow=${this.value}
        aria-valuemin="0"
        aria-valuemax=${this.max}
      >
        <div class="fill" data-done=${String(percent === 100)} style="width: ${percent}%"></div>
      </div>
      <p class="caption">${this.value} / ${this.max} (${percent}%)</p>
    `
  }
}

customElements.define('hd-progress', HdProgress)

declare global {
  interface HTMLElementTagNameMap {
    'hd-progress': HdProgress
  }
}
```

`packages/ui/src/hd-card.ts`:
```ts
import { css, html, LitElement } from 'lit'
import { surface } from './tokens.css.js'

export class HdCard extends LitElement {
  static override readonly styles = [
    surface,
    css`
      section {
        background: var(--hd-color-surface);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--hd-radius);
        padding: var(--hd-gap);
      }
      header {
        font-weight: 600;
        margin-bottom: var(--hd-gap);
      }
    `,
  ]

  override render() {
    return html`
      <section>
        <header><slot name="header"></slot></header>
        <slot></slot>
      </section>
    `
  }
}

customElements.define('hd-card', HdCard)

declare global {
  interface HTMLElementTagNameMap {
    'hd-card': HdCard
  }
}
```

`packages/ui/src/hd-checklist-item.ts`:
```ts
import { css, html, LitElement } from 'lit'
import { surface } from './tokens.css.js'

/** Fires `hd-toggle` with `detail: { checked: boolean }` on user input. */
export class HdChecklistItem extends LitElement {
  static override readonly styles = [
    surface,
    css`
      label {
        align-items: center;
        cursor: pointer;
        display: flex;
        gap: var(--hd-gap);
        padding: 6px 0;
      }
      input {
        accent-color: var(--hd-color-accent);
        height: 18px;
        width: 18px;
      }
      .badge {
        color: var(--hd-color-muted);
        font-size: 0.75rem;
        margin-left: auto;
      }
    `,
  ]

  static override readonly properties = {
    label: { type: String },
    checked: { type: Boolean, reflect: true },
    badge: { type: String },
  }

  label = ''
  checked = false
  badge = ''

  private onChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.checked = checked
    this.dispatchEvent(
      new CustomEvent('hd-toggle', { detail: { checked }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <label>
        <input type="checkbox" .checked=${this.checked} @change=${this.onChange} />
        <span>${this.label}</span>
        ${this.badge ? html`<span class="badge">${this.badge}</span>` : null}
      </label>
    `
  }
}

customElements.define('hd-checklist-item', HdChecklistItem)

declare global {
  interface HTMLElementTagNameMap {
    'hd-checklist-item': HdChecklistItem
  }
}
```

`packages/ui/src/index.ts`:
```ts
export * from './hd-card.js'
export * from './hd-checklist-item.js'
export * from './hd-progress.js'
export * from './tokens.css.js'
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @hades/ui test`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): add progress, card and checklist item web components"
```

---

### Task 7: Web application shell and progress storage

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/theme.css`
- Create: `apps/web/src/storage/progress-store.ts`
- Create: `apps/web/src/storage/indexeddb-store.ts`
- Create: `apps/web/src/storage/transfer.ts`
- Create: `apps/web/src/state/progress-state.ts`
- Test: `apps/web/test/indexeddb-store.test.ts`
- Test: `apps/web/test/transfer.test.ts`
- Test: `apps/web/test/progress-state.test.ts`

**Interfaces:**
- Consumes: `FactMap`, `FactValue` from `@hades/engine`.
- Produces:
  - `interface ProgressStore { load(): Promise<FactMap>; save(facts: FactMap): Promise<void> }`
  - `createIndexedDbStore(): ProgressStore`
  - `toTransfer(facts: FactMap): TransferFile` where
    `interface TransferFile { version: 1; facts: FactMap }`
  - `parseTransfer(input: unknown): FactMap`
  - `class ProgressState` with `facts: FactMap`, `setFact(id, value)`,
    `replaceAll(facts)`, `subscribe(listener): () => void`, `ready: Promise<void>`

- [ ] **Step 1: Create the application files**

`apps/web/package.json`:
```json
{
  "name": "@hades/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src test"
  },
  "dependencies": {
    "@hades/data": "workspace:*",
    "@hades/engine": "workspace:*",
    "@hades/schema": "workspace:*",
    "@hades/ui": "workspace:*",
    "idb": "^8.0.0",
    "lit": "^3.2.0"
  },
  "devDependencies": {
    "fake-indexeddb": "^6.0.0",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "useDefineForClassFields": false
  },
  "include": ["src", "test"]
}
```

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/hades-prophecy-tracker/',
  build: { target: 'es2022' },
})
```

`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node' },
})
```

`apps/web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hades Prophecy Tracker</title>
  </head>
  <body>
    <hades-dashboard></hades-dashboard>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`apps/web/src/theme.css`:
```css
:root {
  --hd-color-text: #f3ead9;
  --hd-color-muted: #a29684;
  --hd-color-surface: #1b1420;
  --hd-color-accent: #c8102e;
  --hd-color-done: #2f9e6f;
  color-scheme: dark;
}

body {
  background: #120d16;
  color: var(--hd-color-text);
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 24px;
}
```

- [ ] **Step 2: Write the failing tests**

`apps/web/test/transfer.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parseTransfer, toTransfer } from '../src/storage/transfer.js'

describe('transfer', () => {
  it('writes a versioned file', () => {
    expect(toTransfer({ 'nectar:dusa': true })).toEqual({
      version: 1,
      facts: { 'nectar:dusa': true },
    })
  })

  it('reads a versioned file', () => {
    expect(parseTransfer({ version: 1, facts: { 'nectar:dusa': true } })).toEqual({
      'nectar:dusa': true,
    })
  })

  it('rejects an unknown version', () => {
    expect(() => parseTransfer({ version: 2, facts: {} })).toThrow(/version/i)
  })

  it('rejects a fact value that is not boolean or number', () => {
    expect(() => parseTransfer({ version: 1, facts: { 'a:one': 'yes' } })).toThrow()
  })
})
```

`apps/web/test/indexeddb-store.test.ts`:
```ts
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createIndexedDbStore } from '../src/storage/indexeddb-store.js'

describe('createIndexedDbStore', () => {
  it('returns an empty map before the first save', async () => {
    const store = createIndexedDbStore('test-db-empty')
    expect(await store.load()).toEqual({})
  })

  it('round trips the fact map', async () => {
    const store = createIndexedDbStore('test-db-round-trip')
    await store.save({ 'nectar:dusa': true, 'pact:extreme-measures': 4 })
    expect(await store.load()).toEqual({ 'nectar:dusa': true, 'pact:extreme-measures': 4 })
  })
})
```

`apps/web/test/progress-state.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import type { ProgressStore } from '../src/storage/progress-store.js'
import { ProgressState } from '../src/state/progress-state.js'

function fakeStore(initial = {}): ProgressStore & { saved: unknown[] } {
  const saved: unknown[] = []
  return {
    saved,
    load: async () => initial,
    save: async (facts) => {
      saved.push(facts)
    },
  }
}

describe('ProgressState', () => {
  it('loads the stored facts', async () => {
    const state = new ProgressState(fakeStore({ 'a:one': true }))
    await state.ready
    expect(state.facts).toEqual({ 'a:one': true })
  })

  it('sets a fact and saves it', async () => {
    const store = fakeStore()
    const state = new ProgressState(store)
    await state.ready
    await state.setFact('a:one', true)
    expect(state.facts).toEqual({ 'a:one': true })
    expect(store.saved).toEqual([{ 'a:one': true }])
  })

  it('removes a fact set to false', async () => {
    const state = new ProgressState(fakeStore({ 'a:one': true }))
    await state.ready
    await state.setFact('a:one', false)
    expect(state.facts).toEqual({})
  })

  it('notifies subscribers on change', async () => {
    const state = new ProgressState(fakeStore())
    await state.ready
    const listener = vi.fn()
    const unsubscribe = state.subscribe(listener)
    await state.setFact('a:one', true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    await state.setFact('a:two', true)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @hades/web test`
Expected: FAIL. The storage and state modules do not exist.

- [ ] **Step 4: Write the implementation**

`apps/web/src/storage/progress-store.ts`:
```ts
import type { FactMap } from '@hades/engine'

/** Persistence boundary. A backend implementation replaces this later. */
export interface ProgressStore {
  load(): Promise<FactMap>
  save(facts: FactMap): Promise<void>
}
```

`apps/web/src/storage/indexeddb-store.ts`:
```ts
import type { FactMap } from '@hades/engine'
import { openDB, type IDBPDatabase } from 'idb'
import type { ProgressStore } from './progress-store.js'

const STORE_NAME = 'progress'
const RECORD_KEY = 'facts'

export function createIndexedDbStore(databaseName = 'hades-prophecy-tracker'): ProgressStore {
  let connection: Promise<IDBPDatabase> | undefined

  function db(): Promise<IDBPDatabase> {
    connection ??= openDB(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore(STORE_NAME)
      },
    })
    return connection
  }

  return {
    async load() {
      const value = await (await db()).get(STORE_NAME, RECORD_KEY)
      return (value as FactMap | undefined) ?? {}
    },
    async save(facts) {
      await (await db()).put(STORE_NAME, facts, RECORD_KEY)
    },
  }
}
```

`apps/web/src/storage/transfer.ts`:
```ts
import type { FactMap, FactValue } from '@hades/engine'

export interface TransferFile {
  version: 1
  facts: FactMap
}

export function toTransfer(facts: FactMap): TransferFile {
  return { version: 1, facts }
}

/** Reads an exported file. Throws when the shape or the version is wrong. */
export function parseTransfer(input: unknown): FactMap {
  if (typeof input !== 'object' || input === null) throw new Error('The file is not an object.')
  const file = input as { version?: unknown; facts?: unknown }
  if (file.version !== 1) throw new Error(`Unsupported file version: ${String(file.version)}`)
  if (typeof file.facts !== 'object' || file.facts === null) {
    throw new Error('The file has no facts object.')
  }

  const result: Record<string, FactValue> = {}
  for (const [key, value] of Object.entries(file.facts)) {
    if (typeof value !== 'boolean' && typeof value !== 'number') {
      throw new Error(`Bad value for fact ${key}.`)
    }
    result[key] = value
  }
  return result
}
```

`apps/web/src/state/progress-state.ts`:
```ts
import type { FactId } from '@hades/schema'
import type { FactMap, FactValue } from '@hades/engine'
import type { ProgressStore } from '../storage/progress-store.js'

type Listener = () => void

/** Holds the fact map in memory and writes every change to the store. */
export class ProgressState {
  readonly ready: Promise<void>

  #facts: FactMap = {}
  readonly #listeners = new Set<Listener>()

  constructor(private readonly store: ProgressStore) {
    this.ready = store.load().then((facts) => {
      this.#facts = facts
      this.#emit()
    })
  }

  get facts(): FactMap {
    return this.#facts
  }

  /** A value of `false` or `0` removes the fact, to keep the export small. */
  async setFact(id: FactId, value: FactValue): Promise<void> {
    const next: Record<string, FactValue> = { ...this.#facts } as Record<string, FactValue>
    if (value === false || value === 0) delete next[id]
    else next[id] = value
    this.#facts = next
    this.#emit()
    await this.store.save(next)
  }

  async replaceAll(facts: FactMap): Promise<void> {
    this.#facts = facts
    this.#emit()
    await this.store.save(facts)
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}
```

`apps/web/src/main.ts`:
```ts
import './theme.css'
import './components/hades-dashboard.js'
```

Note: `main.ts` fails to resolve until Task 8 creates the dashboard component.
That is expected. The tests in this task do not import `main.ts`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @hades/web test`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add progress store, transfer format and progress state"
```

---

### Task 8: Dashboard with collection cards and achievement list

**Files:**
- Create: `apps/web/src/components/hades-dashboard.ts`
- Create: `apps/web/src/components/achievement-list.ts`
- Create: `apps/web/src/components/state-controller.ts`
- Test: `apps/web/test/achievement-list.browser.test.ts`
- Modify: `apps/web/vitest.config.ts`

**Interfaces:**
- Consumes: `dataset` from `@hades/data`, `overallProgress`, `achievementProgress`
  from `@hades/engine`, `ProgressState` from Task 7, `hd-card` and `hd-progress`
  from `@hades/ui`.
- Produces:
  - `<hades-dashboard>`, the application root.
  - `<achievement-list .achievements=${Achievement[]} .facts=${FactMap}>`, which
    fires `achievement-open` with `detail: { id: string }`.
  - `class StateController` — a Lit reactive controller that re-renders a host
    when `ProgressState` changes.

- [ ] **Step 1: Add a browser project to the web test config**

Replace `apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['test/**/*.browser.test.ts'],
        },
      },
      {
        test: {
          name: 'browser',
          include: ['test/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
```

Add `@vitest/browser` and `playwright` to `apps/web/package.json` devDependencies,
both at the versions used in Task 6.

- [ ] **Step 2: Write the failing test**

`apps/web/test/achievement-list.browser.test.ts`:
```ts
import type { Achievement } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/achievement-list.js'

const achievements: Achievement[] = [
  {
    id: 'prophecy:first',
    name: 'First',
    description: 'First prophecy.',
    collection: 'prophecy',
    requirement: { kind: 'all', of: ['a:one', 'a:two'] },
  },
  {
    id: 'prophecy:second',
    name: 'Second',
    description: 'Second prophecy.',
    collection: 'prophecy',
    requirement: { kind: 'all', of: ['a:three'] },
  },
]

describe('achievement-list', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders one row per achievement with its progress', async () => {
    render(
      html`<achievement-list
        .achievements=${achievements}
        .facts=${{ 'a:one': true }}
      ></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const rows = element.shadowRoot!.querySelectorAll('li')
    expect(rows.length).toBe(2)
    expect(rows[0]!.textContent).toContain('First')
    expect(rows[0]!.textContent).toContain('1 / 2')
  })

  it('marks a completed achievement as done', async () => {
    render(
      html`<achievement-list .achievements=${achievements} .facts=${{ 'a:three': true }}></achievement-list>`,
      document.body,
    )
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const done = element.shadowRoot!.querySelectorAll('li[data-status="done"]')
    expect(done.length).toBe(1)
    expect(done[0]!.textContent).toContain('Second')
  })

  it('fires achievement-open on a row click', async () => {
    render(html`<achievement-list .achievements=${achievements} .facts=${{}}></achievement-list>`, document.body)
    const element = document.querySelector('achievement-list')!
    await element.updateComplete
    const ids: string[] = []
    element.addEventListener('achievement-open', (event) => {
      ids.push((event as CustomEvent<{ id: string }>).detail.id)
    })
    element.shadowRoot!.querySelector('li button')!.dispatchEvent(new MouseEvent('click'))
    expect(ids).toEqual(['prophecy:first'])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @hades/web test`
Expected: FAIL. The module `../src/components/achievement-list.js` does not exist.

- [ ] **Step 4: Write the components**

`apps/web/src/components/state-controller.ts`:
```ts
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { ProgressState } from '../state/progress-state.js'

/** Re-renders the host whenever the progress state changes. */
export class StateController implements ReactiveController {
  #unsubscribe: (() => void) | undefined

  constructor(
    private readonly host: ReactiveControllerHost,
    readonly state: ProgressState,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    this.#unsubscribe = this.state.subscribe(() => this.host.requestUpdate())
  }

  hostDisconnected(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
  }
}
```

`apps/web/src/components/achievement-list.ts`:
```ts
import { achievementProgress, type FactMap } from '@hades/engine'
import type { Achievement } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement } from 'lit'

/** Fires `achievement-open` with `detail: { id }` when the user opens a row. */
export class AchievementList extends LitElement {
  static override readonly styles = css`
    ul {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    button {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      display: grid;
      font: inherit;
      gap: 4px;
      padding: 8px;
      text-align: left;
      width: 100%;
    }
    button:focus-visible {
      outline: 2px solid var(--hd-color-accent, #c8102e);
    }
    li[data-status='done'] .name::after {
      content: ' ✓';
      color: var(--hd-color-done, #2f9e6f);
    }
    .name {
      font-weight: 600;
    }
  `

  static override readonly properties = {
    achievements: { type: Array },
    facts: { type: Object },
  }

  achievements: Achievement[] = []
  facts: FactMap = {}

  private open(id: string): void {
    this.dispatchEvent(
      new CustomEvent('achievement-open', { detail: { id }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <ul>
        ${this.achievements.map((achievement) => {
          const progress = achievementProgress(achievement, this.facts)
          return html`
            <li data-status=${progress.status}>
              <button type="button" @click=${() => this.open(achievement.id)}>
                <span class="name">${achievement.name}</span>
                <hd-progress
                  .value=${progress.done}
                  .max=${progress.total}
                  label=${achievement.name}
                ></hd-progress>
              </button>
            </li>
          `
        })}
      </ul>
    `
  }
}

customElements.define('achievement-list', AchievementList)

declare global {
  interface HTMLElementTagNameMap {
    'achievement-list': AchievementList
  }
}
```

`apps/web/src/components/hades-dashboard.ts`:
```ts
import { dataset } from '@hades/data'
import { overallProgress } from '@hades/engine'
import '@hades/ui'
import { css, html, LitElement } from 'lit'
import { ProgressState } from '../state/progress-state.js'
import { createIndexedDbStore } from '../storage/indexeddb-store.js'
import './achievement-list.js'
import { StateController } from './state-controller.js'

export class HadesDashboard extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
      margin: 0 auto;
      max-width: 900px;
    }
    h1 {
      font-size: 1.5rem;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin-bottom: 24px;
    }
  `

  readonly #controller = new StateController(this, new ProgressState(createIndexedDbStore()))

  override render() {
    const facts = this.#controller.state.facts
    const overall = overallProgress(dataset, facts)

    return html`
      <h1>Hades Prophecy Tracker</h1>
      <div class="grid">
        <hd-card>
          <span slot="header">Overall</span>
          <hd-progress
            .value=${overall.done}
            .max=${overall.total}
            label="Overall progress"
          ></hd-progress>
        </hd-card>
        ${dataset.collections.map((collection) => {
          const bucket = overall.byCollection[collection.id]
          return html`
            <hd-card>
              <span slot="header">${collection.name}</span>
              <hd-progress
                .value=${bucket?.done ?? 0}
                .max=${bucket?.total ?? 0}
                label=${collection.name}
              ></hd-progress>
            </hd-card>
          `
        })}
      </div>
      <achievement-list .achievements=${dataset.achievements} .facts=${facts}></achievement-list>
    `
  }
}

customElements.define('hades-dashboard', HadesDashboard)

declare global {
  interface HTMLElementTagNameMap {
    'hades-dashboard': HadesDashboard
  }
}
```

- [ ] **Step 5: Run the tests and the dev server**

Run: `pnpm --filter @hades/web test`
Expected: PASS, 13 tests in total for the application.

Run: `pnpm --filter @hades/web dev`
Expected: the dashboard opens and shows one card per collection and the list of
prophecies.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): render the dashboard with collection cards and achievement list"
```

---

### Task 9: Achievement detail with the sub-item checklist

**Files:**
- Create: `apps/web/src/components/achievement-detail.ts`
- Create: `apps/web/src/components/requirement-tree.ts`
- Modify: `apps/web/src/components/hades-dashboard.ts`
- Test: `apps/web/test/requirement-tree.browser.test.ts`

**Interfaces:**
- Consumes: `evaluate`, `isSatisfied`, `FactMap` from `@hades/engine`, `Fact`,
  `Requirement`, `RequirementChild`, `isFactChild` from `@hades/schema`,
  `hd-checklist-item` from `@hades/ui`.
- Produces:
  - `<requirement-tree .node=${RequirementChild} .facts=${FactMap} .factsById=${Map<string, Fact>}>`
    which fires `fact-toggle` with `detail: { id: string; value: boolean | number }`.
  - `<achievement-detail .achievement=${Achievement} .facts=${FactMap} .factsById=${Map<string, Fact>}>`.

- [ ] **Step 1: Write the failing test**

`apps/web/test/requirement-tree.browser.test.ts`:
```ts
import type { Fact, RequirementChild } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/requirement-tree.js'

const facts: Fact[] = [
  { id: 'a:one', label: 'Do the first thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:two', label: 'Do the second thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:rank', label: 'Reach rank', kind: 'number', max: 4, collection: 'prophecy' },
]
const factsById = new Map(facts.map((fact) => [fact.id, fact]))

function mount(node: RequirementChild, current: Record<string, boolean | number> = {}) {
  render(
    html`<requirement-tree .node=${node} .facts=${current} .factsById=${factsById}></requirement-tree>`,
    document.body,
  )
  return document.querySelector('requirement-tree')!
}

describe('requirement-tree', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders one checklist item per boolean fact with its label', async () => {
    const element = mount({ kind: 'all', of: ['a:one', 'a:two'] })
    await element.updateComplete
    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items.length).toBe(2)
    expect(items[0]!.getAttribute('label')).toBe('Do the first thing')
  })

  it('shows the node kind for a nested group', async () => {
    const element = mount({
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two'] }],
    })
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('Any of')
  })

  it('renders a number input for an atLeast node', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    expect(input.value).toBe('2')
    expect(input.max).toBe('4')
  })

  it('fires fact-toggle when the user checks an item', async () => {
    const element = mount({ kind: 'all', of: ['a:one'] })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const item = element.shadowRoot!.querySelector('hd-checklist-item')!
    await item.updateComplete
    item.shadowRoot!.querySelector('input')!.click()
    expect(detail).toEqual([{ id: 'a:one', value: true }])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @hades/web test`
Expected: FAIL. The module `../src/components/requirement-tree.js` does not exist.

- [ ] **Step 3: Write the components**

`apps/web/src/components/requirement-tree.ts`:
```ts
import { isSatisfied, numericValue, type FactMap } from '@hades/engine'
import type { Fact, RequirementChild } from '@hades/schema'
import { isFactChild } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement, type TemplateResult } from 'lit'

const GROUP_LABEL = {
  all: 'All of',
  any: 'Any of',
  count: 'At least',
} as const

/** Fires `fact-toggle` with `detail: { id, value }` when the user edits a fact. */
export class RequirementTree extends LitElement {
  static override readonly styles = css`
    .group {
      border-left: 2px solid rgba(255, 255, 255, 0.12);
      margin-left: 4px;
      padding-left: 12px;
    }
    .group-label {
      color: var(--hd-color-muted, #a29684);
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .rank {
      align-items: center;
      display: flex;
      gap: 8px;
      padding: 6px 0;
    }
    input[type='number'] {
      width: 4rem;
    }
  `

  static override readonly properties = {
    node: { type: Object },
    facts: { type: Object },
    factsById: { type: Object },
  }

  node: RequirementChild = { kind: 'all', of: [] }
  facts: FactMap = {}
  factsById: Map<string, Fact> = new Map()

  private emit(id: string, value: boolean | number): void {
    this.dispatchEvent(
      new CustomEvent('fact-toggle', { detail: { id, value }, bubbles: true, composed: true }),
    )
  }

  private labelFor(id: string): string {
    return this.factsById.get(id)?.label ?? id
  }

  private renderFact(id: string): TemplateResult {
    return html`
      <hd-checklist-item
        label=${this.labelFor(id)}
        ?checked=${isSatisfied(id, this.facts)}
        @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
          this.emit(id, event.detail.checked)}
      ></hd-checklist-item>
    `
  }

  private renderRank(id: string, max: number): TemplateResult {
    return html`
      <div class="rank">
        <label for=${`rank-${id}`}>${this.labelFor(id)}</label>
        <input
          id=${`rank-${id}`}
          type="number"
          min="0"
          max=${max}
          .value=${String(numericValue(id, this.facts))}
          @change=${(event: Event) =>
            this.emit(id, Number((event.target as HTMLInputElement).value))}
        />
        <span>/ ${max}</span>
      </div>
    `
  }

  private renderNode(node: RequirementChild): TemplateResult {
    if (isFactChild(node)) return this.renderFact(node)
    if (node.kind === 'atLeast') return this.renderRank(node.fact, node.value)

    const label = node.kind === 'count' ? `${GROUP_LABEL.count} ${node.n} of` : GROUP_LABEL[node.kind]
    return html`
      <div class="group">
        <p class="group-label">${label}</p>
        ${node.of.map((child) => this.renderNode(child))}
      </div>
    `
  }

  override render() {
    return this.renderNode(this.node)
  }
}

customElements.define('requirement-tree', RequirementTree)

declare global {
  interface HTMLElementTagNameMap {
    'requirement-tree': RequirementTree
  }
}
```

Note: the top level node of an achievement is always a group, so the tree starts
with a group label. A single fact child renders as one checklist item.

`apps/web/src/components/achievement-detail.ts`:
```ts
import { achievementProgress, type FactMap } from '@hades/engine'
import type { Achievement, Fact } from '@hades/schema'
import '@hades/ui'
import { css, html, LitElement } from 'lit'
import './requirement-tree.js'

export class AchievementDetail extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
    }
    p.description {
      color: var(--hd-color-muted, #a29684);
    }
    button.back {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      margin-bottom: 12px;
      padding: 6px 10px;
    }
  `

  static override readonly properties = {
    achievement: { type: Object },
    facts: { type: Object },
    factsById: { type: Object },
  }

  achievement: Achievement | undefined
  facts: FactMap = {}
  factsById: Map<string, Fact> = new Map()

  override render() {
    const achievement = this.achievement
    if (!achievement) return html`<p>Select a prophecy.</p>`
    const progress = achievementProgress(achievement, this.facts)

    return html`
      <button
        class="back"
        type="button"
        @click=${() =>
          this.dispatchEvent(new CustomEvent('detail-close', { bubbles: true, composed: true }))}
      >
        Back
      </button>
      <hd-card>
        <span slot="header">${achievement.name}</span>
        <p class="description">${achievement.description}</p>
        <hd-progress
          .value=${progress.done}
          .max=${progress.total}
          label=${achievement.name}
        ></hd-progress>
        <requirement-tree
          .node=${achievement.requirement}
          .facts=${this.facts}
          .factsById=${this.factsById}
        ></requirement-tree>
      </hd-card>
    `
  }
}

customElements.define('achievement-detail', AchievementDetail)

declare global {
  interface HTMLElementTagNameMap {
    'achievement-detail': AchievementDetail
  }
}
```

- [ ] **Step 4: Wire the detail view into the dashboard**

In `apps/web/src/components/hades-dashboard.ts`:

1. Add the imports:
```ts
import type { Fact } from '@hades/schema'
import './achievement-detail.js'
```

2. Add the state fields and the fact index inside the class:
```ts
  static override readonly properties = {
    openId: { state: true },
  }

  openId: string | undefined

  readonly #factsById: Map<string, Fact> = new Map(
    dataset.facts.map((fact) => [fact.id, fact]),
  )
```

3. Add the event handlers inside the class:
```ts
  private onOpen(event: CustomEvent<{ id: string }>): void {
    this.openId = event.detail.id
  }

  private onFactToggle(event: CustomEvent<{ id: string; value: boolean | number }>): void {
    void this.#controller.state.setFact(event.detail.id, event.detail.value)
  }
```

4. Replace the `achievement-list` line in `render()` with:
```ts
        ${this.openId
          ? html`
              <achievement-detail
                .achievement=${dataset.achievements.find((item) => item.id === this.openId)}
                .facts=${facts}
                .factsById=${this.#factsById}
                @fact-toggle=${this.onFactToggle}
                @detail-close=${() => (this.openId = undefined)}
              ></achievement-detail>
            `
          : html`
              <achievement-list
                .achievements=${dataset.achievements}
                .facts=${facts}
                @achievement-open=${this.onOpen}
              ></achievement-list>
            `}
```

- [ ] **Step 5: Run the tests and check the application**

Run: `pnpm --filter @hades/web test`
Expected: PASS, 17 tests in total for the application.

Run: `pnpm --filter @hades/web dev`
Expected: a click on a prophecy opens the detail. A click on a checkbox raises
the progress bar of the prophecy and of the overall card. A reload keeps the
state.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add achievement detail with a sub-item checklist"
```

---

### Task 10: Next steps panel, export and import

**Files:**
- Create: `apps/web/src/components/next-steps-panel.ts`
- Create: `apps/web/src/components/transfer-controls.ts`
- Modify: `apps/web/src/components/hades-dashboard.ts`
- Test: `apps/web/test/next-steps-panel.browser.test.ts`

**Interfaces:**
- Consumes: `nextSteps`, `impact` from `@hades/engine`, `toTransfer`,
  `parseTransfer` from Task 7, `ProgressState.replaceAll` from Task 7.
- Produces:
  - `<next-steps-panel .dataset=${Dataset} .facts=${FactMap} .limit=${number}>`
    which fires `fact-toggle` with `detail: { id: string; value: boolean | number }`.
  - `<transfer-controls .facts=${FactMap}>` which fires `facts-import` with
    `detail: { facts: FactMap }`.

- [ ] **Step 1: Write the failing test**

`apps/web/test/next-steps-panel.browser.test.ts`:
```ts
import type { Dataset } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/next-steps-panel.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  facts: [
    { id: 'a:shared', label: 'Shared step', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:one', label: 'Only step one', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Only step two', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:first',
      name: 'First',
      description: 'First.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:one'] },
    },
    {
      id: 'prophecy:second',
      name: 'Second',
      description: 'Second.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:two'] },
    },
  ],
}

describe('next-steps-panel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('lists the highest impact step first with its impact badge', async () => {
    render(
      html`<next-steps-panel .dataset=${dataset} .facts=${{}} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items[0]!.getAttribute('label')).toBe('Shared step')
    expect(items[0]!.getAttribute('badge')).toBe('2 prophecies')
  })

  it('respects the limit', async () => {
    render(
      html`<next-steps-panel .dataset=${dataset} .facts=${{}} .limit=${1}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelectorAll('hd-checklist-item').length).toBe(1)
  })

  it('shows a done message when nothing is pending', async () => {
    const facts = { 'a:shared': true, 'a:one': true, 'a:two': true }
    render(
      html`<next-steps-panel .dataset=${dataset} .facts=${facts} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('Nothing left')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @hades/web test`
Expected: FAIL. The module `../src/components/next-steps-panel.js` does not exist.

- [ ] **Step 3: Write the components**

`apps/web/src/components/next-steps-panel.ts`:
```ts
import { impact, nextSteps, type FactMap } from '@hades/engine'
import type { Dataset } from '@hades/schema'
import '@hades/ui'
import { html, LitElement } from 'lit'

/** Fires `fact-toggle` with `detail: { id, value }`. */
export class NextStepsPanel extends LitElement {
  static override readonly properties = {
    dataset: { type: Object },
    facts: { type: Object },
    limit: { type: Number },
  }

  dataset: Dataset = { collections: [], facts: [], achievements: [] }
  facts: FactMap = {}
  limit = 8

  override render() {
    const pending = nextSteps(this.dataset, this.facts).slice(0, this.limit)
    if (pending.length === 0) return html`<p>Nothing left to do. Every prophecy is complete.</p>`

    const labels = new Map(this.dataset.facts.map((fact) => [fact.id, fact.label]))
    return html`
      ${pending.map((id) => {
        const count = impact(id, this.dataset)
        return html`
          <hd-checklist-item
            label=${labels.get(id) ?? id}
            badge=${`${count} ${count === 1 ? 'prophecy' : 'prophecies'}`}
            @hd-toggle=${(event: CustomEvent<{ checked: boolean }>) =>
              this.dispatchEvent(
                new CustomEvent('fact-toggle', {
                  detail: { id, value: event.detail.checked },
                  bubbles: true,
                  composed: true,
                }),
              )}
          ></hd-checklist-item>
        `
      })}
    `
  }
}

customElements.define('next-steps-panel', NextStepsPanel)

declare global {
  interface HTMLElementTagNameMap {
    'next-steps-panel': NextStepsPanel
  }
}
```

Note: a number fact appears in this panel as a checkbox. A check writes `true`,
which counts as met but not as the full rank. The user sets the exact rank in the
achievement detail. Task 10 keeps this simple on purpose.

`apps/web/src/components/transfer-controls.ts`:
```ts
import type { FactMap } from '@hades/engine'
import { css, html, LitElement } from 'lit'
import { parseTransfer, toTransfer } from '../storage/transfer.js'

/** Fires `facts-import` with `detail: { facts }` after a successful import. */
export class TransferControls extends LitElement {
  static override readonly styles = css`
    .row {
      display: flex;
      gap: 8px;
    }
    button,
    label {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: 6px 10px;
    }
    input[type='file'] {
      display: none;
    }
    .error {
      color: var(--hd-color-accent, #c8102e);
    }
  `

  static override readonly properties = {
    facts: { type: Object },
    error: { state: true },
  }

  facts: FactMap = {}
  error = ''

  private exportFacts(): void {
    const blob = new Blob([JSON.stringify(toTransfer(this.facts), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'hades-progress.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  private async importFacts(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const facts = parseTransfer(JSON.parse(await file.text()))
      this.error = ''
      this.dispatchEvent(
        new CustomEvent('facts-import', { detail: { facts }, bubbles: true, composed: true }),
      )
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : 'The file is not readable.'
    } finally {
      input.value = ''
    }
  }

  override render() {
    return html`
      <div class="row">
        <button type="button" @click=${this.exportFacts}>Export</button>
        <label>
          Import
          <input type="file" accept="application/json" @change=${this.importFacts} />
        </label>
      </div>
      ${this.error ? html`<p class="error">${this.error}</p>` : null}
    `
  }
}

customElements.define('transfer-controls', TransferControls)

declare global {
  interface HTMLElementTagNameMap {
    'transfer-controls': TransferControls
  }
}
```

- [ ] **Step 4: Wire both into the dashboard**

In `apps/web/src/components/hades-dashboard.ts`:

1. Add the imports:
```ts
import './next-steps-panel.js'
import './transfer-controls.js'
```

2. Add the handler inside the class:
```ts
  private onImport(event: CustomEvent<{ facts: FactMap }>): void {
    void this.#controller.state.replaceAll(event.detail.facts)
  }
```
Add the type import at the top of the file:
```ts
import type { FactMap } from '@hades/engine'
```

3. Add two cards inside the `.grid` block of `render()`, after the collection
   cards:
```ts
        <hd-card>
          <span slot="header">Next steps</span>
          <next-steps-panel
            .dataset=${dataset}
            .facts=${facts}
            .limit=${8}
            @fact-toggle=${this.onFactToggle}
          ></next-steps-panel>
        </hd-card>
        <hd-card>
          <span slot="header">Backup</span>
          <transfer-controls .facts=${facts} @facts-import=${this.onImport}></transfer-controls>
        </hd-card>
```

- [ ] **Step 5: Run the tests and check the application**

Run: `pnpm --filter @hades/web test`
Expected: PASS, 20 tests in total for the application.

Run: `pnpm --filter @hades/web dev`
Expected: the next steps card lists the pending facts with the highest impact.
Export downloads a JSON file. Import of that file restores the same progress.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add next steps panel and progress export and import"
```

---

### Task 11: Global search

**Files:**
- Create: `packages/engine/src/search.ts`
- Modify: `packages/engine/src/index.ts`
- Create: `apps/web/src/components/search-box.ts`
- Modify: `apps/web/src/components/hades-dashboard.ts`
- Test: `packages/engine/test/search.test.ts`
- Test: `apps/web/test/search-box.browser.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `Achievement` from `@hades/schema`, `collectFactIds` from
  Task 3.
- Produces:
  - `searchAchievements(dataset: Dataset, query: string): Achievement[]`
  - `<search-box value="">` which fires `search-change` with
    `detail: { query: string }`.

- [ ] **Step 1: Write the failing engine test**

`packages/engine/test/search.test.ts`:
```ts
import type { Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { searchAchievements } from '../src/index.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  facts: [
    { id: 'nectar:dusa', label: 'Give Nectar to Dusa', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:other', label: 'Other step', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:colleagues',
      name: 'Chthonic Colleagues',
      description: 'Give Nectar to everyone.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['nectar:dusa'] },
    },
    {
      id: 'prophecy:other',
      name: 'Other prophecy',
      description: 'Something else.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:other'] },
    },
  ],
}

describe('searchAchievements', () => {
  it('returns every achievement for an empty query', () => {
    expect(searchAchievements(dataset, '   ').length).toBe(2)
  })

  it('matches the achievement name without case', () => {
    const result = searchAchievements(dataset, 'chthonic')
    expect(result.map((item) => item.id)).toEqual(['prophecy:colleagues'])
  })

  it('matches the label of a sub-item fact', () => {
    const result = searchAchievements(dataset, 'dusa')
    expect(result.map((item) => item.id)).toEqual(['prophecy:colleagues'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchAchievements(dataset, 'cerberus')).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @hades/engine test`
Expected: FAIL. `searchAchievements` is not exported.

- [ ] **Step 3: Write the search function**

`packages/engine/src/search.ts`:
```ts
import type { Achievement, Dataset } from '@hades/schema'
import { collectFactIds } from './facts.js'

/**
 * Filters achievements by name, by description, or by the label of any fact in
 * the requirement tree. An empty query returns every achievement.
 */
export function searchAchievements(dataset: Dataset, query: string): Achievement[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return dataset.achievements

  const labels = new Map(dataset.facts.map((fact) => [fact.id, fact.label.toLowerCase()]))

  return dataset.achievements.filter((achievement) => {
    if (achievement.name.toLowerCase().includes(needle)) return true
    if (achievement.description.toLowerCase().includes(needle)) return true
    return collectFactIds(achievement.requirement).some((factId) =>
      (labels.get(factId) ?? '').includes(needle),
    )
  })
}
```

Add the export to `packages/engine/src/index.ts`:
```ts
export * from './search.js'
```

- [ ] **Step 4: Run the engine test to verify it passes**

Run: `pnpm --filter @hades/engine test`
Expected: PASS, 28 tests in total for the package.

- [ ] **Step 5: Write the failing component test**

`apps/web/test/search-box.browser.test.ts`:
```ts
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/search-box.js'

describe('search-box', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('exposes a labelled search input', async () => {
    render(html`<search-box></search-box>`, document.body)
    const element = document.querySelector('search-box')!
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input')!
    expect(input.type).toBe('search')
    expect(input.getAttribute('aria-label')).toBe('Search prophecies')
  })

  it('fires search-change with the typed query', async () => {
    render(html`<search-box></search-box>`, document.body)
    const element = document.querySelector('search-box')!
    await element.updateComplete
    const queries: string[] = []
    element.addEventListener('search-change', (event) => {
      queries.push((event as CustomEvent<{ query: string }>).detail.query)
    })
    const input = element.shadowRoot!.querySelector('input')!
    input.value = 'dusa'
    input.dispatchEvent(new Event('input'))
    expect(queries).toEqual(['dusa'])
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter @hades/web test`
Expected: FAIL. The module `../src/components/search-box.js` does not exist.

- [ ] **Step 7: Write the component and wire it in**

`apps/web/src/components/search-box.ts`:
```ts
import { css, html, LitElement } from 'lit'

/** Fires `search-change` with `detail: { query }` on every keystroke. */
export class SearchBox extends LitElement {
  static override readonly styles = css`
    input {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: inherit;
      font: inherit;
      padding: 8px 10px;
      width: 100%;
    }
    input:focus-visible {
      outline: 2px solid var(--hd-color-accent, #c8102e);
    }
  `

  static override readonly properties = {
    value: { type: String },
  }

  value = ''

  private onInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value
    this.value = query
    this.dispatchEvent(
      new CustomEvent('search-change', { detail: { query }, bubbles: true, composed: true }),
    )
  }

  override render() {
    return html`
      <input
        type="search"
        aria-label="Search prophecies"
        placeholder="Search a prophecy or a step"
        .value=${this.value}
        @input=${this.onInput}
      />
    `
  }
}

customElements.define('search-box', SearchBox)

declare global {
  interface HTMLElementTagNameMap {
    'search-box': SearchBox
  }
}
```

In `apps/web/src/components/hades-dashboard.ts`:

1. Add the imports:
```ts
import { searchAchievements } from '@hades/engine'
import './search-box.js'
```

2. Add the state field to the `properties` block and to the class:
```ts
  static override readonly properties = {
    openId: { state: true },
    query: { state: true },
  }

  openId: string | undefined
  query = ''
```

3. Add the handler inside the class:
```ts
  private onSearch(event: CustomEvent<{ query: string }>): void {
    this.query = event.detail.query
    this.openId = undefined
  }
```

4. Add the search box above the list, and filter the list. Replace the
   `achievement-list` block of the `else` branch with:
```ts
              <search-box .value=${this.query} @search-change=${this.onSearch}></search-box>
              <achievement-list
                .achievements=${searchAchievements(dataset, this.query)}
                .facts=${facts}
                @achievement-open=${this.onOpen}
              ></achievement-list>
```

- [ ] **Step 8: Run the tests and check the application**

Run: `pnpm --filter @hades/web test`
Expected: PASS, 22 tests in total for the application.

Run: `pnpm --filter @hades/web dev`
Expected: typing `dusa` narrows the list to the prophecies that need a step about
Dusa.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: filter prophecies by name, description or sub-item label"
```

---

### Task 12: Continuous integration, deploy and repository documentation

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`
- Create: `LICENSE`
- Create: `packages/data/LICENSE`
- Create: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: the root scripts from Task 1.
- Produces: a green CI run on push and pull request, and a live site at
  `https://<user>.github.io/hades-prophecy-tracker/`.

- [ ] **Step 1: Write the CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
```

- [ ] **Step 2: Write the deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Write the repository documentation**

`README.md`:
```markdown
# Hades Prophecy Tracker

Track your progress in Hades (Supergiant Games, 2020) down to each sub-item of
each prophecy.

Live site: https://<user>.github.io/hades-prophecy-tracker/

## Why it exists

The in-game Fated List shows what is left, but not how much of each entry is
left. This tracker breaks every prophecy into single verifiable actions, and it
shares those actions between prophecies. You mark an action once, and every
prophecy that needs it advances.

## How it works

Progress is a map of facts:

```json
{ "nectar:dusa": true, "pact:extreme-measures": 4 }
```

A prophecy holds no progress. It holds an expression over facts, built from four
node kinds: `all`, `any`, `count` and `atLeast`. The engine evaluates the
expression and reports what is missing.

Your progress stays in your browser (IndexedDB). Use Export and Import to move it
between machines. There is no account and no server.

## Packages

| Package            | Responsibility                              |
| ------------------ | ------------------------------------------- |
| `packages/schema`  | Data model and Zod validation               |
| `packages/data`    | Curated JSON, the source of truth           |
| `packages/engine`  | Progress evaluation, pure functions         |
| `packages/ui`      | Generic web components (Lit)                |
| `apps/web`         | Dashboard and persistence                   |

## Development

```bash
pnpm install
pnpm --filter @hades/web dev
pnpm test
```

## Licence

Code: MIT. See `LICENSE`.

Game data: CC BY-SA 3.0, derived from the [Hades Wiki](https://hades.fandom.com/).
See `packages/data/LICENSE`.

This is a fan project. It has no link with Supergiant Games. Hades and all game
names are the property of Supergiant Games.
```

`LICENSE`: the MIT licence text, with the copyright line
`Copyright (c) 2026 Barbara Duarte`.

`packages/data/LICENSE`:
```markdown
# Data licence

The files in `packages/data/src` include information derived from the Hades Wiki
(https://hades.fandom.com/), used under CC BY-SA 3.0.

These data files are therefore published under CC BY-SA 3.0:
https://creativecommons.org/licenses/by-sa/3.0/

The rest of the repository uses the MIT licence.
```

`CONTRIBUTING.md`:
```markdown
# Contributing

## Data changes

1. Add or edit the JSON in `packages/data/src`.
2. Run `pnpm --filter @hades/data test`. The test checks the schema, duplicate
   ids, unknown fact references and orphan facts.
3. State the source of the change in the commit message.

Copy names and requirement text from the game or from the Hades Wiki. Do not
write an entry from memory.

## Code changes

1. Write the failing test first.
2. Run `pnpm lint`, `pnpm typecheck` and `pnpm test` before you commit.
3. Keep `packages/engine` free of DOM and I/O. Keep `packages/ui` free of game
   knowledge.
```

- [ ] **Step 4: Verify the full pipeline locally**

Run:
```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```
Expected: every step exits 0. The file `apps/web/dist/index.html` exists.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "ci: add verification and pages deploy workflows with project docs"
git push -u origin main
```

- [ ] **Step 6: Enable GitHub Pages**

In the repository settings, open Pages and set the source to GitHub Actions.
Then confirm that the Deploy workflow finishes and the site loads.

---

## Verification checklist for the whole slice

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test` pass from the repository root.
- [ ] The dataset holds every prophecy of the in-game Fated List, each with its sub-item facts.
- [ ] A checkbox click updates the prophecy card and the overall card at once.
- [ ] A shared fact advances every prophecy that uses it.
- [ ] A reload keeps the progress.
- [ ] Export writes a JSON file. Import of that file restores the same state.
- [ ] The next steps card ranks the pending facts by the number of prophecies they unlock.
- [ ] Search finds a prophecy by its name and by the label of one of its sub-items.
- [ ] The site loads from the GitHub Pages URL.
- [ ] The README states the MIT and CC BY-SA split and the fan project notice.
