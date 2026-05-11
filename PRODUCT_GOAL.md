# DnD 5e Player Companion - Goal and Core Product Information

## Product Goal

Build a desktop companion app for a DnD 5e **player** (not a DM tool) that helps them quickly access and manage everything related to their character during live sessions.

The app should reduce friction by replacing:

- Flipping through PDFs
- Jumping across multiple browser tabs
- Repeatedly asking the DM for rule clarifications

Success means the player can make decisions faster, understand their current state instantly, and stay focused on gameplay.

## Core Objective

The app exists to help a player quickly answer three questions during play:

1. What is happening to my character right now?
2. What can I do right now?
3. What details do I need in this moment?

The experience must feel fast, intuitive, and frictionless under session pressure.

## Central Design Philosophy

Everything revolves around **one character** and one continuous experience:

- No separate "spells page," "conditions page," or "inventory page"
- No feeling of leaving the character context
- One unified Character View where all information and actions are integrated

## Entry Point: Character Selection

Before the Character View, the app presents a **Character Selection Screen**:

- Lists all saved characters with a name and class/level summary
- Allows creating a new character
- Once a character is selected, the app enters the unified Character View for that session
- This is the only screen outside of the Character View — all other interactions happen within the same view

Character state (HP, spell slots, conditions, resources) persists between sessions automatically.

### Character Creation

Character creation follows a simplified flow inspired by BG3:

- **Race** — select from available SRD races
- **Class** — select class and subclass
- **Background** — select background (grants skill proficiencies and starting features)
- **Ability scores** — distribute stats (standard array or point buy)
- **Starting spells and cantrips** — select from class spell list where applicable
- The flow is step-by-step and guided, not a form dump
- Equipment and inventory management are out of scope for creation

### Character File Storage

Each character is saved as its own **local file**. The file stores:

- Base character data (stats, class, spells, features)
- Runtime session state (current HP, used spell slots, active conditions, resources)

All persistence is file-based and local — no cloud sync, no database.

## Usage Context

The app is used in real-time, high-pressure gameplay. Design should optimize for:

- Minimal clicks
- No deep navigation
- Information visible now or available in one interaction

## Status Effect Display

Status effects and conditions are displayed **contextually near the relevant stat**, not in a single isolated list:

- An effect that modifies AC appears near the AC display
- An effect that modifies attacks appears near the attack section
- This keeps the player's attention close to where the decision is being made

## Target Device

Primary target is a **12" to 15" laptop or tablet screen**. The layout must be optimized for this range:

- No horizontal scrolling
- Comfortable font and touch targets for tablet use
- Efficient use of screen real estate without feeling cramped
- On touch devices, **expandable/collapsible sections replace hover** as the primary detail-reveal pattern. Tap expands; tap again collapses.

## Information Priority

Display priority should be:

1. **Immediate state**  
   Current HP, active effects, conditions, concentration, and other combat-relevant status.
2. **Available actions**  
   Spells, abilities, and options the player can use right now.
3. **Detailed reference on demand**  
   Full spell descriptions and rules text only when requested.

## Interaction Model

Primary interactions:

- Hover for quick info
- Click to expand inline details
- Toggle for on/off state changes
- Modals for focused detail or confirmation (e.g., full spell description, condition detail) — these are overlays within the same window, not new windows or tabs
- Hover tooltips trigger on **dwell** (mouse staying on an element), not on every pass-through

Avoid:

- Page navigation or tab switching
- New windows or browser tabs
- Blocking workflows that interrupt session flow
- Complex, form-heavy interactions during gameplay

## Mental Model

This should feel like a **game HUD**, not a document viewer.

The player should feel like they are controlling a character in real time, not browsing a rulebook.

## Interface Principles

The interface should be:

- Modern and responsive
- Fluid and continuous
- Free from hard transitions between views

Use patterns such as:

- Inline expansion
- Collapsible sections
- Hover previews
- Dynamic updates without reloads

## Discoverability and Speed

Players should be able to:

- Scan available actions quickly
- Find a spell in seconds
- Understand current status at a glance

Search and filtering are encouraged, but must feel instant.

## UI Tone

- Clean and readable
- Dense but not overwhelming
- Clarity over visual flair

## What to Avoid

- Treating spells, conditions, and inventory as separate apps/pages
- Overloading screens with long text by default
- Requiring the user to "manage data" instead of taking actions
- Any interaction that slows moment-to-moment gameplay
- Hard UI transitions (page loads, tab switches, route changes)

## Success Criteria

The product is successful if:

- A player decides their action faster than without the app
- Current character state is understandable instantly
- The player rarely leaves the main screen
- The interface feels smooth, modern, and uninterrupted
- It feels natural during real gameplay
