# Why Events May Not Match Clauses from Stage 1

This document explains the root causes of events in Stage 4 not matching clauses from Stage 1, and how the system addresses them.

## Grouping-Aware Events (Implemented)

Events now align with Stage 1 display units (grouped clauses):

1. **Group before events**: Display units (from stored or AI merge) are injected into passage_data before Phase 2. The AI receives grouped units and creates events per unit.
2. **unitClauseIds**: Each event stores `unitClauseIds` (array of clause_id 1-based) for the display unit it maps to. Stage 4 displays merged clause text from these IDs.
3. **After grouping changes**: When the user clicks "Refetch grouping", we re-run Phase 2 to regenerate events with the new grouping. Events are replaced.

### What Is Affected by Grouping Changes

| Component | Effect |
|-----------|--------|
| **Events** | Replaced when grouping changes (Refetch grouping triggers Phase 2) |
| **Discourse relations** | Re-created (new event IDs) |
| **Event roles** | Re-created (linked to same participants) |
| **Participants** | Unchanged |
| **Participant relations** | Unchanged |
| **Clauses** | Unchanged (BHSA clauses stay the same) |
| **Display units** | Updated (new AI merge) |

## Data Flow Overview

1. **Stage 1 (Syntax)**: BHSA extracts clauses sequentially. Each clause gets `clause_id` (1-based: 1, 2, 3...) and is stored in DB with `clauseIndex` (0-based: 0, 1, 2...).
2. **AI Analysis**: The AI receives clauses formatted as `"Clause 1 (HLK): וַתֵּלֵךְ [and walk]"` and outputs events with `clauseId: "1"`, `clauseId: "2"`, etc.
3. **Event Persistence**: When saving, we map AI's `clauseId` (string "1", "2"...) to DB clause UUID via `clause_map = {str(clauseIndex + 1): clause.id}`.
4. **Stage 4 Display**: Events show clause text by looking up the DB clause by `event.clauseId` (UUID) and displaying its `text`, `gloss`, `freeTranslation`.

## Root Causes of Mismatch

### 1. AI Lexical/Semantic Error (Most Likely)

**Symptom**: Event labeled "go" but the linked clause shows Hebrew "ותלד" (bore/give birth).

**Cause**: The AI correctly links the event to a clause but mislabels the `eventCore`. Hebrew roots can be confused (e.g., יָלַד vs הָלַךְ), or the AI may infer a wrong English equivalent from context.

**Mitigation**:
- Strengthen the AI prompt to require `eventCore` to match the verb lemma/gloss of the clause.
- Add validation: compare eventCore to clause lemma/gloss and warn when they diverge.

### 2. AI clauseId Misassignment

**Symptom**: Event e1 shows Hebrew from a completely different clause than expected.

**Cause**: The AI outputs the wrong `clauseId` for an event—e.g., assigns e1 to clause "5" when it meant clause "1", or confuses clause numbering when many clauses are similar.

**Mitigation**:
- Make the AI prompt explicit: "clauseId MUST be the exact clause number from the input (1, 2, 3...)."
- Add logging when `clause_map.get(ai_clause_id)` is None (unmapped clauseId).
- Consider fallback: if clauseId doesn't map, try matching by event order to clause order.

### 3. Display Units vs Raw Clauses Confusion

**Symptom**: User expects an event to match "the row I see in Stage 1" but Stage 1 shows merged rows.

**Cause**: Stage 1 uses `display_units` (AI-merged adjacent clauses) for readability. One display row can contain clauses 1–3. Events link to individual clauses (1, 2, or 3), not to display rows. So an event linked to clause 2 appears to "not match" the merged row that shows clauses 1–3.

**Clarification**: This is by design. Events are always 1:1 with BHSA clauses. The merge is display-only.

### 4. Passage/DB Sync Mismatch

**Symptom**: Events show Hebrew from a different passage than the one fetched.

**Cause**: If the passage was re-fetched and clauses were recreated (new UUIDs), old events still point to old clause UUIDs. The lookup `dbClauses.find(c => c.id === ev.clauseId)` would fail, and we might fall back to wrong data.

**Mitigation**: When re-fetching a passage, either (a) preserve clause UUIDs where possible, or (b) clear events and re-run AI analysis.

### 5. BHSA vs DB Clause Order

**Symptom**: Clause N in BHSA doesn't match clause N in DB.

**Cause**: BHSA `clause_id` is assigned in verse order. DB `clauseIndex` is assigned in the same order when creating clauses. The mapping `clauseIndex + 1 === clause_id` is consistent. If BHSA extraction or DB creation ever diverges (e.g., different verse ordering), the map would break.

**Current state**: Both use the same order (verse-by-verse, clause-by-clause). No known divergence.

## Recommendations

1. **Improve AI prompt**: Require eventCore to align with the clause's verb lemma/gloss. ✓ Implemented.
2. **Add validation**: Log unmapped clauseIds and mismatched eventCore vs clause lemma.
3. **UI clarity**: In Stage 4, show the clause number (e.g., "Clause 3") next to the Hebrew so users can cross-reference Stage 1.
4. **Re-fetch handling**: When grouping changes, re-run Phase 2 to regenerate events. ✓ Implemented (Refetch grouping triggers Phase 2).

## Database Migration

The `Event` model has a new optional field `unitClauseIds` (Json). Run `prisma db push` or create a migration to apply the schema change.
