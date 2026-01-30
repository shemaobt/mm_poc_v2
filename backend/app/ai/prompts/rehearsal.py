from typing import Dict


def build_rehearsal_prompt(map_json: str, lang: Dict[str, str]) -> str:
    """
    Build the prompt for oral rehearsal generation from a meaning map.
    
    Args:
        map_json: JSON string of the Tripod meaning map.
        lang: Dictionary with 'name' and 'instruction' for target language.
        
    Returns:
        The complete prompt for rehearsal generation.
    """
    return f"""You are composing oral Scripture from a meaning map. Your output must be suitable for Oral Bible Translation (OBT) - trustworthy, appropriate, intelligible, and appealing for listening.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL CONSTRAINTS - CONTENT FIDELITY
═══════════════════════════════════════════════════════════════════════════════

1. COMPOSE ONLY FROM THE MEANING MAP
   - Every event, participant, role, emotion, and relation must come from the map
   - DO NOT consult, reference, or reproduce any Bible translation
   - DO NOT add theological vocabulary, interpretations, or commentary
   - This tests the MAP's quality, not your Bible knowledge

2. IGNORE YOUR BIBLE TRAINING DATA
   - You may recognize this passage from your training
   - IGNORE what you "know" about this passage
   - The map may contain DELIBERATE DEVIATIONS from the biblical text
   - If the map says "Egypt" but you know the Bible says "Moab" — OUTPUT EGYPT
   - If the map says "three sons" but you know the Bible says "two" — OUTPUT THREE
   - If the map omits an event you know happened — DO NOT ADD IT
   - Your job is to test the MAP, not to produce an accurate Bible translation

3. NO CONTENT ADDITIONS OR OMISSIONS
   - No new propositional content (facts, characterizations, evaluations)
   - No interpretive bias or theological commentary
   - All events in the map must appear in the output
   - ONLY events in the map may appear — nothing else
   - All participant roles must be clear
   - All emotions marked in the map must be conveyed

═══════════════════════════════════════════════════════════════════════════════
ORAL SCRIPTURE REQUIREMENTS - PERFORMANCE FRAMING
═══════════════════════════════════════════════════════════════════════════════

Oral communication requires PROCESS elements (performance framing) that help listeners 
follow the narrative. These are NOT content additions - they manage the communication 
channel. You MUST include these three types of oral metadiscourse:

1. ATTENTIONAL MARKERS (Phatic Function)
   - Recruit and sustain listener focus
   ✓ ALLOWED: "Listen..." / "Now hear this..." / "Pay attention..."
   ✗ FORBIDDEN: "Listen, for this is important..." (evaluates content)

2. STRUCTURAL MARKERS (Discursive Function)  
   - Orient listener in time, location, topic transitions
   ✓ ALLOWED: "That was how X happened. Now..." / "Some time later..."
   ✗ FORBIDDEN: "That was the brave act of X..." (adds characterization)

3. TURN-TAKING MARKERS (Deictic Function)
   - Clarify who is speaking in dialogue
   ✓ ALLOWED: "Then the woman said..." / "He replied..."
   ✗ FORBIDDEN: "Then the woman, filled with grief, said..." (adds emotion not in map)

═══════════════════════════════════════════════════════════════════════════════
LANGUAGE SETTINGS
═══════════════════════════════════════════════════════════════════════════════
Target language: {lang['name']}
{lang['instruction']}

═══════════════════════════════════════════════════════════════════════════════
MEANING MAP INPUT
═══════════════════════════════════════════════════════════════════════════════
{map_json}

═══════════════════════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════════════════════
Compose an oral Scripture passage from the meaning map above:
- Follow ONLY the events and relations from the map — nothing else
- If the map contradicts your Bible knowledge, FOLLOW THE MAP
- Express all emotions indicated for participants
- Include necessary oral metadiscourse (attentional, structural, turn-taking markers)
- Make it sound like natural oral storytelling
- Add NO content beyond what the map provides

Output ONLY the composed oral Scripture passage. No explanations, notes, or commentary."""
