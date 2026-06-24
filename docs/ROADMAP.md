# Career Agent — Roadmap

A living plan for where Career Agent goes after the v1 MVP. The MVP proves the core loop
(upload → review → search → score → tailor → export). This document captures what's next and
*why*, so development can continue without re-deriving the reasoning each time.

Status legend: ✅ shipped · 🟢 planned next · 🟡 mid-term · ⚪ later / exploratory.

---

## Guiding principles

1. **Honesty over flattery.** The product's edge is that it never fabricates and scores
   realistically. Every feature must preserve that.
2. **The profile is the source of truth.** Anything that improves the profile (richer capture,
   better structure) compounds across matching, drafting, and suggestions.
3. **Reduce the user's manual work, not their control.** Automate discovery and drafting; keep the
   human in the loop for review and final decisions.

---

## Theme 1 — A profile that captures the *whole* candidate ✅ shipped

**The problem (a real one we found in testing):** the `Profile` schema has sections for contact,
summary, experience, education, skills, and certifications — and *nothing else*. So anything that
doesn't fit one of those boxes gets silently dropped during parsing.

The concrete case: a resume listed competitive **triathlon** at the bottom — Ironman finishes and a
**World Triathlon age-group qualification**. That's a strong, legitimate signal (discipline,
long-horizon goal-setting, time management, resilience) that many recruiters genuinely weigh. But
because there's no field for it, the parser had nowhere to put it and every tailored draft erased
it entirely. The system didn't *judge* it unimportant — it had no slot for it.

**The fix — an `interests` / `highlights` section:**

- Add an `interests`/`achievements` array to the `Profile` schema: `{ title, detail, signal? }`
  (e.g. *Triathlon — Ironman finisher, 2024 World Championship age-group qualifier*).
- Update the **parse** prompt to capture signal-bearing extracurriculars (endurance sport,
  volunteering, open-source, competitions, leadership) rather than dropping them.
- Update **match** scoring to treat these as supporting evidence of soft skills where relevant.
- Update **tailoring** to keep a tight, role-aware version of this section instead of cutting it —
  foreground it for roles where grit/ownership matters, trim it where space is tight, but never
  silently delete a standout achievement.
- Render it as a compact "Interests & Achievements" block in the PDF.

**Why this was first:** it's a correctness gap, not just a nice-to-have. The product used to make
resumes slightly *worse* than the source on a real dimension. Fixing it was high-value and
self-contained.

> **Shipped.** `interests?: { title, detail?, signal? }[]` runs end to end — parse captures them,
> match weighs them modestly as soft-skill evidence, tailoring keeps a tight role-aware version
> instead of deleting them, the PDF renders an "Interests & Achievements" block, and the profile
> editor has a card for them. Verified on a real resume: the Ironman / World-Championship triathlon
> qualification that used to be dropped now survives all the way to the exported PDF.

## Theme 2 — Suggest roles instead of making the user search ✅ shipped

Today the user types a query and we search Adzuna. But the app already holds a structured profile —
it should be able to say *"here's what you should be looking for."*

- **Role discovery:** a Claude call that takes the profile and proposes 5–8 concrete job titles /
  search queries with a one-line rationale each ("Analytics Engineer — your SQL + dbt-style
  pipeline work maps directly"). One tap runs that search.
- **Field/direction read:** a short, honest assessment of which fields the candidate is strongest
  for and which are a stretch, grounded in the actual profile — plus the gaps that, if closed,
  open the next tier of roles.
- **Saved searches & alerts (⚪):** persist the suggested queries; optionally re-run them on a
  schedule and surface new matches.

This turns Career Agent from a tool you *drive* into one that *advises* — the natural next step once
an initial resume exists.

> **Shipped (role discovery).** `GET /api/roles/suggest` reads the profile and returns 5–8 concrete
> titles with a one-line rationale each, surfaced as tappable chips under the search box — one tap
> runs that search. Grounded only in what the profile supports; returns nothing when the profile is
> too thin. The *field/direction read* and *saved searches & alerts* are still open.

## Theme 3 — Conversational skill-mapping 🟡

The original spec imagined an AI that interviews you to surface implicit skills and quantify vague
bullets ("managed a team" → "led 4 engineers, cut release time 30%"). v1 ships upload + manual
edit; the chat was deferred.

- A guided conversation that reads the current profile, asks targeted questions about thin or
  unquantified areas, and proposes concrete edits the user accepts or rejects.
- Especially powerful paired with Theme 1 — the chat is how you'd surface the triathlon story if the
  resume didn't already mention it.

## Theme 4 — More and better output 🟡

- **Cover letters** — generated per role from the same profile + job, same no-fabrication rules.
- **Multiple PDF templates** — keep the ATS-safe default; add a tasteful "portfolio" variant
  (the dark, designed look) for direct applications where a human, not a parser, reads first.
- **Multi-language resumes (⚪)** — Spanish first (the author is bilingual), reusing the structured
  profile so it's a render-target change, not a re-write.
- **Per-section diff view** — show what tailoring changed vs. the base resume, so the user trusts it.

## Theme 5 — Smarter, cheaper matching 🟡

- **Semantic pre-filter with `pgvector`** — embed the profile and listings; use vector similarity to
  shortlist before spending an LLM call on full scoring. Cuts cost and lets us score more roles.
- **Batch scoring** — score a whole search page at once, ranked, instead of one role at a time.
- **Explainable score breakdown** — sub-scores (skills / experience / domain) behind the headline %.

## Theme 6 — Pipeline & insight 🟡 (partly shipped)

> **Shipped (the spine).** Saved jobs are now a real pipeline: a dedicated "Saved" tab lists them,
> each card carries its persisted match analysis and a status you can move through
> `interested → drafted → applied → interviewing → closed`, and the Overview surfaces your past
> uploaded resumes and tailored drafts for re-download. Search results and in-progress profile
> edits also survive navigation now (with an unsaved-changes guard).

Still open:
- A **board view** of the pipeline, per-stage notes, and follow-up reminders.
- Lightweight analytics: which roles you match best, where your gaps cluster, response rates.

## Platform & hardening (ongoing)

- Atomic profile-version bump (DB-side increment) before any multi-user use.
- Background cleanup job for guest data + orphaned storage (the 30-day retention cron).
- Rate limiting and per-user usage caps on the AI endpoints.
- Move `ANTHROPIC_MODEL` to Sonnet for production quality; consider per-task model tiers
  (cheap model for parsing, stronger model for tailoring).
- Observability: log token usage per call to watch cost.

---

## Near-term order of work

1. ~~**Theme 1** — `interests`/`achievements` section end to end~~ ✅ **shipped.**
2. ~~**Theme 2** — role discovery from the profile~~ ✅ **shipped** (the *field/direction read* is still open).
3. **Theme 6** — finish the pipeline: a board view, per-stage notes, follow-up reminders, light analytics
   (the saved-jobs spine + status + history already landed).
4. **Theme 4** — cover letters and the portfolio PDF template.
5. **Theme 5** — `pgvector` pre-filter once volume justifies it.

Everything here preserves the core principle: real experience, honestly presented, with the AI
doing the tedious work and the human keeping control.
