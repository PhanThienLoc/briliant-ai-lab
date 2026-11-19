# Source input methods checkpoint

The first wizard step exposes a pressed-state method selector: PDF/file, article URL, pasted text. Only the selected method's input controls and relevant limits appear. Optional citation metadata is disclosed separately for file/text. Existing source content remains visible and is preserved when switching methods; selecting a new file or approving a URL replacement uses the existing invalidation path. No file, storage, provider, or consent schema changed.

Validation: production build, TypeScript and authoring gates, 314 regression tests passed. Lint: zero errors, three existing warnings in generated types. Browser: file default, text switch, paste source, link switch preserving existing text, proceed to section selection. This pass did not upload a PDF through the browser, successfully fetch a live article, call AI with a real key, test Android, or complete multi-viewport QA.

The focused learning screen and remaining motion/performance work stay in the approved backlog.
