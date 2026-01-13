
"""
TRIPOD_SCHEMA Definition
Single Source of Truth for Meaning Mapping (v5.2)
Synchronized with bmm_v5_2_unified.html
"""

TRIPOD_SCHEMA = {
    "version": "5.2",

    # 1. EVENT CATEGORIES
    "event_categories": [
        "STATE", "MOTION", "ACTION", "TRANSFER", "SPEECH", 
        "INTERNAL", "PROCESS", "RITUAL", "META"
    ],

    # 2. EVENT CORES (Explicitly defined for validation)
    "event_cores": {
        "STATE": [
            { "core": "be", "gloss": "be (exist as)" },
            { "core": "exist", "gloss": "exist" },
            { "core": "have", "gloss": "have (possess)" },
            { "core": "lack", "gloss": "lack (not have)" },
            { "core": "remain", "gloss": "remain (stay same)" },
            { "core": "stay", "gloss": "stay (not leave)" },
            { "core": "live", "gloss": "live (be alive / dwell)" },
            { "core": "dwell", "gloss": "dwell (reside)" },
            { "core": "sit", "gloss": "sit" },
            { "core": "stand", "gloss": "stand" },
            { "core": "lie", "gloss": "lie (recline)" },
            { "core": "wait", "gloss": "wait" },
            { "core": "sleep", "gloss": "sleep" },
            { "core": "be_located", "gloss": "be located (be at place)" },
            { "core": "be_called", "gloss": "be called (have name)" }
        ],
        "MOTION": [
            { "core": "go", "gloss": "go (move away)" },
            { "core": "come", "gloss": "come (move toward)" },
            { "core": "move", "gloss": "move (general motion)" },
            { "core": "enter", "gloss": "enter (go in)" },
            { "core": "exit", "gloss": "exit (go out)" },
            { "core": "leave", "gloss": "leave (depart from)" },
            { "core": "arrive", "gloss": "arrive (reach destination)" },
            { "core": "depart", "gloss": "depart (start journey)" },
            { "core": "return", "gloss": "return (go back)" },
            { "core": "flee", "gloss": "flee (escape)" },
            { "core": "follow", "gloss": "follow (go after)" },
            { "core": "approach", "gloss": "approach (move toward)" },
            { "core": "cross", "gloss": "cross (go across)" },
            { "core": "ascend", "gloss": "ascend (go up)" },
            { "core": "descend", "gloss": "descend (go down)" },
            { "core": "fall", "gloss": "fall (go down uncontrolled)" },
            { "core": "pass", "gloss": "pass (go by)" },
            { "core": "wander", "gloss": "wander (move without goal)" },
            { "core": "run", "gloss": "run (move fast)" },
            { "core": "walk", "gloss": "walk (move on foot)" },
            { "core": "fly", "gloss": "fly (move through air)" },
            { "core": "swim", "gloss": "swim (move through water)" }
        ],
        "ACTION": [
            { "core": "do", "gloss": "do (general action)" },
            { "core": "make", "gloss": "make (create)" },
            { "core": "build", "gloss": "build (construct)" },
            { "core": "destroy", "gloss": "destroy" },
            { "core": "break", "gloss": "break (destroy integrity)" },
            { "core": "cut", "gloss": "cut (divide with blade)" },
            { "core": "hit", "gloss": "hit (strike with force)" },
            { "core": "kill", "gloss": "kill" },
            { "core": "consume", "gloss": "consume (eat/drink)" },
            { "core": "hold", "gloss": "hold (grip)" },
            { "core": "take", "gloss": "take (grasp)" },
            { "core": "put", "gloss": "put (place)" },
            { "core": "raise", "gloss": "raise (lift up)" },
            { "core": "lower", "gloss": "lower (put down)" },
            { "core": "open", "gloss": "open" },
            { "core": "close", "gloss": "close" },
            { "core": "touch", "gloss": "touch" },
            { "core": "throw", "gloss": "throw" },
            { "core": "catch", "gloss": "catch" },
            { "core": "tie", "gloss": "tie (bind)" },
            { "core": "release", "gloss": "release (untie/free)" },
            { "core": "cover", "gloss": "cover" },
            { "core": "uncover", "gloss": "uncover" },
            { "core": "wash", "gloss": "wash (clean)" },
            { "core": "wear", "gloss": "wear (clothing)" },
            { "core": "write", "gloss": "write" },
            { "core": "read", "gloss": "read" },
            { "core": "separate", "gloss": "separate (divide)" },
            { "core": "gather", "gloss": "gather (collect)" },
            { "core": "search", "gloss": "search (look for)" },
            { "core": "find", "gloss": "find" },
            { "core": "hide", "gloss": "hide" },
            { "core": "guard", "gloss": "guard (protect)" },
            { "core": "rise", "gloss": "rise (get up)" },
            { "core": "plant", "gloss": "plant (put in ground)" },
            { "core": "harvest", "gloss": "harvest (gather crop)" },
            { "core": "cook", "gloss": "cook (prepare food)" },
            { "core": "light", "gloss": "light (start fire)" },
            { "core": "extinguish", "gloss": "extinguish (put out fire)" }
        ],
        "TRANSFER": [
            { "core": "give", "gloss": "give" },
            { "core": "receive", "gloss": "receive" },
            { "core": "take_from", "gloss": "take (from someone)" },
            { "core": "send", "gloss": "send" },
            { "core": "bring", "gloss": "bring" },
            { "core": "carry", "gloss": "carry" },
            { "core": "offer", "gloss": "offer" },
            { "core": "return_object", "gloss": "return (give back)" },
            { "core": "lend", "gloss": "lend" },
            { "core": "borrow", "gloss": "borrow" },
            { "core": "steal", "gloss": "steal" },
            { "core": "pay", "gloss": "pay" },
            { "core": "buy", "gloss": "buy" },
            { "core": "sell", "gloss": "sell" },
            { "core": "inherit", "gloss": "inherit" },
            { "core": "distribute", "gloss": "distribute" }
        ],
        "SPEECH": [
            { "core": "say", "gloss": "say" },
            { "core": "tell", "gloss": "tell" },
            { "core": "ask", "gloss": "ask" },
            { "core": "answer", "gloss": "answer" },
            { "core": "command", "gloss": "command" },
            { "core": "forbid", "gloss": "forbid" },
            { "core": "request", "gloss": "request" },
            { "core": "promise", "gloss": "promise" },
            { "core": "warn", "gloss": "warn" },
            { "core": "bless", "gloss": "bless" },
            { "core": "curse", "gloss": "curse" },
            { "core": "praise", "gloss": "praise" },
            { "core": "accuse", "gloss": "accuse" },
            { "core": "confess", "gloss": "confess" },
            { "core": "name", "gloss": "name (give name)" },
            { "core": "call", "gloss": "call (summon)" },
            { "core": "proclaim", "gloss": "proclaim" },
            { "core": "teach", "gloss": "teach" },
            { "core": "advise", "gloss": "advise" },
            { "core": "persuade", "gloss": "persuade" },
            { "core": "swear", "gloss": "swear (oath)" },
            { "core": "pray", "gloss": "pray" },
            { "core": "sing", "gloss": "sing" }
        ],
        "INTERNAL": [
            { "core": "perceive_see", "gloss": "see" },
            { "core": "perceive_hear", "gloss": "hear" },
            { "core": "perceive_smell", "gloss": "smell" },
            { "core": "perceive_taste", "gloss": "taste" },
            { "core": "perceive_feel", "gloss": "feel (touch)" },
            { "core": "know", "gloss": "know" },
            { "core": "believe", "gloss": "believe" },
            { "core": "think", "gloss": "think" },
            { "core": "understand", "gloss": "understand" },
            { "core": "remember", "gloss": "remember" },
            { "core": "forget", "gloss": "forget" },
            { "core": "learn", "gloss": "learn" },
            { "core": "recognize", "gloss": "recognize" },
            { "core": "love", "gloss": "love" },
            { "core": "hate", "gloss": "hate" },
            { "core": "fear", "gloss": "fear" },
            { "core": "trust", "gloss": "trust" },
            { "core": "hope", "gloss": "hope" },
            { "core": "desire", "gloss": "desire" },
            { "core": "want", "gloss": "want" },
            { "core": "decide", "gloss": "decide" },
            { "core": "choose", "gloss": "choose" },
            { "core": "plan", "gloss": "plan" },
            { "core": "intend", "gloss": "intend" },
            { "core": "rejoice", "gloss": "rejoice" },
            { "core": "grieve", "gloss": "grieve" },
            { "core": "be_angry", "gloss": "be angry" },
            { "core": "be_amazed", "gloss": "be amazed" },
            { "core": "wonder", "gloss": "wonder" }
        ],
        "PROCESS": [
            { "core": "become", "gloss": "become" },
            { "core": "grow", "gloss": "grow" },
            { "core": "shrink", "gloss": "shrink" },
            { "core": "increase", "gloss": "increase" },
            { "core": "decrease", "gloss": "decrease" },
            { "core": "change", "gloss": "change" },
            { "core": "transform", "gloss": "transform" },
            { "core": "age", "gloss": "age" },
            { "core": "die", "gloss": "die" },
            { "core": "decay", "gloss": "decay" },
            { "core": "ripen", "gloss": "ripen" },
            { "core": "heal", "gloss": "heal" },
            { "core": "sicken", "gloss": "sicken" },
            { "core": "strengthen", "gloss": "strengthen" },
            { "core": "weaken", "gloss": "weaken" },
            { "core": "fill", "gloss": "fill" },
            { "core": "empty", "gloss": "empty" },
            { "core": "appear", "gloss": "appear" },
            { "core": "disappear", "gloss": "disappear" },
            { "core": "begin", "gloss": "begin" },
            { "core": "end", "gloss": "end" }
        ],
        "RITUAL": [
            { "core": "worship", "gloss": "worship" },
            { "core": "sacrifice", "gloss": "sacrifice" },
            { "core": "offer_ritual", "gloss": "offer (ritual)" },
            { "core": "anoint", "gloss": "anoint" },
            { "core": "purify", "gloss": "purify" },
            { "core": "consecrate", "gloss": "consecrate" },
            { "core": "circumcise", "gloss": "circumcise" },
            { "core": "bury", "gloss": "bury" },
            { "core": "mourn_ritual", "gloss": "mourn (ritual)" },
            { "core": "fast", "gloss": "fast" },
            { "core": "feast", "gloss": "feast" },
            { "core": "celebrate", "gloss": "celebrate" },
            { "core": "vow", "gloss": "vow" },
            { "core": "redeem", "gloss": "redeem" }
        ],
        "META": [
            { "core": "opening", "gloss": "story opening" },
            { "core": "closing", "gloss": "story closing" },
            { "core": "evaluation", "gloss": "narrator evaluation" },
            { "core": "transition", "gloss": "transition marker" },
            { "core": "aside", "gloss": "narrator aside" }
        ]
    },

    # 3. MAPPING (For backwards compatibility or internal logic)
    "semantic_roles": [
        "doer", "undergoer", "feeler", "receiver", "causer", 
        "beneficiary", "instrument", "location", "goal", "source", 
        "time", "manner", "content", "topic", "addressee",
        # Extended from JS
        "hearer", "message", "origin", "destination", "place", "path", 
        "tool", "companion", "benefactor", "reason", "way", "timing"
    ],

    # 4. PARTICIPANT TYPES
    "participant_types": [
        "person", "group", "divine", "animal", "plant", 
        "object", "place", "abstract", "time", "event",
        # Added from v1
        "thing", "stuff", "time_entity", "idea"
    ],

    # 4b. PARTICIPANT PROPERTIES
    "participant_properties": {
        "quantities": [
            "one", "two", "few", "many", "all", "mass", "unknown"
        ],
        "reference_status": [
            "new_mention", "known", "pointed", "kind"
        ],
        "dimensions": {
            "color": ["red", "blue", "green", "yellow", "black", "white", "brown", "golden", "purple", "gray", "scarlet", "crimson"],
            "size": ["big", "small", "tall", "short", "long", "wide", "narrow", "thick", "thin", "huge", "tiny"],
            "age": ["old", "young", "new", "ancient", "fresh"],
            "condition": ["wet", "dry", "clean", "dirty", "broken", "whole", "ripe", "rotten", "alive", "dead", "healthy", "sick", "injured", "tired", "empty", "full"],
            "value": ["good", "bad", "beautiful", "ugly", "holy", "unclean", "righteous", "wicked", "precious", "worthless", "pure", "impure"],
            "character": ["wise", "foolish", "kind", "cruel", "brave", "cowardly", "faithful", "treacherous", "humble", "proud", "honest", "generous", "selfish", "patient", "just"],
            "social_status": ["rich", "poor", "powerful", "weak", "honored", "despised", "noble", "common", "free", "slave"],
            "physical_state": ["strong", "weak", "beautiful", "plain", "blind", "deaf", "lame", "barren", "fertile"],
            "emotional_state": ["happy", "sad", "angry", "afraid", "peaceful", "anxious", "hopeful", "despairing"],
            "shape": [] # Added as it was in v2, kept for compatibility
        },
        "degrees": ["slightly", "moderately", "very", "extremely"]
    },

    # 5. RELATION CATEGORIES (With Subtypes)
    "relation_categories": [
        "kinship", "social", "possession", "part_whole", "origin",
        "spatial", "temporal", "logical", "comparison" # Kept v2 additions
    ],
    
    "relation_subtypes": {
        "kinship": [
            "parent_of", "child_of", "spouse_of", "sibling_of", 
            "grandparent_of", "grandchild_of", "uncle_aunt_of", 
            "nephew_niece_of", "in_law_of", "ancestor_of", "descendant_of"
        ],
        "social": [
            "master_of", "servant_of", "ruler_of", "subject_of",
            "teacher_of", "student_of", "leader_of", "follower_of",
            "friend_of", "enemy_of", "ally_of"
        ],
        "possession": ["owner_of", "property_of", "controller_of"],
        "part_whole": ["part_of", "whole_of", "member_of", "group_of"],
        "origin": ["from_place", "from_people", "created_by"]
    },

    # 6. EVENT MODIFIERS (Enums)
    "event_modifiers": {
        "happened": ["yes", "no", "uncertain"],
        "realness": ["real", "possible", "required", "imagined"],
        "when": ["before_now", "at_now", "after_now", "always"],
        "viewpoint": ["as_whole", "as_ongoing", "as_state"],
        "phase": ["none", "starting", "stopping", "continuing", "finishing"],
        "repetition": ["once", "repeated", "customary"],
        "onPurpose": ["intended", "unintended", "unclear"],
        "howKnown": ["saw_it", "sensed_it", "figured_out", "was_told", "unspecified"],
        "causation": ["direct", "caused", "allowed", "helped"]
    },

    # 7. DISCOURSE RELATIONS
    "discourse_relations": [
        "sequence", "simultaneous", "cause", "result", "purpose", 
        "condition", "concession", "contrast", "explanation", 
        "elaboration", "background", "setting",
        # Added from v1
        "circumstance"
    ],

    # 8. EMOTIONS
    "emotions": [
        # Positive
        "joy", "hope", "gratitude", "love", "relief", "contentment", 
        "compassion", "pride",
        # Negative
        "grief", "sorrow", "fear", "anger", "despair", "shame", 
        "guilt", "jealousy", "bitterness", "loneliness", "anxiety", 
        "disgust", "frustration", "desolation",
        # Complex
        "resolve", "longing", "awe", "surprise", "confusion", 
        "ambivalence", "resignation", "anticipation",
        # v2 Additions (kept)
        "pity", "trust", "distrust", "contempt", "satisfaction", "determination", "envy", "hate"
    ],
    
    # 9. SPEECH ACTS
    "speech_acts": [
        "stating", "asking_yes_no", "asking_what", "asking_why", "asking_how",
        "ordering", "forbidding", "requesting", "wishing", "promising",
        "warning", "greeting", "exclaiming", "blessing", "cursing"
    ],
    
    "quotation_types": ["direct", "indirect", "free_indirect"],

    # 10. STAGE 4: ADVANCED LAYERS
    "pragmatic": {
        "register": ["narrative_formal", "narrative_casual", "speech_royal", "speech_formal", "speech_casual", "speech_intimate", "ceremonial", "legal", "poetic", "proverbial", "unspecified"],
        "social_axis": ["superior_to_inferior", "inferior_to_superior", "peer_to_peer", "divine_to_human", "human_to_divine", "prophet_to_authority", "stranger", "unspecified"],
        "prominence": ["peak", "high", "medium", "low"],
        "pacing": ["expanded", "normal", "compressed", "abrupt"]
    },
    
    "figurative": {
        "types": ["metaphor", "simile", "metonymy", "synecdoche", "idiom", "hyperbole", "euphemism", "personification", "merism", "hendiadys", "irony", "rhetorical_question", "apostrophe", "anthropomorphism", "other"],
        "transferability": ["universal", "near_universal", "cultural", "unique", "unknown"]
    },
    
    "key_terms": {
        "semantic_domains": ["divine_name", "theological", "ritual", "kinship", "legal", "agricultural", "geographical", "cultural", "emotional", "other"],
        "consistency_levels": ["always", "preferred", "flexible"]
    },
    
    "la_retrieval_tags": {
        "emotion_tags": ["grief_at_death", "joy_reunion", "fear_danger", "love_declaration"],
        "event_tags": ["death_narrative", "journey_departure", "divine_speech", "wedding", "battle"],
        "register_tags": ["formal_narrative", "royal_speech", "casual_dialogue", "prayer"],
        "discourse_tags": ["peak_moment", "background_info", "story_opening", "story_closing"],
        "social_tags": ["servant_to_master", "prophet_to_king", "peer_conversation", "parent_child"]
    },
    
    "narrator_stance": ["sympathetic", "critical", "neutral", "ironic", "celebratory", "mournful", "tense", "matter_of_fact"],
    "audience_response": ["pathos", "fear", "hope", "outrage", "joy", "awe", "reflection", "anticipation", "relief", "conviction"]
}
