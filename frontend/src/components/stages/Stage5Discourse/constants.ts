export const CATEGORY_COLORS: Record<string, string> = {
    ACTION: 'bg-red-100 text-red-700 border-red-200',
    MOTION: 'bg-blue-100 text-blue-700 border-blue-200',
    STATE: 'bg-purple-100 text-purple-700 border-purple-200',
    SPEECH: 'bg-green-100 text-green-700 border-green-200',
    TRANSFER: 'bg-orange-100 text-orange-700 border-orange-200',
    INTERNAL: 'bg-pink-100 text-pink-700 border-pink-200',
    PROCESS: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    RITUAL: 'bg-amber-100 text-amber-700 border-amber-200',
    META: 'bg-gray-100 text-gray-700 border-gray-200',
}

export const DISCOURSE_RELATIONS_FALLBACK = [
    { value: 'sequence', label: 'Sequence (and then)' },
    { value: 'simultaneous', label: 'Simultaneous (while)' },
    { value: 'cause', label: 'Cause (because)' },
    { value: 'result', label: 'Result (therefore)' },
    { value: 'purpose', label: 'Purpose (in order to)' },
    { value: 'condition', label: 'Condition (if)' },
    { value: 'concession', label: 'Concession (although)' },
    { value: 'contrast', label: 'Contrast (but)' },
    { value: 'explanation', label: 'Explanation (that is)' },
    { value: 'elaboration', label: 'Elaboration' },
    { value: 'background', label: 'Background' },
    { value: 'setting', label: 'Setting' }
]
