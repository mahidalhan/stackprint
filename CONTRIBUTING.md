# Contributing

Run `npm test` and `npm run check` before opening a pull request.

Keep discovery metadata-only. New detectors should have fixture-based tests,
stable ordering, bounded output, and no network behavior. Do not add telemetry
or runtime dependencies without a clear security and maintenance rationale.

To add a known CLI, update `src/catalog.js`. Version detection must work through
a local, non-interactive `--version` call and emit only a numeric version.
