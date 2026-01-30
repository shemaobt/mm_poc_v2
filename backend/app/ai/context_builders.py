from typing import Dict


def build_clause_text(clause: Dict) -> str:
    """
    Format a single clause for the prompt. Include lemma so AI can match eventCore to verb.
    
    Args:
        clause: Dictionary containing clause data from BHSA.
        
    Returns:
        Formatted string representation of the clause.
    """
    lemma = clause.get("lemma") or clause.get("lemma_ascii") or ""
    lemma_part = f" lemma={lemma}" if lemma else ""
    return f"Clause {clause.get('clause_id')} ({clause.get('clause_type', 'UNK')}{lemma_part}): {clause.get('text')} [{clause.get('gloss')}]"


def build_passage_context(passage_data: Dict) -> str:
    """
    Format passage data for the prompt using individual clauses.
    
    Args:
        passage_data: Dictionary containing passage reference and clauses.
        
    Returns:
        Formatted passage context string for AI prompts.
    """
    clauses = passage_data.get('clauses', [])
    formatted_clauses = "\n".join([build_clause_text(c) for c in clauses])
    return f"""
PASSAGE REFERENCE: {passage_data.get('reference')}
SOURCE TEXT (Hebrew/English):
{formatted_clauses}
    """


def build_passage_context_with_units(passage_data: Dict) -> str:
    """
    Format passage using display_units (grouped clauses). Events will map 1:1 to display units.
    Use this when display_units exist so events align with Stage 1 grouping.
    
    Args:
        passage_data: Dictionary containing passage reference, clauses, and display_units.
        
    Returns:
        Formatted passage context string with unit instructions.
    """
    clauses = passage_data.get('clauses', [])
    clause_by_id = {c.get('clause_id'): c for c in clauses if c.get('clause_id') is not None}
    units = passage_data.get('display_units')
    if not units or not all(u.get('clause_ids') for u in units):
        return build_passage_context(passage_data)

    lines = []
    for idx, unit in enumerate(units):
        ids = unit.get('clause_ids', [])
        unit_clauses = [clause_by_id.get(cid) for cid in ids if clause_by_id.get(cid)]
        if not unit_clauses:
            continue
        combined_text = ' '.join(c.get('text', '') for c in unit_clauses)
        combined_gloss = ' '.join(c.get('gloss', '') for c in unit_clauses)
        ids_str = ','.join(str(i) for i in ids)
        merged = unit.get('merged', len(ids) > 1)
        label = f"Unit {idx + 1} (clauses {ids_str})" if merged else f"Unit {idx + 1} (clause {ids[0]})"
        lines.append(f"{label}: {combined_text} [{combined_gloss}]")
    formatted = "\n".join(lines)
    return f"""
PASSAGE REFERENCE: {passage_data.get('reference')}
DISPLAY UNITS (grouped clauses - one event per unit):
{formatted}

CRITICAL: You MUST output exactly ONE event per unit. The number of events in your response MUST equal the number of units above. Do not merge units or skip units. Use clauseIds (array of clause_ids for that unit) for each event.
    """


def build_clause_merge_user_prompt(passage_data: Dict) -> str:
    """
    Build user prompt for clause-merge decision: list clauses with id, text, gloss, type.
    
    Args:
        passage_data: Dictionary containing passage reference and clauses.
        
    Returns:
        Formatted user prompt for clause merge AI call.
    """
    clauses = passage_data.get("clauses", [])
    lines = []
    for c in clauses:
        cid = c.get("clause_id")
        text = c.get("text", "")
        gloss = c.get("gloss", "")
        ctype = c.get("clause_type", "")
        lines.append(f"Clause {cid} (v{c.get('verse', '?')}, {ctype}): {text} [{gloss}]")
    ref = passage_data.get("reference", "")
    return f"Passage: {ref}\n\nClauses:\n" + "\n".join(lines) + "\n\nReturn display_units as JSON."
