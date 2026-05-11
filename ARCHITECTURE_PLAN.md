# DnD Character Interface - Scalable Architecture Plan

## Why Move to React

For this app, React is a better long-term choice than plain HTML/vanilla JS because the product is:

- Highly interactive (hover previews, collapsible panels, toggles)
- State-heavy (character status, conditions, resources, active effects)
- Calculation-driven (derived stats and action availability)
- Expected to grow into a modular codebase

React makes component composition, state flow, and maintainability easier as complexity increases.

## Recommended Stack

- React + TypeScript
- Vite (fast development and build tooling)
- Electron (desktop app shell)
- Zustand (application state store)
- Zod (runtime validation for JSON data)

## Architecture Style

Use a hybrid of domain-driven and feature-based structure:

- `src/app`: app bootstrap, providers, shell
- `src/domain`: game rules and calculations (pure functions, no UI)
- `src/entities`: normalized data models and entity adapters
- `src/features`: user actions and state transitions
- `src/widgets`: composed Character View regions
- `src/shared`: reusable UI components, utilities, constants

Example:

- `src/app`
- `src/domain/rules`
- `src/entities/character`
- `src/entities/class`
- `src/entities/spell`
- `src/features/conditions`
- `src/features/combat-actions`
- `src/widgets/character-view`
- `src/shared/ui`
- `src/shared/lib`

## Core Product Rules (Non-negotiable)

1. Character is the single source of truth.
2. Single unified Character View (no separate pages for spells/conditions/inventory).
3. Use normalized data (character references IDs; entity content stored once).
4. Keep interactions fluid (hover, inline expand, collapsible sections, toggles).
5. Keep domain logic separate from rendering.

## State and Data Model Strategy

Character state stores references and runtime values:

- `character.classId`
- `character.spellIds`
- `character.conditionIds`
- `character.resources`
- `character.hitPoints`

Entity state stores full data dictionaries:

- `entities.classesById`
- `entities.spellsById`
- `entities.conditionsById`

No duplicated spell/class payload inside character records.

## Rule Engine Separation

Create a dedicated rules layer with pure functions:

- `computeAttackBonus(character, weapon)`
- `computeSpellSaveDC(character)`
- `getAvailableActions(character, combatState)`
- `applyCondition(character, condition)`

Rules layer should be framework-agnostic and unit-testable.

## Content Pipeline

Keep a two-step data pipeline:

1. `data/raw`: optional source payloads from import scripts
2. `public/data`: canonical in-project runtime database served by the app

The frontend consumes `public/data` directly.

## Offline-Only Data Policy

- The app never depends on remote APIs at runtime.
- All gameplay data is bundled or preloaded locally.
- Any sync/import step happens offline as a build-time or manual data refresh process.
- Runtime should work with no internet connection.

## Rule Display Philosophy

The app does **not** compute final action outcomes or do math for the player. It surfaces:

- All active effects, conditions, and statuses that are relevant
- What abilities/spells are available given current resources
- Full text descriptions on demand (in a modal overlay)

The player reads the information and applies it at the table. This keeps the rules layer simple and avoids modeling every exception interaction.

## Suggested Phases

1. Foundation
   - React + TypeScript + Electron scaffold
   - Store setup with normalized entities
2. Character Core
   - Unified Character View widgets
   - Status/resources/conditions interactions
3. Rules Engine v1
   - Combat and spellcasting derived calculations
4. Content Expansion
   - Add broader SRD datasets (spells, features, conditions)
5. Hardening
   - Unit tests for rules
   - Integration tests for key gameplay interactions

## Tooling Notes

- Zustand is optional; Redux Toolkit is a valid alternative if stronger conventions are preferred.
- Electron is optional if you decide to ship web-first first, then desktop later.
