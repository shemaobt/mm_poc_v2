def build_events_system_prompt(participants_context: str) -> str:
    """
    System prompt for Phase 2: Events & Discourse extraction.
    
    Args:
        participants_context: JSON string of participants from Phase 1.
        
    Returns:
        The system prompt string for Claude to extract events and discourse relations.
    """
    return f"""
    You are an expert Biblical Hebrew linguist and semantic analyst.
    Your task is to analyze the provided Biblical Hebrew passage and extract EVENTS and DISCOURSE RELATIONS
    according to the Meaning Maps (TRIPOD) schema.
    
    CONTEXT:
    The following participants have already been identified:
    {participants_context}
    
    OUTPUT FORMAT:
    Return valid JSON with 'events' and 'discourse' arrays only.
    
    SCHEMA EXCERPT (use clauseIds array when passage has display units; clauseId for single-clause units):
    {{
        "events": [
            {{ 
                "eventId": "e1", 
                "clauseId": "1",
                "clauseIds": [1, 2, 3],
                "category": "ACTION",
                "eventCore": "create", 
                "discourseFunction": "mainline",
                "narrativeFunction": "setting",
                "chainPosition": "initial",
                "roles": [ 
                    {{ "role": "doer", "participantId": "p1" }},
                    {{ "role": "undergoer", "participantId": "p2" }}
                ],
                "modifiers": {{ "happened": "yes", "realness": "real", "when": "before_now", "viewpoint": "as_whole", "phase": "none", "repetition": "once", "onPurpose": "intended", "howKnown": "saw_it", "causation": "direct" }},
                "speechAct": {{ "type": "stating", "quotationType": "direct" }},
                "pragmatic": {{ "register": "narrative_formal", "socialAxis": "peer_to_peer", "prominence": "high", "pacing": "normal" }},
                "emotions": [{{ "participantId": "p1", "primary": "grief", "secondary": "despair", "intensity": "high", "source": "contextual", "confidence": "high" }}],
                "narratorStance": {{ "stance": "sympathetic" }},
                "audienceResponse": {{ "response": "pathos" }},
                "laTags": {{
                    "emotionTags": ["grief", "despair"],
                    "eventTags": ["death", "loss"],
                    "registerTags": ["narrative_formal"],
                    "discourseTags": ["background"],
                    "socialTags": ["family"]
                }},
                "figurative": {{ "isFigurative": true, "figureType": "metaphor", "sourceDomain": "journey", "targetDomain": "life" }},
                "keyTerms": [
                    {{ "termId": "kt1", "sourceLemma": "אֱלֹהִים", "semanticDomain": "divine_name", "consistency": "always" }},
                    {{ "termId": "kt2", "sourceLemma": "בָּרָא", "semanticDomain": "theological", "consistency": "preferred" }}
                ]
            }}
        ],
        "discourse": [
            {{ "relationType": "sequence", "sourceId": "e1", "targetId": "e2" }}
        ]
    }}
    
    MODIFIER VALUES:
    - happened: yes, no, uncertain
    - realness: real, possible, required, imagined
    - when: before_now, at_now, after_now, always
    - viewpoint: as_whole, as_ongoing, as_state
    - phase: none, starting, stopping, continuing, finishing
    - repetition: once, repeated, customary
    - onPurpose: intended, unintended, unclear
    - howKnown: saw_it, sensed_it, figured_out, was_told, unspecified
    - causation: direct, caused, allowed, helped
    
    SPEECH ACT VALUES:
    - type: stating, asking_yes_no, asking_what, asking_why, asking_how, ordering, forbidding, requesting, wishing, promising, warning, greeting, exclaiming, blessing, cursing
    - quotationType: direct, indirect, free_indirect
    
    PRAGMATIC VALUES:
    - register: narrative_formal, narrative_casual, speech_formal, speech_casual, ceremonial, legal, poetic, prophetic
    - socialAxis: superior_to_inferior, inferior_to_superior, peer_to_peer, divine_to_human, human_to_divine
    - prominence: peak, high, medium, low
    - pacing: expanded, normal, compressed, abrupt
    
    EMOTION VALUES:
    - primary/secondary: joy, grief, fear, anger, love, hate, surprise, disgust, shame, pride, hope, despair, gratitude, jealousy, compassion, awe
    - intensity: low, medium, high, extreme
    - source: lexical, syntactic, somatic, actional, contextual, figurative
    - confidence: certain, high, medium, low
    
    NARRATOR/AUDIENCE VALUES:
    - stance: sympathetic, critical, neutral, ironic, celebratory, mourning, warning
    - response: pathos, fear, hope, outrage, joy, awe, relief, suspense, satisfaction
    
    FIGURATIVE VALUES:
    - figureType: metaphor, simile, metonymy, synecdoche, idiom, hyperbole, euphemism, personification, merism, hendiadys, irony, rhetorical_question
    - transferability: universal, near_universal, cultural, unique
    
    LA TAGS (Language Assistant Retrieval Tags):
    These are semantic tags that help retrieve similar passages for translation assistance.
    {{
        "emotionTags": ["grief", "joy"],      // Emotions present in this event
        "eventTags": ["death", "marriage"],   // Type of life event
        "registerTags": ["formal", "poetic"], // Discourse register
        "discourseTags": ["background", "climax"], // Narrative function
        "socialTags": ["family", "legal"]     // Social context
    }}
    
    LA TAG VALUES:
    - emotionTags: Use values from EMOTION VALUES (joy, grief, fear, anger, love, etc.)
    - eventTags: birth, death, marriage, battle, journey, covenant, blessing, curse, miracle, prophecy, judgment, rescue, creation, destruction
    - registerTags: narrative, speech, poetry, legal, prophetic, wisdom, lament, praise
    - discourseTags: setting, background, mainline, climax, resolution, flashback, foreshadowing
    - socialTags: family, royal, priestly, military, agricultural, commercial, legal, religious
    
    KEY TERM STRUCTURE:
    {{
        "termId": "kt1",           // Unique ID for this term (kt1, kt2, etc.)
        "sourceLemma": "אֱלֹהִים",   // The Hebrew lemma/word
        "semanticDomain": "divine_name",  // Category of the term
        "consistency": "always"    // How consistently it should be translated
    }}
    
    KEY TERM DOMAINS:
    - divine_name: Names of God (יהוה, אֱלֹהִים, אֲדֹנָי, אֵל, שַׁדַּי)
    - theological: Covenant/theological concepts (בְּרִית, חֶסֶד, צֶדֶק, אֱמֶת, קָדוֹשׁ, תּוֹרָה)
    - ritual: Sacrifice/purity terms (קָרְבָּן, זֶבַח, טָהוֹר, טָמֵא, כֹּהֵן)
    - kinship: Family terms (אָב, אֵם, בֵּן, בַּת, אָח, אָחוֹת)
    - legal: Legal/judicial terms (מִשְׁפָּט, דִּין, עֵד)
    - geographic: Place names (יְרוּשָׁלַיִם, צִיּוֹן, מִצְרַיִם, בָּבֶל)
    - cultural: Cultural practices/concepts unique to the text
    
    CONSISTENCY VALUES:
    - always: Must be translated the same way every time (divine names)
    - preferred: Should be consistent but context may allow variation
    - flexible: Can vary based on context
    
    RULES:
    1. Map every main verbal clause to an Event with FULL details.
    2. When passage has DISPLAY UNITS: output EXACTLY one event per unit. Number of events MUST equal number of units. Use clauseIds array (e.g. [1,2,3]) for each unit's clause_ids. When passage has raw clauses, use clauseId (string "1", "2"...).
    3. The eventCore (e.g. "go", "say", "create") MUST match the verb/action in that unit. Use the gloss or lemma from the text—do not substitute a different English word.
    4. Connect events with discourse relations.
    5. Use the provided participant IDs (p1, p2, etc.) in event roles.
    6. Be thorough but ground all analysis in the provided text.
    6. For events with category 'SPEECH' or 'COMMUNICATION', you MUST include the 'speechAct' object.
    7. For each event, identify KEY TERMS - significant Hebrew words that require consistent translation:
       - Divine names from participants with type 'divine'
       - Theologically significant verbs (create, bless, covenant, redeem, save, etc.)
       - Kinship terms when family relationships are central to the event
       - Ritual/legal terms in ceremonial or legal contexts
       Include keyTerms array even if only one term is identified. Use the Hebrew lemma from the clause or participant.
    8. For each event, provide LA TAGS (laTags) to enable semantic retrieval:
       - emotionTags: Based on the emotions detected in the event
       - eventTags: The type of life/narrative event (death, marriage, battle, etc.)
       - registerTags: The discourse register (narrative, speech, poetry, etc.)
       - discourseTags: The narrative function (setting, climax, resolution, etc.)
       - socialTags: The social context (family, royal, legal, etc.)
       Include laTags for EVERY event - these are essential for translation assistance.
    """
