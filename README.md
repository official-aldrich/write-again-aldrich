# Write Again

A public essay practice studio. No account or API key required.

## Included

- 16 applied lessons, from beginner paragraphs to admissions practice.
- 64 original topic prompts, plus 16 lesson writing tasks.
- Five ungraded warm-ups, custom topics, outlines, and a focus timer.
- English-language rubric estimates, quoted flags, and direct or gentle feedback.
- Review snapshots, revision notes, progress graphs, and lesson checkpoints.
- Browser saving and validated JSON import/export.

The reviewer checks visible text patterns. It cannot establish originality, sound reasoning, correct facts, complete grammar accuracy, or admission chances. Scores are practice estimates. Course completion does not certify proficiency.

## GitHub Pages

The `docs` folder is the complete static build. In Settings → Pages, choose **Deploy from a branch**, **main**, and **/docs**. No workflow, API key, server, or external font service is needed. Visitors need no GitHub account.

Browser data stays in the browser profile on that origin. Clearing browsing data removes it. Export work in Studio settings before clearing data or switching devices. To move from the original studio, export there and import the backup here; different websites do not share browser storage.

## Development

Install the dependencies in `package.json`, then run `npm run typecheck`, `npm test`, and `npm run build`. Commit `docs` after rebuilding. Asset paths are relative and navigation uses hashes, so the app works under a repository URL without server routing.
