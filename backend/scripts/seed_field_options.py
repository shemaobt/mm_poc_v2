#!/usr/bin/env python3
"""
Seed script to populate FieldOption table with default dropdown options.
Run this script to initialize or reset all dropdown options.

Usage:
    python scripts/seed_field_options.py
"""

import asyncio
from prisma import Prisma

# All default options organized by category
# These match the hardcoded values in the frontend components

SEED_DATA = {
    # ===========================================
    # Stage 2: Participants
    # ===========================================
    "participant_type": [
        {"value": "person", "label": "Person"},
        {"value": "group", "label": "Group"},
        {"value": "divine", "label": "Divine"},
        {"value": "animal", "label": "Animal"},
        {"value": "plant", "label": "Plant"},
        {"value": "object", "label": "Object"},
        {"value": "place", "label": "Place"},
        {"value": "abstract", "label": "Abstract"},
        {"value": "time", "label": "Time"},
        {"value": "event", "label": "Event"},
        # Extended types from AI
        {"value": "collective_human", "label": "Collective Human"},
        {"value": "collective", "label": "Collective"},
        {"value": "human", "label": "Human"},
        {"value": "thing", "label": "Thing"},
        {"value": "stuff", "label": "Stuff"},
        {"value": "time_entity", "label": "Time Entity"},
        {"value": "idea", "label": "Idea"},
        {"value": "location", "label": "Location"},
        {"value": "deity", "label": "Deity"},
        {"value": "entity", "label": "Entity"},
        {"value": "concept", "label": "Concept"},
        {"value": "material", "label": "Material"},
        {"value": "substance", "label": "Substance"},
        {"value": "structure", "label": "Structure"},
        {"value": "building", "label": "Building"},
    ],
    
    "quantity": [
        {"value": "one", "label": "One"},
        {"value": "two", "label": "Two"},
        {"value": "few", "label": "Few"},
        {"value": "many", "label": "Many"},
        {"value": "all", "label": "All"},
        {"value": "mass", "label": "Mass"},
        {"value": "unknown", "label": "Unknown"},
        # Extended quantities from AI
        {"value": "unified_set", "label": "Unified Set"},
        {"value": "collective", "label": "Collective"},
        {"value": "dual", "label": "Dual"},
        {"value": "plural", "label": "Plural"},
        {"value": "singular", "label": "Singular"},
        {"value": "pair", "label": "Pair"},
        {"value": "multiple", "label": "Multiple"},
        {"value": "some", "label": "Some"},
        {"value": "none", "label": "None"},
    ],
    
    "reference_status": [
        {"value": "new_mention", "label": "New Mention"},
        {"value": "known", "label": "Known"},
        {"value": "pointed", "label": "Pointed"},
        {"value": "kind", "label": "Kind"},
        # Extended statuses from AI
        {"value": "new", "label": "New"},
        {"value": "old", "label": "Old"},
        {"value": "given", "label": "Given"},
        {"value": "accessible", "label": "Accessible"},
        {"value": "inferrable", "label": "Inferrable"},
        {"value": "brand_new", "label": "Brand New"},
        {"value": "unused", "label": "Unused"},
        {"value": "active", "label": "Active"},
        {"value": "semi_active", "label": "Semi Active"},
    ],
    
    # Property dimensions for participants
    "property_dimension": [
        {"value": "color", "label": "Color"},
        {"value": "size", "label": "Size"},
        {"value": "age", "label": "Age"},
        {"value": "condition", "label": "Condition"},
        {"value": "value", "label": "Value"},
        {"value": "character", "label": "Character"},
        {"value": "social_status", "label": "Social Status"},
        {"value": "physical_state", "label": "Physical State"},
        {"value": "emotional_state", "label": "Emotional State"},
        {"value": "shape", "label": "Shape"},
        {"value": "unity", "label": "Unity"},
        {"value": "language", "label": "Language"},
        {"value": "function", "label": "Function"},
        {"value": "terrain", "label": "Terrain"},
        {"value": "region", "label": "Region"},
        {"value": "direction", "label": "Direction"},
        {"value": "material", "label": "Material"},
        {"value": "purpose", "label": "Purpose"},
    ],
    
    # Property values by dimension
    "property_color": [
        {"value": "red", "label": "Red"},
        {"value": "blue", "label": "Blue"},
        {"value": "green", "label": "Green"},
        {"value": "yellow", "label": "Yellow"},
        {"value": "black", "label": "Black"},
        {"value": "white", "label": "White"},
        {"value": "brown", "label": "Brown"},
        {"value": "golden", "label": "Golden"},
        {"value": "purple", "label": "Purple"},
        {"value": "gray", "label": "Gray"},
        {"value": "scarlet", "label": "Scarlet"},
        {"value": "crimson", "label": "Crimson"},
    ],
    
    "property_size": [
        {"value": "big", "label": "Big"},
        {"value": "small", "label": "Small"},
        {"value": "tall", "label": "Tall"},
        {"value": "short", "label": "Short"},
        {"value": "long", "label": "Long"},
        {"value": "wide", "label": "Wide"},
        {"value": "narrow", "label": "Narrow"},
        {"value": "thick", "label": "Thick"},
        {"value": "thin", "label": "Thin"},
        {"value": "huge", "label": "Huge"},
        {"value": "tiny", "label": "Tiny"},
    ],
    
    "property_age": [
        {"value": "old", "label": "Old"},
        {"value": "young", "label": "Young"},
        {"value": "new", "label": "New"},
        {"value": "ancient", "label": "Ancient"},
        {"value": "fresh", "label": "Fresh"},
    ],
    
    "property_condition": [
        {"value": "wet", "label": "Wet"},
        {"value": "dry", "label": "Dry"},
        {"value": "clean", "label": "Clean"},
        {"value": "dirty", "label": "Dirty"},
        {"value": "broken", "label": "Broken"},
        {"value": "whole", "label": "Whole"},
        {"value": "ripe", "label": "Ripe"},
        {"value": "rotten", "label": "Rotten"},
        {"value": "alive", "label": "Alive"},
        {"value": "dead", "label": "Dead"},
        {"value": "healthy", "label": "Healthy"},
        {"value": "sick", "label": "Sick"},
        {"value": "injured", "label": "Injured"},
        {"value": "tired", "label": "Tired"},
        {"value": "empty", "label": "Empty"},
        {"value": "full", "label": "Full"},
    ],
    
    "property_value": [
        {"value": "good", "label": "Good"},
        {"value": "bad", "label": "Bad"},
        {"value": "beautiful", "label": "Beautiful"},
        {"value": "ugly", "label": "Ugly"},
        {"value": "holy", "label": "Holy"},
        {"value": "unclean", "label": "Unclean"},
        {"value": "righteous", "label": "Righteous"},
        {"value": "wicked", "label": "Wicked"},
        {"value": "precious", "label": "Precious"},
        {"value": "worthless", "label": "Worthless"},
        {"value": "pure", "label": "Pure"},
        {"value": "impure", "label": "Impure"},
    ],
    
    "property_character": [
        {"value": "wise", "label": "Wise"},
        {"value": "foolish", "label": "Foolish"},
        {"value": "kind", "label": "Kind"},
        {"value": "cruel", "label": "Cruel"},
        {"value": "brave", "label": "Brave"},
        {"value": "cowardly", "label": "Cowardly"},
        {"value": "faithful", "label": "Faithful"},
        {"value": "treacherous", "label": "Treacherous"},
        {"value": "humble", "label": "Humble"},
        {"value": "proud", "label": "Proud"},
        {"value": "honest", "label": "Honest"},
        {"value": "generous", "label": "Generous"},
        {"value": "selfish", "label": "Selfish"},
        {"value": "patient", "label": "Patient"},
        {"value": "just", "label": "Just"},
    ],
    
    "property_social_status": [
        {"value": "rich", "label": "Rich"},
        {"value": "poor", "label": "Poor"},
        {"value": "powerful", "label": "Powerful"},
        {"value": "weak", "label": "Weak"},
        {"value": "honored", "label": "Honored"},
        {"value": "despised", "label": "Despised"},
        {"value": "noble", "label": "Noble"},
        {"value": "common", "label": "Common"},
        {"value": "free", "label": "Free"},
        {"value": "slave", "label": "Slave"},
    ],
    
    "property_physical_state": [
        {"value": "strong", "label": "Strong"},
        {"value": "weak", "label": "Weak"},
        {"value": "beautiful", "label": "Beautiful"},
        {"value": "plain", "label": "Plain"},
        {"value": "blind", "label": "Blind"},
        {"value": "deaf", "label": "Deaf"},
        {"value": "lame", "label": "Lame"},
        {"value": "barren", "label": "Barren"},
        {"value": "fertile", "label": "Fertile"},
    ],
    
    "property_emotional_state": [
        {"value": "happy", "label": "Happy"},
        {"value": "sad", "label": "Sad"},
        {"value": "angry", "label": "Angry"},
        {"value": "afraid", "label": "Afraid"},
        {"value": "peaceful", "label": "Peaceful"},
        {"value": "anxious", "label": "Anxious"},
        {"value": "hopeful", "label": "Hopeful"},
        {"value": "despairing", "label": "Despairing"},
    ],
    
    "property_unity": [
        {"value": "unified", "label": "Unified"},
        {"value": "divided", "label": "Divided"},
        {"value": "scattered", "label": "Scattered"},
        {"value": "one", "label": "One"},
        {"value": "many", "label": "Many"},
    ],
    
    "property_language": [
        {"value": "one_language", "label": "One Language"},
        {"value": "many_languages", "label": "Many Languages"},
        {"value": "same_language", "label": "Same Language"},
        {"value": "different_languages", "label": "Different Languages"},
    ],
    
    "property_function": [
        {"value": "communication", "label": "Communication"},
        {"value": "speech_content", "label": "Speech Content"},
        {"value": "material", "label": "Material"},
        {"value": "structural", "label": "Structural"},
        {"value": "ceremonial", "label": "Ceremonial"},
        {"value": "religious", "label": "Religious"},
    ],
    
    "property_terrain": [
        {"value": "flat_plain", "label": "Flat Plain"},
        {"value": "mountain", "label": "Mountain"},
        {"value": "valley", "label": "Valley"},
        {"value": "river", "label": "River"},
        {"value": "desert", "label": "Desert"},
        {"value": "plain", "label": "Plain"},
        {"value": "hill", "label": "Hill"},
        {"value": "coastal", "label": "Coastal"},
    ],
    
    "property_region": [
        {"value": "Mesopotamia", "label": "Mesopotamia"},
        {"value": "Canaan", "label": "Canaan"},
        {"value": "Egypt", "label": "Egypt"},
        {"value": "Babylon", "label": "Babylon"},
        {"value": "Shinar", "label": "Shinar"},
        {"value": "Assyria", "label": "Assyria"},
        {"value": "Persia", "label": "Persia"},
    ],
    
    "property_direction": [
        {"value": "east", "label": "East"},
        {"value": "west", "label": "West"},
        {"value": "north", "label": "North"},
        {"value": "south", "label": "South"},
        {"value": "up", "label": "Up"},
        {"value": "down", "label": "Down"},
    ],
    
    "property_material": [
        {"value": "stone", "label": "Stone"},
        {"value": "brick", "label": "Brick"},
        {"value": "clay", "label": "Clay"},
        {"value": "wood", "label": "Wood"},
        {"value": "metal", "label": "Metal"},
        {"value": "gold", "label": "Gold"},
        {"value": "silver", "label": "Silver"},
        {"value": "bronze", "label": "Bronze"},
        {"value": "iron", "label": "Iron"},
    ],
    
    "property_purpose": [
        {"value": "dwelling", "label": "Dwelling"},
        {"value": "worship", "label": "Worship"},
        {"value": "defense", "label": "Defense"},
        {"value": "storage", "label": "Storage"},
        {"value": "monument", "label": "Monument"},
    ],
    
    # ===========================================
    # Stage 3: Relations
    # ===========================================
    "relation_category": [
        {"value": "kinship", "label": "Kinship"},
        {"value": "social", "label": "Social"},
        {"value": "possession", "label": "Possession"},
        {"value": "part_whole", "label": "Part/Whole"},
        {"value": "origin", "label": "Origin"},
        {"value": "spatial", "label": "Spatial"},
        {"value": "temporal", "label": "Temporal"},
        {"value": "logical", "label": "Logical"},
        {"value": "comparison", "label": "Comparison"},
    ],
    
    # ===========================================
    # Stage 4: Events
    # ===========================================
    "event_category": [
        {"value": "ACTION", "label": "Doing (action)"},
        {"value": "SPEECH", "label": "Saying (speech)"},
        {"value": "MOTION", "label": "Moving (motion)"},
        {"value": "STATE", "label": "Being (state)"},
        {"value": "PROCESS", "label": "Process"},
        {"value": "TRANSFER", "label": "Transfer"},
        {"value": "INTERNAL", "label": "Internal (mental)"},
        {"value": "RITUAL", "label": "Ritual"},
        {"value": "META", "label": "Meta (narrative)"},
    ],
    
    "semantic_role": [
        # Core thematic roles
        {"value": "doer", "label": "Doer (agent)"},
        {"value": "undergoer", "label": "Undergoer (patient)"},
        {"value": "feeler", "label": "Feeler (experiencer)"},
        {"value": "receiver", "label": "Receiver"},
        {"value": "recipient", "label": "Recipient"},
        {"value": "causer", "label": "Causer"},
        {"value": "beneficiary", "label": "Beneficiary"},
        {"value": "benefactor", "label": "Benefactor"},
        {"value": "instrument", "label": "Instrument"},
        {"value": "tool", "label": "Tool"},
        # Location/direction roles
        {"value": "location", "label": "Location"},
        {"value": "place", "label": "Place"},
        {"value": "goal", "label": "Goal/Destination"},
        {"value": "destination", "label": "Destination"},
        {"value": "source", "label": "Source/Origin"},
        {"value": "origin", "label": "Origin"},
        {"value": "path", "label": "Path"},
        # Temporal/manner roles
        {"value": "time", "label": "Time"},
        {"value": "timing", "label": "Timing"},
        {"value": "manner", "label": "Manner"},
        {"value": "way", "label": "Way"},
        # Speech act roles
        {"value": "hearer", "label": "Hearer"},
        {"value": "speaker", "label": "Speaker"},
        {"value": "message", "label": "Message"},
        {"value": "addressee", "label": "Addressee"},
        # Additional roles
        {"value": "companion", "label": "Companion"},
        {"value": "attribute", "label": "Attribute (property/state)"},
        {"value": "theme", "label": "Theme"},
        {"value": "stimulus", "label": "Stimulus"},
        {"value": "possessor", "label": "Possessor"},
        {"value": "possessed", "label": "Possessed"},
        {"value": "content", "label": "Content (speech/thought)"},
        {"value": "result", "label": "Result"},
        {"value": "cause", "label": "Cause"},
        {"value": "reason", "label": "Reason"},
        # Construction/creation roles
        {"value": "builder", "label": "Builder"},
        {"value": "product", "label": "Product (created thing)"},
        {"value": "material", "label": "Material"},
        # Exchange/substitution roles
        {"value": "substitute_for", "label": "Substitute for"},
        {"value": "price", "label": "Price"},
        # Perception/cognition roles
        {"value": "perceiver", "label": "Perceiver"},
        {"value": "phenomenon", "label": "Phenomenon (perceived)"},
        {"value": "cognizer", "label": "Cognizer"},
        {"value": "topic", "label": "Topic"},
    ],
    
    # Event Modifiers
    "modifier_happened": [
        {"value": "yes", "label": "Yes"},
        {"value": "no", "label": "No (negated)"},
        {"value": "uncertain", "label": "Uncertain"},
    ],
    
    "modifier_realness": [
        {"value": "real", "label": "Real (factual)"},
        {"value": "possible", "label": "Possible"},
        {"value": "required", "label": "Required (must happen)"},
        {"value": "imagined", "label": "Imagined/Hypothetical"},
    ],
    
    "modifier_when": [
        {"value": "before_now", "label": "Before reference time"},
        {"value": "at_now", "label": "At reference time"},
        {"value": "after_now", "label": "After reference time"},
        {"value": "always", "label": "Always/Timeless"},
    ],
    
    "modifier_viewpoint": [
        {"value": "as_whole", "label": "As whole (complete)"},
        {"value": "as_ongoing", "label": "As ongoing (in progress)"},
        {"value": "as_state", "label": "As state (result)"},
    ],
    
    "modifier_phase": [
        {"value": "none", "label": "None specified"},
        {"value": "starting", "label": "Starting"},
        {"value": "stopping", "label": "Stopping"},
        {"value": "continuing", "label": "Continuing"},
        {"value": "finishing", "label": "Finishing"},
    ],
    
    "modifier_repetition": [
        {"value": "once", "label": "Once"},
        {"value": "repeated", "label": "Repeated"},
        {"value": "customary", "label": "Customary/Habitual"},
    ],
    
    "modifier_on_purpose": [
        {"value": "intended", "label": "Intended"},
        {"value": "unintended", "label": "Unintended"},
        {"value": "unclear", "label": "Unclear"},
    ],
    
    "modifier_how_known": [
        {"value": "saw_it", "label": "Direct visual"},
        {"value": "sensed_it", "label": "Other sensory"},
        {"value": "figured_out", "label": "Inferred"},
        {"value": "was_told", "label": "Reported/Hearsay"},
        {"value": "unspecified", "label": "Unspecified"},
    ],
    
    "modifier_causation": [
        {"value": "direct", "label": "Direct"},
        {"value": "caused", "label": "Caused (by agent)"},
        {"value": "allowed", "label": "Allowed"},
        {"value": "helped", "label": "Helped"},
    ],
    
    # Speech Acts
    "speech_act_type": [
        {"value": "stating", "label": "Stating (assertion)"},
        {"value": "asking_yes_no", "label": "Asking (yes/no)"},
        {"value": "asking_what", "label": "Asking (content)"},
        {"value": "asking_why", "label": "Asking (reason)"},
        {"value": "asking_how", "label": "Asking (manner)"},
        {"value": "ordering", "label": "Ordering (command)"},
        {"value": "forbidding", "label": "Forbidding"},
        {"value": "requesting", "label": "Requesting"},
        {"value": "wishing", "label": "Wishing"},
        {"value": "promising", "label": "Promising"},
        {"value": "warning", "label": "Warning"},
        {"value": "greeting", "label": "Greeting"},
        {"value": "exclaiming", "label": "Exclaiming"},
        {"value": "blessing", "label": "Blessing"},
        {"value": "cursing", "label": "Cursing"},
    ],
    
    "quotation_type": [
        {"value": "direct", "label": "Direct speech"},
        {"value": "indirect", "label": "Indirect speech"},
        {"value": "free_indirect", "label": "Free indirect"},
    ],
    
    # Discourse
    "discourse_function": [
        {"value": "mainline", "label": "Mainline (foreground)"},
        {"value": "background", "label": "Background"},
        {"value": "offline", "label": "Offline (aside/comment)"},
        {"value": "setting", "label": "Setting"},
        {"value": "peak", "label": "Peak"},
        {"value": "closing", "label": "Closing"},
        {"value": "embedded_speech", "label": "Embedded Speech"},
        {"value": "quotation", "label": "Quotation"},
    ],
    
    "narrative_function": [
        {"value": "setting", "label": "Setting (establishes time/place/characters)"},
        {"value": "inciting_incident", "label": "Inciting Incident (triggers the story)"},
        {"value": "initiating_action", "label": "Initiating Action"},
        {"value": "complication", "label": "Complication (raises tension)"},
        {"value": "development", "label": "Development (plot advances)"},
        {"value": "peak", "label": "Peak (climax/turning point)"},
        {"value": "turning_point", "label": "Turning Point"},
        {"value": "resolution", "label": "Resolution (outcome)"},
        {"value": "conclusion", "label": "Conclusion"},
        {"value": "coda", "label": "Coda (final reflection)"},
        {"value": "background", "label": "Background (supporting info)"},
        {"value": "evaluation", "label": "Evaluation (narrator comment)"},
        {"value": "comment", "label": "Comment"},
        {"value": "flashback", "label": "Flashback (prior event)"},
        {"value": "foreshadowing", "label": "Foreshadowing (hints at future)"},
    ],
    
    "chain_position": [
        {"value": "initial", "label": "Initial (new chain)"},
        {"value": "medial", "label": "Medial (middle of chain)"},
        {"value": "final", "label": "Final (end of chain)"},
        {"value": "continuation", "label": "Continuation"},
        {"value": "resumption", "label": "Resumption"},
        {"value": "break", "label": "Break"},
    ],
    
    # Pragmatic
    "discourse_register": [
        {"value": "narrative_formal", "label": "Narrative (formal)"},
        {"value": "narrative_casual", "label": "Narrative (casual)"},
        {"value": "speech_formal", "label": "Speech (formal)"},
        {"value": "speech_casual", "label": "Speech (casual)"},
        {"value": "ceremonial", "label": "Ceremonial"},
        {"value": "legal", "label": "Legal"},
        {"value": "poetic", "label": "Poetic"},
        {"value": "prophetic", "label": "Prophetic"},
    ],
    
    "social_axis": [
        {"value": "superior_to_inferior", "label": "Superior to inferior"},
        {"value": "inferior_to_superior", "label": "Inferior to superior"},
        {"value": "peer_to_peer", "label": "Peer to peer"},
        {"value": "divine_to_human", "label": "Divine to human"},
        {"value": "human_to_divine", "label": "Human to divine"},
    ],
    
    "prominence": [
        {"value": "peak", "label": "Peak (highest)"},
        {"value": "high", "label": "High"},
        {"value": "medium", "label": "Medium"},
        {"value": "low", "label": "Low"},
    ],
    
    "pacing": [
        {"value": "expanded", "label": "Expanded (slow)"},
        {"value": "normal", "label": "Normal"},
        {"value": "compressed", "label": "Compressed (fast)"},
        {"value": "abrupt", "label": "Abrupt"},
    ],
    
    # Emotions
    "emotion_primary": [
        {"value": "joy", "label": "Joy"},
        {"value": "grief", "label": "Grief"},
        {"value": "fear", "label": "Fear"},
        {"value": "anger", "label": "Anger"},
        {"value": "love", "label": "Love"},
        {"value": "hate", "label": "Hate"},
        {"value": "surprise", "label": "Surprise"},
        {"value": "disgust", "label": "Disgust"},
        {"value": "shame", "label": "Shame"},
        {"value": "pride", "label": "Pride"},
        {"value": "hope", "label": "Hope"},
        {"value": "despair", "label": "Despair"},
        {"value": "gratitude", "label": "Gratitude"},
        {"value": "jealousy", "label": "Jealousy"},
        {"value": "compassion", "label": "Compassion"},
        {"value": "awe", "label": "Awe"},
        {"value": "contentment", "label": "Contentment"},
        {"value": "anxiety", "label": "Anxiety"},
    ],
    
    "emotion_intensity": [
        {"value": "low", "label": "Low"},
        {"value": "medium", "label": "Medium"},
        {"value": "high", "label": "High"},
        {"value": "extreme", "label": "Extreme"},
    ],
    
    "emotion_source": [
        {"value": "lexical", "label": "Lexical (word choice)"},
        {"value": "syntactic", "label": "Syntactic (structure)"},
        {"value": "somatic", "label": "Somatic (body language)"},
        {"value": "actional", "label": "Actional (actions)"},
        {"value": "contextual", "label": "Contextual (situation)"},
        {"value": "figurative", "label": "Figurative (metaphor etc.)"},
    ],
    
    "confidence": [
        {"value": "certain", "label": "Certain"},
        {"value": "high", "label": "High"},
        {"value": "medium", "label": "Medium"},
        {"value": "low", "label": "Low"},
    ],
    
    # Narrator & Audience
    "narrator_stance": [
        {"value": "sympathetic", "label": "Sympathetic"},
        {"value": "critical", "label": "Critical"},
        {"value": "neutral", "label": "Neutral"},
        {"value": "ironic", "label": "Ironic"},
        {"value": "celebratory", "label": "Celebratory"},
        {"value": "mourning", "label": "Mourning"},
        {"value": "warning", "label": "Warning"},
    ],
    
    "audience_response": [
        {"value": "pathos", "label": "Pathos (pity)"},
        {"value": "fear", "label": "Fear"},
        {"value": "hope", "label": "Hope"},
        {"value": "outrage", "label": "Outrage"},
        {"value": "joy", "label": "Joy"},
        {"value": "awe", "label": "Awe"},
        {"value": "relief", "label": "Relief"},
        {"value": "suspense", "label": "Suspense"},
        {"value": "satisfaction", "label": "Satisfaction"},
    ],
    
    # Figurative Language
    "figure_type": [
        {"value": "metaphor", "label": "Metaphor (A is B)"},
        {"value": "simile", "label": "Simile (A is like B)"},
        {"value": "metonymy", "label": "Metonymy"},
        {"value": "synecdoche", "label": "Synecdoche (part for whole)"},
        {"value": "idiom", "label": "Idiom (fixed expression)"},
        {"value": "hyperbole", "label": "Hyperbole (exaggeration)"},
        {"value": "euphemism", "label": "Euphemism (softened)"},
        {"value": "personification", "label": "Personification"},
        {"value": "merism", "label": "Merism (extremes = all)"},
        {"value": "hendiadys", "label": "Hendiadys (two = one)"},
        {"value": "irony", "label": "Irony"},
        {"value": "rhetorical_question", "label": "Rhetorical question"},
        {"value": "apostrophe", "label": "Apostrophe (address absent)"},
        {"value": "anthropomorphism", "label": "Anthropomorphism"},
        {"value": "other", "label": "Other"},
    ],
    
    "transferability": [
        {"value": "universal", "label": "Universal (transfers easily)"},
        {"value": "near_universal", "label": "Near universal"},
        {"value": "cultural", "label": "Culturally specific"},
        {"value": "unique", "label": "Unique to source"},
        {"value": "unknown", "label": "Unknown"},
    ],
    
    # Key Terms
    "semantic_domain": [
        {"value": "divine_name", "label": "Divine Name"},
        {"value": "theological", "label": "Theological Concept"},
        {"value": "ritual", "label": "Ritual/Ceremonial"},
        {"value": "kinship", "label": "Kinship Term"},
        {"value": "legal", "label": "Legal/Covenant"},
        {"value": "geographic", "label": "Geographic"},
        {"value": "cultural", "label": "Cultural Practice"},
        {"value": "other", "label": "Other"},
    ],
    
    "consistency": [
        {"value": "always", "label": "Always (same translation)"},
        {"value": "preferred", "label": "Preferred (usually same)"},
        {"value": "flexible", "label": "Flexible (context-dependent)"},
    ],
    
    # ===========================================
    # Stage 5: Discourse Relations
    # ===========================================
    "discourse_relation": [
        {"value": "sequence", "label": "Sequence (then)"},
        {"value": "simultaneous", "label": "Simultaneous (while)"},
        {"value": "cause", "label": "Cause (because)"},
        {"value": "result", "label": "Result (so)"},
        {"value": "purpose", "label": "Purpose (in order to)"},
        {"value": "contrast", "label": "Contrast (but)"},
        {"value": "elaboration", "label": "Elaboration (namely)"},
        {"value": "circumstance", "label": "Circumstance (when)"},
        {"value": "condition", "label": "Condition (if)"},
    ],
}


async def seed_options():
    """Seed the FieldOption table with default values."""
    db = Prisma()
    await db.connect()
    
    try:
        # First, check how many existing options we have
        existing_count = await db.fieldoption.count()
        print(f"Existing options in database: {existing_count}")
        
        total_created = 0
        total_skipped = 0
        
        for category, options in SEED_DATA.items():
            for sort_order, opt in enumerate(options):
                try:
                    await db.fieldoption.create(
                        data={
                            "category": category,
                            "value": opt["value"],
                            "label": opt["label"],
                            "isDefault": True,
                            "sortOrder": sort_order,
                            "createdBy": None,  # System-seeded
                        }
                    )
                    total_created += 1
                except Exception as e:
                    # Unique constraint violation - option already exists
                    if "Unique constraint" in str(e):
                        total_skipped += 1
                    else:
                        print(f"Error creating {category}/{opt['value']}: {e}")
        
        print(f"\nSeeding complete!")
        print(f"  Created: {total_created} options")
        print(f"  Skipped (already exist): {total_skipped} options")
        print(f"  Categories: {len(SEED_DATA)}")
        
        # Show final count
        final_count = await db.fieldoption.count()
        print(f"  Total options in database: {final_count}")
        
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_options())
