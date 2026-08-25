# BriliantAI Design System

## Design promise

BriliantAI is a thinking workbench, not a SaaS dashboard and not an AI chat wrapper. Every prominent visual must help the learner predict, manipulate, compare, explain, or retrieve knowledge.

The product combines three modes:

1. **Scientific notebook:** authored explanation, evidence, and sources.
2. **Interactive instrument:** changing an input immediately changes every linked representation.
3. **Mastery map:** progress is represented by evidence, not lesson completion.

## Interface rules

- The first viewport exposes one next-best learning action and a working model.
- Ask the learner to predict before revealing the result.
- Keep explanation and instrument in the same visual context.
- Show why an activity was selected and which mastery evidence is missing.
- Prefer lines, spacing, typography, and semantic color over generic cards and shadows.
- Use a component container only when its boundary has functional meaning.
- A dashboard metric must lead to a learning decision or move to a detail view.
- AI tutors elicit reasoning before telling; chat is never the default product shell.

## Visual language

| Role | Token | Value |
|---|---|---|
| Ink | `--ink` | `#17231f` |
| Paper | `--paper` | `#f4f1e8` |
| Brand | `--forest` | `#143f32` |
| Primary action | `--acid` | `#d7ef62` |
| Misconception | `--orange` | `#d96c45` |
| Experimental variable | `--blue` | `#5478b6` |
| Control radius | `--radius-control` | `6px` |
| Panel radius | `--radius-panel` | `14px`, used sparingly |

- UI typography uses the system sans stack.
- Explanatory and conceptual headings use an editorial serif stack.
- Data, evidence labels, and code use a monospace stack.
- Motion communicates causality or state transition. Do not use `transition: all`.
- Respect `prefers-reduced-motion` and keep keyboard focus visible.

## Anti-template guardrails

Do not introduce:

- centered marketing heroes before the working surface;
- purple/blue decorative gradients, glow, or glassmorphism;
- grids of three identical feature cards;
- a single large radius and shadow applied to every container;
- generic Sparkles, Brain, Rocket, Shield, or Zap icons;
- fake metrics, testimonials, avatars, or activity feeds;
- decorative charts that do not change a learner decision;
- generic copy such as “unlock your potential”;
- a blank sandbox without a guided question.

## Reference lineage

- [Brilliant: Visual Algebra](https://blog.brilliant.org/visual-algebra/) — multiple representations of one concept.
- [Explorable Explanations](https://worrydream.com/ExplorableExplanations/) — text as a place to think, with guided manipulation.
- [TensorFlow Playground](https://playground.tensorflow.org/) — visible causal links between controls and model behavior.
- [Seeing Theory](https://seeing-theory.brown.edu/) — statistics made accessible through interactive visualization.
- [WCAG 2.2 focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) — visible keyboard focus.
- [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — operable touch targets.
- [WCAG 2.2 contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — readable text and controls.
