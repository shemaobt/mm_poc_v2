/**
 * TRIPOD Constants - All dropdown options for the meaning map stages
 * Based on the Biblical Meaning Map (BMM) framework
 */

// ============================================================
// EVENT CATEGORIES
// ============================================================
export const EVENT_CATEGORIES = [
    { value: 'ACTION', label: 'Doing (action)' },
    { value: 'SPEECH', label: 'Saying (speech)' },
    { value: 'MOTION', label: 'Moving (motion)' },
    { value: 'STATE', label: 'Being (state)' },
    { value: 'PROCESS', label: 'Process' },
    { value: 'TRANSFER', label: 'Transfer' },
    { value: 'INTERNAL', label: 'Internal (mental)' },
    { value: 'RITUAL', label: 'Ritual' },
    { value: 'META', label: 'Meta (narrative)' }
]

// ============================================================
// SEMANTIC ROLES
// ============================================================
export const SEMANTIC_ROLES = [
    { value: 'doer', label: 'Doer (agent)' },
    { value: 'undergoer', label: 'Undergoer (patient)' },
    { value: 'feeler', label: 'Feeler (experiencer)' },
    { value: 'receiver', label: 'Receiver' },
    { value: 'causer', label: 'Causer' },
    { value: 'beneficiary', label: 'Beneficiary' },
    { value: 'instrument', label: 'Instrument' },
    { value: 'location', label: 'Location' },
    { value: 'goal', label: 'Goal/Destination' },
    { value: 'source', label: 'Source/Origin' },
    { value: 'time', label: 'Time' },
    { value: 'manner', label: 'Manner' },
    { value: 'hearer', label: 'Hearer' },
    { value: 'message', label: 'Message' },
    { value: 'companion', label: 'Companion' },
    { value: 'attribute', label: 'Attribute (property/state)' },
    { value: 'theme', label: 'Theme' },
    { value: 'stimulus', label: 'Stimulus' },
    { value: 'possessor', label: 'Possessor' },
    { value: 'possessed', label: 'Possessed' },
    { value: 'content', label: 'Content (speech/thought)' },
    { value: 'result', label: 'Result' },
    { value: 'cause', label: 'Cause' }
]

// ============================================================
// EVENT MODIFIERS
// ============================================================
export const MODIFIERS = {
    happened: {
        label: 'Did it happen?',
        options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No (negated)' },
            { value: 'uncertain', label: 'Uncertain' }
        ]
    },
    realness: {
        label: 'Realness',
        options: [
            { value: 'real', label: 'Real (factual)' },
            { value: 'possible', label: 'Possible' },
            { value: 'required', label: 'Required (must happen)' },
            { value: 'imagined', label: 'Imagined/Hypothetical' }
        ]
    },
    when: {
        label: 'When (relative)',
        options: [
            { value: 'before_now', label: 'Before reference time' },
            { value: 'at_now', label: 'At reference time' },
            { value: 'after_now', label: 'After reference time' },
            { value: 'always', label: 'Always/Timeless' }
        ]
    },
    viewpoint: {
        label: 'Viewpoint (aspect)',
        options: [
            { value: 'as_whole', label: 'As whole (complete)' },
            { value: 'as_ongoing', label: 'As ongoing (in progress)' },
            { value: 'as_state', label: 'As state (result)' }
        ]
    },
    phase: {
        label: 'Phase',
        options: [
            { value: 'none', label: 'None specified' },
            { value: 'starting', label: 'Starting' },
            { value: 'stopping', label: 'Stopping' },
            { value: 'continuing', label: 'Continuing' },
            { value: 'finishing', label: 'Finishing' }
        ]
    },
    repetition: {
        label: 'Repetition',
        options: [
            { value: 'once', label: 'Once' },
            { value: 'repeated', label: 'Repeated' },
            { value: 'customary', label: 'Customary/Habitual' }
        ]
    },
    onPurpose: {
        label: 'Intentionality',
        options: [
            { value: 'intended', label: 'Intended' },
            { value: 'unintended', label: 'Unintended' },
            { value: 'unclear', label: 'Unclear' }
        ]
    },
    howKnown: {
        label: 'Evidentiality',
        options: [
            { value: 'saw_it', label: 'Direct visual' },
            { value: 'sensed_it', label: 'Other sensory' },
            { value: 'figured_out', label: 'Inferred' },
            { value: 'was_told', label: 'Reported/Hearsay' },
            { value: 'unspecified', label: 'Unspecified' }
        ]
    },
    causation: {
        label: 'Causation',
        options: [
            { value: 'direct', label: 'Direct' },
            { value: 'caused', label: 'Caused (by agent)' },
            { value: 'allowed', label: 'Allowed' },
            { value: 'helped', label: 'Helped' }
        ]
    }
}

