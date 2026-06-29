Mental health practitioner. Prefers English for all .hermes skill files, agent configs, skill-bundles, and chat responses. All clinical content, summaries, and patient-facing output must be in English. Yolo mode: fast execution, skip excessive explanation, just build it. Verification gates (typecheck, lint, dev server) required before marking done.
§
Prefers nested route pages over modals for editing. Uses @mdxeditor/editor for rich markdown in clinical notes.
§
Hermes gateway on :8642 for AI features. Start: API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway. Key must be in Next.js .env. Hermes gateway proxies all model calls — NOT OpenRouter directly.
§
AI markdown: zero preamble, first char '#', simple elements (##/**, bullets, ---). No file paths, no 'Written to', no format talk in prompts—format rules in system prompt only. Files versioned to version/<type>-{ts}.md on overwrite.
§
MDXEditor: never next/dynamic, use useEffect mount guard + rAF mountedRef. Dark mode: aggressive !important CSS with [class*=''] attribute selectors, explicit oklch values. Inline editing (no modals) for Demographics + Consent.
§
Screenshots: Edge on secondary display, `screencapture -o -x -D2`, no desktop chrome. Scroll via AppleScript key codes 121/115/125. Multi-section pages get top+bottom captures. Embed inline: `![](screenshots/file.png)`.
§
Agent chat prompts: AUDIT pattern only (evaluate existing, never generate new). inject*Prompt() functions in agent-chat.tsx. Output: score, strengths, gaps, safety, revisions. Care Plan audits vs assessments; Session Note audits clinical content not template.
§
Video: edge-tts JennyNeural +3% +2Hz, ffmpeg AVFoundation display 2 libx264 crf 18. Logo intro/outro 3s each. Docs: all md have prev/next nav, logo links to https://youtu.be/8tiaDHI6uGo. No Python references — pure TS/Next.js.