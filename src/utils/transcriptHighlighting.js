export const FILLER_WORDS = [
  'um',
  'uh',
  'ah',
  'eh',
  'oh',
  'e',
  'er',
  'err',
  'erm',
  'em',
  'uhm',
  'uhu',
  'uhuh',
  'huh',
  'hm',
  'hmm',
  'mm',
  'mmm',
  'mhm',
  'mmhm',
  'mmhmm',
  'like',
  'well',
  'so',
  'okay',
  'ok',
  'actually',
  'basically',
  'literally',
  'honestly',
  'right',
  'alright',
  'anyway',
  'anyways',
  'kinda',
];

const FILLER_PHRASES = [
  ['you', 'know'],
  ['i', 'mean'],
  ['kind', 'of'],
  ['sort', 'of'],
];

const PUNCTUATION_RE = /[.,/#!$%^&*;:{}=\-_`~()"[\]?]/g;

function normalizeVocalizedFiller(word) {
  if (/^u+h+$/.test(word)) return 'uh';
  if (/^u+m+$/.test(word)) return 'um';
  if (/^u+h*m+$/.test(word)) return 'uhm';
  if (/^u+h+u+h+$/.test(word)) return 'uhuh';
  if (/^u+h+u+$/.test(word)) return 'uhu';
  if (/^a+h+$/.test(word)) return 'ah';
  if (/^e+h+$/.test(word)) return 'eh';
  if (/^e+r+$/.test(word)) return 'er';
  if (/^h+m+$/.test(word)) return 'hmm';
  if (/^m+$/.test(word) && word.length > 1) return 'mm';
  if (/^m+m+h+m+$/.test(word)) return 'mmhm';
  if (/^m+h+m+$/.test(word)) return 'mhm';
  return word;
}

export function cleanTranscriptWord(word) {
  return normalizeVocalizedFiller(String(word || '').replace(PUNCTUATION_RE, '').toLowerCase());
}

function extractAnalysisFillerValues(analysisData) {
  const candidates = [
    analysisData?.filler_words,
    analysisData?.verbal_fillers,
    analysisData?.filler_occurrences,
    analysisData?.analysis?.filler_words,
    analysisData?.analysis?.filler_occurrences,
    analysisData?.verbal?.filler_words,
    analysisData?.verbal?.fillers,
    analysisData?.verbal?.filler_occurrences,
  ];
  return candidates.flatMap((value) => {
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (typeof item === 'string') return item;
        return item?.word || item?.normalized || '';
      });
    }
    if (typeof value === 'string') return value.split(/[,|]/);
    return [];
  });
}

export function getAnalysisFillerWordSet(analysisData) {
  return new Set(
    extractAnalysisFillerValues(analysisData)
      .map(cleanTranscriptWord)
      .filter(Boolean),
  );
}

export function getFillerTokenIndexes(words, analysisData = {}) {
  const fillerIndexes = new Set();
  const analysisFillers = getAnalysisFillerWordSet(analysisData);
  const cleanedWords = words.map(cleanTranscriptWord);

  cleanedWords.forEach((word, index) => {
    if (FILLER_WORDS.includes(word) || analysisFillers.has(word)) {
      fillerIndexes.add(index);
    }
  });

  FILLER_PHRASES.forEach((phrase) => {
    for (let index = 0; index <= cleanedWords.length - phrase.length; index += 1) {
      const matches = phrase.every((part, offset) => cleanedWords[index + offset] === part);
      if (matches) {
        phrase.forEach((_, offset) => fillerIndexes.add(index + offset));
      }
    }
  });

  return fillerIndexes;
}

export function countTranscriptFillers(transcript, analysisData = {}) {
  const words = String(transcript || '').split(/\s+/).filter(Boolean);
  return getFillerTokenIndexes(words, analysisData).size;
}

export function getAnalysisFillerCount(analysisData) {
  const numericCandidates = [
    analysisData?.filler_count,
    analysisData?.verbal_filler_count,
    analysisData?.verbal?.filler_count,
    analysisData?.analysis?.filler_count,
  ];
  const occurrenceCandidates = [
    analysisData?.filler_occurrences,
    analysisData?.analysis?.filler_occurrences,
    analysisData?.verbal?.filler_occurrences,
  ]
    .filter(Array.isArray)
    .map((value) => value.length);
  const value = numericCandidates.find((candidate) => Number.isFinite(Number(candidate)));
  const numericValue = value == null ? null : Number(value);
  const occurrenceValue = occurrenceCandidates.length ? Math.max(...occurrenceCandidates) : null;
  if (numericValue === null) return occurrenceValue;
  if (occurrenceValue === null) return numericValue;
  return Math.max(numericValue, occurrenceValue);
}
