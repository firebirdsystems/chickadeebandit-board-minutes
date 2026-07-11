# Board Minutes

Official meeting minutes for HOA and association boards — structured motions with
moved/seconded/outcome, recorded per-member roll-call votes, and immutable adopted
minutes. HOAs are typically legally required to keep minutes; this keeps them
structured, searchable, and tamper-evident.

## How it works

- **Draft minutes** — the board records a meeting (title, date, attendees, notes) and
  adds **motions**. Drafts are visible only to the board.
- **Motions & votes** — each motion tracks who moved and seconded it, an outcome
  (open / carried / failed / tabled / withdrawn), and a **roll-call vote** where every
  board member records their own yea / nay / abstain (one vote per member per motion).
- **Adoption** — when the board adopts the minutes they become a **permanent public
  record**: visible to every member and frozen against further edits (minutes, motions,
  and votes can no longer be changed).

## Data & security model

| Table | Policy | Effect |
|-------|--------|--------|
| `meetings` | `owner_or_visibility` + `write_privileged_only` + `frozen_when(adopted)` | Only the board writes; drafts board-only, adopted visible to everyone; immutable once adopted |
| `motions` | `inherit_visibility` + `insert_privileged_only` + `frozen_when(adopted)` | Follow the meeting's visibility; only the board creates them; frozen when the meeting is adopted |
| `votes` | `inherit_visibility` + `insert_privileged_only` + `max_per_member(motion)` + `frozen_when(adopted)` | Each board member records only their own vote, one per motion; frozen on adoption |
| `settings` | `app_config` | Board group pointer, written only by the admin `/api/admin-config` endpoint |

The `write_privileged_only` / `insert_privileged_only` policies require a configured
**Board** group — until a hub admin sets one in Settings, creating minutes, motions, and
votes is disabled (there is deliberately no "all adults" fallback, matching the hub).

## Relationship to the Agenda app

Board Minutes and **Agenda** are complementary, not overlapping:

- **Agenda** is the *working* surface for planning and running a meeting — anyone may
  submit agenda items, action items are tracked, and content is scoped by an
  everyone/adults audience. It is not board-restricted and has no concept of motions or
  votes.
- **Board Minutes** is the *authoritative governance record* — board-only authorship,
  structured motions, recorded votes, and legal-grade immutability once adopted.

Bolting motions/votes/adoption onto Agenda would force its simple owner/audience model to
also carry a board-governance + voting subsystem, so they are kept separate. A natural
future linkage (not yet built) is for the board to pull an Agenda meeting's items into a
new set of draft minutes as the starting discussion list.

## Development

```bash
npm install
npm run dev     # serve locally with demo data
npm test        # unit tests + manifest validation
node build.mjs  # produce dist/bundle.json
```
