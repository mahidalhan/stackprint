# Public atlas evidence contract

Stackprint has two intentionally separate profile types:

- **Consented scan** profiles contain tool names selected by the computer owner.
- **Public-evidence** profiles contain bounded claims supported by public links.

A public-evidence profile is not a device scan and must never imply endorsement
or current use.

## Angel profile eligibility

An angel profile is publishable only when all of the following are true:

1. The person appears in the public Angel Club investor index with an
   investor-related type.
2. Their X account is resolved by Bird CLI.
3. The X display name exactly matches the normalized investor-index name.
4. At least one non-trivial tool or workflow claim has an exact public-post URL.

The exact-name rule intentionally trades recall for precision. A candidate that
needs a nickname, transliteration, company-only identity, or fuzzy match stays
out until a human verifies it.

Placeholder names and any investor name that resolves to more than one X handle
are rejected. Following relationships are used only for discovery and never as
investor or tool-use evidence.

## Claim labels

The generator may emit only these labels:

| Label | Minimum public evidence |
| --- | --- |
| `SELF-REPORTED USE` | First-person use language in the linked post |
| `BUILT WITH` | The post explicitly says something was built or powered with the tool |
| `PUBLIC PROJECT` | The person explicitly connects themselves to building or founding the tool |
| `PUBLIC RECOMMENDATION` | The post explicitly recommends or asks readers to try the tool |
| `PUBLIC DISCUSSION` | A substantive tool/workflow discussion that does not establish use |
| `PUBLIC MENTION` | An automatic term match that establishes only that the post names the tool |

`PUBLIC DISCUSSION` is deliberately weaker than use. The UI repeats that a
mention does not prove current use or endorsement.

Tool terms with ordinary-language collisions use contextual aliases. Product
names also have a conservative public-availability floor, so a post cannot be
attributed to a product before that product existed. Historical bare `Python`
matches are excluded from generated profiles because the earlier query cannot
distinguish the programming language from unrelated uses without retaining raw
post text.

Automatically mined profiles publish every retained term match as
`PUBLIC MENTION`, even when a first-person pattern is detected. Stronger
labels are reserved for hand-verified source profiles such as Naval's. This
prevents quoted speech or reported anecdotes from being misattributed as the
account owner's use.

Generated JSON records expose `evidenceMode` as either `hand-verified` or
`automated-public-mention`, and the profile disclosure renders the
difference.

## Generated artifacts

Research inputs and raw Bird responses stay under the ignored
`research/angels/.cache/` directory. The public build contains:

- `web/public/data/builders-index.json`: compact searchable profile summaries.
- `web/public/data/builders/<slug>.json`: one lazy-loaded public profile.
- `web/public/data/atlas-manifest.json`: count, source, and validation metadata.

Every generated tool row must have a valid `https://x.com/<handle>/status/<id>`
URL, date, supported label, and bounded note. Every generated profile must have
role evidence and at least one tool claim.

The public build does not republish contact details, check sizes, or raw post
text. Angel Club is attributed as the eligibility index; each generated record
keeps the row's original source URL as secondary research metadata.

Corrections or removal requests can be opened in the Stackprint repository.
Investor-index corrections should also be sent through Angel Club's published
resource-maintenance channel.

## Reproducing the atlas

The collectors are read-only. Bird uses the already authenticated local account
and never posts.

Install and authenticate Bird separately, confirm `bird --version`, and use an
account authorized to read public X data. Set `BIRD_BIN` if the executable is
not on `PATH`. The scripts invoke only `search`, `user-tweets`, and `following`;
they never invoke posting commands or read browser-cookie files themselves.

```bash
npm run atlas:candidates
npm run atlas:evidence
npm run atlas:build
npm run atlas:check
```

All three collection/build steps are resumable. Set `--limit` during a small
validation run; omit it for the complete dataset.

The grouped search collector skips records already marked `searchChecked`.
Pass `--recheck` only when a taxonomy or query change intentionally requires
fresh public searches.

Useful controls:

```text
atlas:candidates       --limit N --pages N --expand N --concurrency N --refresh
atlas:evidence-search  --limit N --batch N --pages N --recheck --empty-only
atlas:evidence         --limit N --pages N --concurrency N --reclassify
atlas:build            --limit N
atlas:check            --min N
atlas:status           --json
```

`atlas:evidence-search` is the efficient default. The per-account
`atlas:evidence` command exists for deeper spot checks and reclassification.
Use `--empty-only --pages 2` for a bounded deeper pass over candidates that did
not retain a term in the first search.
