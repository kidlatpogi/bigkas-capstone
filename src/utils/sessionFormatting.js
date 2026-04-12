export function getSessionMode(session) {
    const sessionOrigin = String(session?.session_origin || '').toLowerCase().trim();
    if (sessionOrigin.includes('pre-test') || sessionOrigin.includes('pretest')) return 'Pre-Test';
    if (sessionOrigin.includes('practice')) return 'Practice';
    if (sessionOrigin.includes('train')) return 'Training';

    const raw = [
        session?.session_mode,
        session?.mode,
        session?.session_type,
        session?.session_origin,
        session?.speaking_mode,
        session?.entry_point,
    ]
        .filter((value) => typeof value === 'string' && value.trim())
        .join(' ')
        .toLowerCase();

    if (raw.includes('pre-test') || raw.includes('pretest')) return 'Pre-Test';
    if (raw.includes('practice')) return 'Practice';
    if (raw.includes('train')) return 'Training';
    return 'Training';
}

export function getRecentToneClass(score) {
    const numericScore = Number(score ?? 0);
    if (numericScore >= 85) return 'tone-high';
    if (numericScore >= 45) return 'tone-mid';
    return 'tone-low';
}

export function getSessionSpeechType(session) {
    const targetText = String(session?.transcript || session?.target_text || '').trim();
    const speechType = String(session?.speech_type || '').toLowerCase().trim();
    const speakingMode = String(session?.speaking_mode || '').toLowerCase().trim();
    const sessionMode = String(session?.session_mode || '').toLowerCase().trim();

    const freeSpeechTopics = [
        'tell me about yourself',
        'free speech',
        'free test',
        'free topic',
        'random topic',
    ];

    const lowerTargetText = targetText.toLowerCase();

    const raw = [
        session?.session_mode,
        session?.mode,
        session?.session_type,
        session?.session_origin,
        session?.speaking_mode,
        session?.entry_point,
    ]
        .filter((value) => typeof value === 'string' && value.trim())
        .join(' ')
        .toLowerCase();

    if (speechType === 'free') return 'Free Speech';
    if (speakingMode === 'free') return 'Free Speech';
    if (sessionMode === 'free') return 'Free Speech';

    if (raw.includes('free')) return 'Free Speech';
    if (raw.includes('randomizer')) return 'Free Speech';

    if (freeSpeechTopics.some(topic => lowerTargetText === topic)) {
        return 'Free Speech';
    }

    if (raw.includes('practice') && !raw.includes('script')) {
        return 'Free Speech';
    }

    if (raw.includes('training') && targetText) {
        const targetWords = targetText.split(/\s+/).filter(Boolean).length;
        const looksLikePrompt = targetWords > 0 && targetWords <= 18 && targetText.length <= 140;
        if (looksLikePrompt) {
            return 'Free Speech';
        }
    }

    return 'Training Session';
}
