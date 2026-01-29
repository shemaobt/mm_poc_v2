# Debug: Clauses vs Events Count

When Stage 1 shows a different number of "display rows" (or clauses) than Stage 4 events, use backend logs to see why.

## What the numbers mean

| Term | Meaning |
|------|--------|
| **Total Clauses** | Raw BHSA clauses (e.g. 65 for Ruth 2:3-13). Shown in Stage 1. |
| **Display rows** | Number of display units after AI merge. Shown in Stage 1 when it differs from total clauses (e.g. "Display rows: 13"). |
| **Events** | Number of events in Stage 4. Should equal display rows when using display units. |

## Backend logs to check

Run the backend and watch logs (e.g. `docker-compose logs -f backend` or your terminal). When you run **Fetch Passage** or **AI Analyze**:

1. **Passage fetch (display units)**
   - `[BHSA] passage fetch ref=...: using stored display_units (X units, Y merged).` → X = display rows used in Stage 1.
   - `[BHSA] passage fetch ref=...: AI merge ran, X display units, Y merged groups.` → X = display rows.
   - `[BHSA] passage fetch ref=...: no AI merge ..., N clauses as N units.` → one row per clause.

2. **Phase 2 (event extraction)**
   - `[Phase2] Using stored display_units: X units (expect 1 event per unit)` or `[Stream] Using stored display_units: X units` → X = number of units sent to the AI.
   - `[AI] Input: X display units, Y raw clauses` → confirms input to AI.
   - `[AI] Phase 2 returned N events (display_units=X)` → N = events from AI, X = units.
   - `[Phase2] MISMATCH: display_units=X but AI returned events=N` or `[Stream] MISMATCH: ...` → AI did not output one event per unit (X ≠ N).
   - `[Phase2] Saving N events for passage ... (DB clauses=Y)` → N events written to DB.

## Why events can be fewer than display rows

1. **Display units not used**  
   Phase 2 was run without `display_units` (e.g. no stored units and no API key for merge). Then the AI sees raw clauses and can return fewer events (e.g. 32 from 65 clauses).

2. **AI not following one-per-unit**  
   Even with display units, the model sometimes merges or skips units. Logs will show `MISMATCH: display_units=X but AI returned events=N`. The prompt was tightened to require exactly one event per unit; re-run Phase 2 (e.g. "Refetch grouping" or "AI Analyze") to regenerate events.

3. **Stale display units**  
   Stage 1 may show a different merge (e.g. after "Refetch grouping") than the one that was in the DB when Phase 2 last ran. Run "Refetch grouping" (which re-runs Phase 2) so events match the current display units.

## Quick checks

- **Stage 1:** Note "Total Clauses" and "Display rows" (if shown).
- **Stage 4:** Note "X of Y events validated" (Y = events count).
- **Logs:** Search for `MISMATCH` or `Phase 2 returned` to see unit count vs event count.
