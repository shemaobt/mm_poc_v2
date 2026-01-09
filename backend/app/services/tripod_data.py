"""
TRIPOD Data Schema Constants
Defines the semantic categories, roles, and options for the Meaning Maps
"""

TRIPOD_SCHEMA = {
    "event_categories": [
        "STATE", "MOTION", "ACTION", "TRANSFER", "SPEECH", 
        "INTERNAL", "PROCESS", "RITUAL", "META"
    ],
    "semantic_roles": [
        "doer", "undergoer", "feeler", "receiver", "causer", 
        "beneficiary", "instrument", "location", "goal", "source", 
        "time", "manner", "content", "topic", "addressee"
    ],
    "participant_types": [
        "person", "group", "divine", "animal", "plant", 
        "object", "place", "abstract", "time", "event"
    ],
    "relation_categories": [
        "kinship", "social", "possession", "part_whole", "origin",
        "spatial", "temporal", "logical", "comparison"
    ],
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
    "discourse_relations": [
        "sequence", "simultaneous", "cause", "result", "purpose", 
        "condition", "concession", "contrast", "explanation", 
        "elaboration", "background", "setting"
    ],
    "emotions": [
        "joy", "grief", "fear", "anger", "shame", "pride", "love", "hate",
        "envy", "pity", "trust", "distrust", "hope", "despair", "awe",
        "contempt", "guilt", "gratitude", "satisfaction", "disappointment",
        "relief", "anxiety", "confusion", "determination", "resignation"
    ],
    "property_dimensions": [
        "color", "size", "age", "condition", "value", "character", 
        "social_status", "physical_state", "quantity", "shape"
    ]
}
