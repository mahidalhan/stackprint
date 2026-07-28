# Contributing

Run `npm test` and `npm run check` before opening a pull request.

Keep discovery metadata-only. New detectors should have fixture-based tests,
stable ordering, bounded output, and no network behavior. Do not add telemetry
or runtime dependencies without a clear security and maintenance rationale.

To add a known CLI, update `src/catalog.js`. Version detection must work through
a local, non-interactive `--version` call and emit only a numeric version.

## Public-evidence atlas

The generated atlas is governed by
[`docs/public-atlas.md`](docs/public-atlas.md). Do not hand-edit files under
`web/public/data/`. Update the source or collector, rebuild, then run:

```bash
npm run atlas:verify
npm run web:test
npm run web:build
```

Never commit raw post text, Bird authentication material, contact details, or
the ignored research cache. Public tool claims must retain their exact source
URL and a label no stronger than the linked post supports.
