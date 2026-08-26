# BriliantAI Design System

## Design promise

BriliantAI is a structured academic workspace for understanding AI, Data, algorithms, logic, and their mathematical foundations. The interface follows the supplied Scholaris template: quiet parchment surfaces, strong typographic hierarchy, compact controls, and evidence-based learning states.

## Product anatomy

1. **Learning Hub:** active topics, cognitive depth, aspect analysis, the next best learning action, and recent dialogues.
2. **Socratic Lab:** a split workspace that keeps guided inquiry and the learner's mental model visible together.
3. **Architect:** a knowledge map with grouped concepts and a focused deep-dive panel.
4. **Checklist:** mastery evidence broken down by aspect rather than lesson completion.

Desktop uses a fixed 300px navigation rail. Mobile replaces it with a compact top bar and persistent bottom navigation.

## Visual language

| Role | Token | Value |
|---|---|---|
| Parchment | `--surface` | `#fcf9f4` |
| Clean paper | `--surface-lowest` | `#ffffff` |
| Tonal panel | `--surface-low` | `#f6f3ee` |
| Container | `--surface-container` | `#f0ede9` |
| Raised tone | `--surface-high` | `#ebe8e3` |
| Primary ink | `--on-surface` | `#1c1c19` |
| Secondary ink | `--on-surface-variant` | `#45464d` |
| Border | `--outline-variant` | `#c6c6cd` |
| Active navy | `--primary-container` | `#131b2e` |
| Mastery emerald | `--secondary` | `#006c49` |
| Mastery highlight | `--secondary-container` | `#6cf8bb` |
| AI indigo | `--tertiary-container` | `#07006c` |
| AI highlight | `--tertiary-fixed` | `#e1e0ff` |
| Control radius | `--radius-control` | `4px` |
| Panel radius | `--radius-panel` | `8px` |

- Headings and explanatory content use **Source Serif 4**.
- Navigation, labels, and controls use **Hanken Grotesk**.
- Uppercase mono labels are reserved for taxonomy, state, and evidence metadata.
- Hierarchy comes from spacing, typography, borders, and tonal surfaces; shadows remain minimal.

## Interaction rules

- Ask for a prediction before revealing a result.
- Keep the explanation and manipulable model in one context.
- A mastery value must lead to supporting evidence or the next learning action.
- Socratic prompts elicit reasoning before presenting an explanation.
- Buttons keep a minimum 44px target and a visible keyboard focus state.
- Motion communicates state change, respects `prefers-reduced-motion`, and never uses `transition: all`.

## Fidelity guardrails

Do not introduce centered marketing heroes, glassmorphism, decorative gradients, glowing cards, oversized corner radii, heavy shadows, stock AI imagery, or generic feature grids. New screens should extend the same sidebar, paper surfaces, typography, navy active state, emerald mastery state, and indigo AI state.