// ============================================================
// SPEECH ACTS
// ============================================================
export const SPEECH_ACTS = [
    { value: 'stating', label: 'Stating (assertion)' },
    { value: 'asking_yes_no', label: 'Asking (yes/no)' },
    { value: 'asking_what', label: 'Asking (content)' },
    { value: 'asking_why', label: 'Asking (reason)' },
    { value: 'asking_how', label: 'Asking (manner)' },
    { value: 'ordering', label: 'Ordering (command)' },
    { value: 'forbidding', label: 'Forbidding' },
    { value: 'requesting', label: 'Requesting' },
    { value: 'wishing', label: 'Wishing' },
    { value: 'promising', label: 'Promising' },
    { value: 'warning', label: 'Warning' },
    { value: 'greeting', label: 'Greeting' },
    { value: 'exclaiming', label: 'Exclaiming' },
    { value: 'blessing', label: 'Blessing' },
    { value: 'cursing', label: 'Cursing' }
]

export const QUOTATION_TYPES = [
    { value: 'direct', label: 'Direct speech' },
    { value: 'indirect', label: 'Indirect speech' },
    { value: 'free_indirect', label: 'Free indirect' }
]

// ============================================================
// DISCOURSE
// ============================================================
export const DISCOURSE_FUNCTIONS = [
    { value: 'mainline', label: 'Mainline (foreground)' },
    { value: 'background', label: 'Background' },
    { value: 'setting', label: 'Setting' },
    { value: 'peak', label: 'Peak' },
    { value: 'closing', label: 'Closing' }
]

export const NARRATIVE_FUNCTIONS = [
    { value: 'setting', label: 'Setting (establishes time/place/characters)' },
    { value: 'inciting_incident', label: 'Inciting Incident (triggers the story)' },
    { value: 'complication', label: 'Complication (raises tension)' },
    { value: 'peak', label: 'Peak (climax/turning point)' },
    { value: 'resolution', label: 'Resolution (outcome)' },
    { value: 'coda', label: 'Coda (final reflection)' },
    { value: 'background', label: 'Background (supporting info)' },
    { value: 'evaluation', label: 'Evaluation (narrator comment)' },
    { value: 'flashback', label: 'Flashback (prior event)' },
    { value: 'foreshadowing', label: 'Foreshadowing (hints at future)' }
]

export const CHAIN_POSITIONS = [
    { value: 'initial', label: 'Initial (new chain)' },
    { value: 'continuation', label: 'Continuation' },
    { value: 'resumption', label: 'Resumption' },
    { value: 'break', label: 'Break' }
]

// ============================================================
// PRAGMATIC
// ============================================================
export const DISCOURSE_REGISTERS = [
    { value: 'narrative_formal', label: 'Narrative (formal)' },
    { value: 'narrative_casual', label: 'Narrative (casual)' },
    { value: 'speech_formal', label: 'Speech (formal)' },
    { value: 'speech_casual', label: 'Speech (casual)' },
    { value: 'ceremonial', label: 'Ceremonial' },
    { value: 'legal', label: 'Legal' },
    { value: 'poetic', label: 'Poetic' },
    { value: 'prophetic', label: 'Prophetic' }
]

export const SOCIAL_AXES = [
    { value: 'superior_to_inferior', label: 'Superior to inferior' },
    { value: 'inferior_to_superior', label: 'Inferior to superior' },
    { value: 'peer_to_peer', label: 'Peer to peer' },
    { value: 'divine_to_human', label: 'Divine to human' },
    { value: 'human_to_divine', label: 'Human to divine' }
]

export const PROMINENCE_LEVELS = [
    { value: 'peak', label: 'Peak (highest)' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
]

export const PACING_OPTIONS = [
    { value: 'expanded', label: 'Expanded (slow)' },
    { value: 'normal', label: 'Normal' },
    { value: 'compressed', label: 'Compressed (fast)' },
    { value: 'abrupt', label: 'Abrupt' }
]

// ============================================================
// EMOTIONS
// ============================================================
export const EMOTIONS = [
    { value: 'joy', label: 'Joy' },
    { value: 'grief', label: 'Grief' },
    { value: 'fear', label: 'Fear' },
    { value: 'anger', label: 'Anger' },
    { value: 'love', label: 'Love' },
    { value: 'hate', label: 'Hate' },
    { value: 'surprise', label: 'Surprise' },
    { value: 'disgust', label: 'Disgust' },
    { value: 'shame', label: 'Shame' },
    { value: 'pride', label: 'Pride' },
    { value: 'hope', label: 'Hope' },
    { value: 'despair', label: 'Despair' },
    { value: 'gratitude', label: 'Gratitude' },
    { value: 'jealousy', label: 'Jealousy' },
    { value: 'compassion', label: 'Compassion' },
    { value: 'awe', label: 'Awe' },
    { value: 'contentment', label: 'Contentment' },
    { value: 'anxiety', label: 'Anxiety' }
]

export const EMOTION_INTENSITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'extreme', label: 'Extreme' }
]

