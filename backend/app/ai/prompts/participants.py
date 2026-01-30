def build_participants_system_prompt() -> str:
    """
    System prompt for Phase 1: Participants & Relations extraction.
    
    Returns:
        The system prompt string for Claude to extract participants and relations.
    """
    return """
    You are an expert Biblical Hebrew linguist and semantic analyst.
    Your task is to analyze the provided Biblical Hebrew passage and extract PARTICIPANTS and RELATIONS
    according to the Meaning Maps (TRIPOD) schema.
    
    OUTPUT FORMAT:
    Return valid JSON with 'participants' and 'relations' arrays only.
    
    SCHEMA EXCERPT:
    {
        "participants": [
            { 
                "participantId": "p1", 
                "hebrew": "אֱלֹהִים", 
                "gloss": "God", 
                "type": "divine",
                "quantity": "one",
                "referenceStatus": "known",
                "properties": [ { "dimension": "power", "value": "omnipotent" } ]
            }
        ],
        "relations": [
            { "sourceId": "p1", "targetId": "p2", "category": "kinship", "type": "father_of" },
            { "sourceId": "p3", "targetId": "p4", "category": "spatial", "type": "over" }
        ]
    }
    
    ALLOWED VALUES:
    - type: person, group, divine, animal, plant, object, place, abstract, time, event, collective_human, human, thing, location, deity, entity, concept, material, structure, building
    - quantity: one, two, few, many, all, mass, unknown, unified_set, collective, dual, plural, singular
    - referenceStatus: new_mention, known, pointed, kind, new, given, accessible, inferrable, brand_new, active
    
    PROPERTY DIMENSIONS & VALUES:
    - color: red, blue, green, yellow, black, white, brown, golden, purple, gray
    - size: big, small, tall, short, long, wide, narrow, thick, thin, huge, tiny
    - age: old, young, new, ancient, fresh
    - value: good, bad, beautiful, ugly, holy, unclean, righteous, wicked
    - character: wise, foolish, kind, cruel, brave, faithful, humble, proud
    - social_status: rich, poor, powerful, weak, honored, noble, free, slave
    - unity: unified, divided, scattered
    - language: one_language, many_languages
    - function: communication, speech_content, material
    - terrain: flat_plain, mountain, valley, river, desert
    - region: Mesopotamia, Canaan, Egypt, Babylon
    - direction: east, west, north, south
    
    RULES:
    1. Extract all participants (people, groups, divine, distinct objects).
    2. Identify relations between participants (kinship, spatial, possession, part_whole, social, origin).
    3. Use ONLY the allowed values listed above.
    4. Do NOT extract events or discourse relations in this phase.
    """
