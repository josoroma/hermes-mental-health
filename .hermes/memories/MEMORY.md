Mental health practitioner. Prefers English for all .hermes skill files, agent configs, skill-bundles, and chat responses. All clinical content, summaries, and patient-facing output must be in English. Yolo mode: fast execution, skip excessive explanation, just build it. Verification gates (typecheck, lint, dev server) required before marking done.
§
Prefers nested route pages over modals for editing. Uses @mdxeditor/editor for rich markdown in clinical notes.
§
Hermes gateway on :8642 for AI features. Start: API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway. Key must be in Next.js .env. Hermes gateway proxies all model calls — NOT OpenRouter directly.
§
AI markdown: zero preamble, first char '#', simple elements (##/**, bullets, ---). No file paths, no 'Written to', no format talk in prompts—format rules in system prompt only. Files versioned to version/<type>-{ts}.md on overwrite.
§
Agent chat: inject*Prompt() in agent-chat.tsx (NOT lib/prompts.ts). AUDIT pattern — evaluate existing data, don't generate new. Structured output: score, strengths, gaps, safety, revisions. Session notes audit clinical CONTENT (symptom trajectory, treatment response) not template structure. Screenshots: Edge via screencapture -D2.
§
MDXEditor: never next/dynamic, use useEffect mount guard + rAF mountedRef. Dark mode: aggressive !important CSS with [class*=''] attribute selectors, explicit oklch values. Inline editing (no modals) for Demographics + Consent.
§
Prefers 'Audit' not 'Review' for clinical doc evaluation. Audit = evaluate existing against data, return score/strengths/gaps/revisions. Screenshots: Edge browser via screencapture -D2, multiple by page when below-fold, embed inline ![](screenshots/...).
§
Screenshots: use Edge browser on secondary display, capture via `screencapture -o -x -D2`. Never full-desktop captures. Navigate with `open -a "Microsoft Edge" <url>`, scroll with AppleScript key code 125/121/115. Multi-section pages get separate top+bottom captures.