export const EMOTION_SOURCES = [
    { value: 'lexical', label: 'Lexical (word choice)' },
    { value: 'syntactic', label: 'Syntactic (structure)' },
    { value: 'somatic', label: 'Somatic (body language)' },
    { value: 'actional', label: 'Actional (actions)' },
    { value: 'contextual', label: 'Contextual (situation)' },
    { value: 'figurative', label: 'Figurative (metaphor etc.)' }
]

export const CONFIDENCE_LEVELS = [
    { value: 'certain', label: 'Certain' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
]

// ============================================================
// NARRATOR STANCE & AUDIENCE RESPONSE
// ============================================================
export const NARRATOR_STANCES = [
    { value: 'sympathetic', label: 'Sympathetic' },
    { value: 'critical', label: 'Critical' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'ironic', label: 'Ironic' },
    { value: 'celebratory', label: 'Celebratory' },
    { value: 'mourning', label: 'Mourning' },
    { value: 'warning', label: 'Warning' }
]

export const AUDIENCE_RESPONSES = [
    { value: 'pathos', label: 'Pathos (pity)' },
    { value: 'fear', label: 'Fear' },
    { value: 'hope', label: 'Hope' },
    { value: 'outrage', label: 'Outrage' },
    { value: 'joy', label: 'Joy' },
    { value: 'awe', label: 'Awe' },
    { value: 'relief', label: 'Relief' },
    { value: 'suspense', label: 'Suspense' },
    { value: 'satisfaction', label: 'Satisfaction' }
]

// ============================================================
// FIGURATIVE LANGUAGE
// ============================================================
export const FIGURE_TYPES = [
    { value: 'metaphor', label: 'Metaphor (A is B)' },
    { value: 'simile', label: 'Simile (A is like B)' },
    { value: 'metonymy', label: 'Metonymy' },
    { value: 'synecdoche', label: 'Synecdoche (part for whole)' },
    { value: 'idiom', label: 'Idiom (fixed expression)' },
    { value: 'hyperbole', label: 'Hyperbole (exaggeration)' },
    { value: 'euphemism', label: 'Euphemism (softened)' },
    { value: 'personification', label: 'Personification' },
    { value: 'merism', label: 'Merism (extremes = all)' },
    { value: 'hendiadys', label: 'Hendiadys (two = one)' },
    { value: 'irony', label: 'Irony' },
    { value: 'rhetorical_question', label: 'Rhetorical question' },
    { value: 'apostrophe', label: 'Apostrophe (address absent)' },
    { value: 'anthropomorphism', label: 'Anthropomorphism' },
    { value: 'other', label: 'Other' }
]

export const TRANSFERABILITY = [
    { value: 'universal', label: 'Universal (transfers easily)' },
    { value: 'near_universal', label: 'Near universal' },
    { value: 'cultural', label: 'Culturally specific' },
    { value: 'unique', label: 'Unique to source' },
    { value: 'unknown', label: 'Unknown' }
]

// ============================================================
// KEY TERMS
// ============================================================
export const SEMANTIC_DOMAINS = [
    { value: 'divine_name', label: 'Divine Name' },
    { value: 'theological', label: 'Theological Concept' },
    { value: 'ritual', label: 'Ritual/Ceremonial' },
    { value: 'kinship', label: 'Kinship Term' },
    { value: 'legal', label: 'Legal/Covenant' },
    { value: 'geographic', label: 'Geographic' },
    { value: 'cultural', label: 'Cultural Practice' },
    { value: 'other', label: 'Other' }
]

export const CONSISTENCY_OPTIONS = [
    { value: 'always', label: 'Always (same translation)' },
    { value: 'preferred', label: 'Preferred (usually same)' },
    { value: 'flexible', label: 'Flexible (context-dependent)' }
]

// ============================================================
// DISCOURSE RELATIONS (for Stage 5)
// ============================================================
export const DISCOURSE_RELATIONS = [
    { value: 'sequence', label: 'Sequence (then)' },
    { value: 'simultaneous', label: 'Simultaneous (while)' },
    { value: 'cause', label: 'Cause (because)' },
    { value: 'result', label: 'Result (so)' },
    { value: 'purpose', label: 'Purpose (in order to)' },
    { value: 'contrast', label: 'Contrast (but)' },
    { value: 'elaboration', label: 'Elaboration (namely)' },
    { value: 'circumstance', label: 'Circumstance (when)' },
    { value: 'condition', label: 'Condition (if)' }
]

