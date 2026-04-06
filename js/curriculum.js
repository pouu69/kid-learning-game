// js/curriculum.js
// 한글 학습 커리큘럼 데이터 (v2: 6단계)

var LETTERS = {
  // 자음 (기본 9 + 격음 5)
  'ㄱ': { name: '기역', sound: '역', strokes: [
    [{x:20,y:20},{x:80,y:20}], [{x:80,y:20},{x:80,y:80}]
  ]},
  'ㄴ': { name: '니은', sound: '은', strokes: [
    [{x:20,y:20},{x:20,y:80}], [{x:20,y:80},{x:80,y:80}]
  ]},
  'ㄷ': { name: '디귿', sound: '읃', strokes: [
    [{x:20,y:20},{x:80,y:20}], [{x:20,y:20},{x:20,y:80}],
    [{x:20,y:80},{x:80,y:80}]
  ]},
  'ㄹ': { name: '리을', sound: '을', strokes: [
    [{x:20,y:20},{x:80,y:20}], [{x:80,y:20},{x:80,y:45}],
    [{x:80,y:45},{x:20,y:45}], [{x:20,y:45},{x:20,y:80}],
    [{x:20,y:80},{x:80,y:80}]
  ]},
  'ㅁ': { name: '미음', sound: '음', strokes: [
    [{x:20,y:20},{x:80,y:20}], [{x:80,y:20},{x:80,y:80}],
    [{x:80,y:80},{x:20,y:80}], [{x:20,y:80},{x:20,y:20}]
  ]},
  'ㅂ': { name: '비읍', sound: '읍', strokes: [
    [{x:25,y:20},{x:25,y:80}], [{x:75,y:20},{x:75,y:80}],
    [{x:25,y:50},{x:75,y:50}], [{x:25,y:80},{x:75,y:80}]
  ]},
  'ㅅ': { name: '시옷', sound: '읏', strokes: [
    [{x:50,y:20},{x:20,y:80}], [{x:50,y:20},{x:80,y:80}]
  ]},
  'ㅇ': { name: '이응', sound: '응', strokes: [
    [{x:50,y:20,circle:true,cx:50,cy:50,r:30}]
  ]},
  'ㅈ': { name: '지읒', sound: '읏', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:50,y:35},{x:20,y:80}], [{x:50,y:35},{x:80,y:80}]
  ]},
  'ㅊ': { name: '치읓', sound: '읓', strokes: [
    [{x:50,y:10},{x:50,y:25}],
    [{x:20,y:25},{x:80,y:25}],
    [{x:50,y:38},{x:20,y:80}], [{x:50,y:38},{x:80,y:80}]
  ]},
  'ㅋ': { name: '키읔', sound: '읔', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:80,y:20},{x:80,y:80}],
    [{x:20,y:50},{x:80,y:50}]
  ]},
  'ㅌ': { name: '티읕', sound: '읕', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:20,y:20},{x:20,y:80}],
    [{x:20,y:50},{x:80,y:50}],
    [{x:20,y:80},{x:80,y:80}]
  ]},
  'ㅍ': { name: '피읖', sound: '읖', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:20,y:20},{x:20,y:80}], [{x:80,y:20},{x:80,y:80}],
    [{x:20,y:80},{x:80,y:80}]
  ]},
  'ㅎ': { name: '히읗', sound: '읗', strokes: [
    [{x:50,y:10},{x:50,y:22}],
    [{x:25,y:32},{x:75,y:32}],
    [{x:50,y:45,circle:true,cx:50,cy:65,r:22}]
  ]},
  // 모음 (기본 6 + 보너스 2)
  'ㅏ': { name: '아', sound: '아', strokes: [
    [{x:40,y:15},{x:40,y:85}], [{x:40,y:50},{x:75,y:50}]
  ]},
  'ㅓ': { name: '어', sound: '어', strokes: [
    [{x:60,y:15},{x:60,y:85}], [{x:60,y:50},{x:25,y:50}]
  ]},
  'ㅗ': { name: '오', sound: '오', strokes: [
    [{x:50,y:60},{x:50,y:25}], [{x:15,y:60},{x:85,y:60}]
  ]},
  'ㅜ': { name: '우', sound: '우', strokes: [
    [{x:15,y:40},{x:85,y:40}], [{x:50,y:40},{x:50,y:75}]
  ]},
  'ㅡ': { name: '으', sound: '으', strokes: [
    [{x:15,y:50},{x:85,y:50}]
  ]},
  'ㅣ': { name: '이', sound: '이', strokes: [
    [{x:50,y:15},{x:50,y:85}]
  ]},
  'ㅐ': { name: '애', sound: '애', strokes: [
    [{x:30,y:15},{x:30,y:85}], [{x:30,y:50},{x:65,y:50}],
    [{x:65,y:15},{x:65,y:85}]
  ]},
  'ㅔ': { name: '에', sound: '에', strokes: [
    [{x:35,y:15},{x:35,y:85}], [{x:35,y:50},{x:70,y:50}],
    [{x:70,y:15},{x:70,y:85}]
  ]}
};

var CURRICULUM = {
  // Stage 0: 통글자 — 소리와 의미 연결 (알 단계)
  wholeWords: [
    { word: '나', illustration: 'child', distractors: ['나무'], sound: '나' },
    { word: '엄마', illustration: 'mother', distractors: ['아빠'], sound: '엄마' },
    { word: '아빠', illustration: 'father', distractors: ['엄마'], sound: '아빠' },
    { word: '물', illustration: 'water', distractors: ['밥'], sound: '물' },
    { word: '밥', illustration: 'rice', distractors: ['물'], sound: '밥' }
  ],

  // Stage 1: 기본 자음 9개 (초등 교과서 순서 + 연관 단어)
  consonants: [
    { letter: 'ㄱ', sound: '기역. 그', order: 1, associatedWord: '가방', combinedSyllable: '가' },
    { letter: 'ㄴ', sound: '니은. 느', order: 2, associatedWord: '나비', combinedSyllable: '나' },
    { letter: 'ㄷ', sound: '디귿. 드', order: 3, associatedWord: '다리', combinedSyllable: '다' },
    { letter: 'ㅁ', sound: '미음. 므', order: 4, associatedWord: '모자', combinedSyllable: '마' },
    { letter: 'ㅂ', sound: '비읍. 브', order: 5, associatedWord: '바다', combinedSyllable: '바' },
    { letter: 'ㅅ', sound: '시옷. 스', order: 6, associatedWord: '사자', combinedSyllable: '사' },
    { letter: 'ㅇ', sound: '이응', order: 7, associatedWord: '아기', combinedSyllable: '아' },
    { letter: 'ㅈ', sound: '지읒. 즈', order: 8, associatedWord: '자동차', combinedSyllable: '자' },
    { letter: 'ㄹ', sound: '리을. 르', order: 9, associatedWord: '라면', combinedSyllable: '라' }
  ],

  // 격음 (Stage 2 완료 후 선택적 확장)
  bonusConsonants: [
    { letter: 'ㅊ', sound: '치읓. 츠', order: 10, associatedWord: '치즈', combinedSyllable: '차' },
    { letter: 'ㅋ', sound: '키읔. 크', order: 11, associatedWord: '코', combinedSyllable: '카' },
    { letter: 'ㅌ', sound: '티읕. 트', order: 12, associatedWord: '토끼', combinedSyllable: '타' },
    { letter: 'ㅍ', sound: '피읖. 프', order: 13, associatedWord: '포도', combinedSyllable: '파' },
    { letter: 'ㅎ', sound: '히읗. 흐', order: 14, associatedWord: '하마', combinedSyllable: '하' }
  ],

  // Stage 2: 기본 모음 6개 (입모양 힌트 포함)
  vowels: [
    { letter: 'ㅏ', sound: '아', order: 1, mouthHint: '입 크게 아~' },
    { letter: 'ㅓ', sound: '어', order: 2, mouthHint: '입 중간 어~' },
    { letter: 'ㅗ', sound: '오', order: 3, mouthHint: '입 동그랗게 오~' },
    { letter: 'ㅜ', sound: '우', order: 4, mouthHint: '입 쭉 우~' },
    { letter: 'ㅡ', sound: '으', order: 5, mouthHint: '입 옆으로 으~' },
    { letter: 'ㅣ', sound: '이', order: 6, mouthHint: '입 옆으로 이~' }
  ],

  // 보너스 모음 (선택적 확장)
  bonusVowels: [
    { letter: 'ㅐ', sound: '애', order: 7, mouthHint: '입 중간 애~' },
    { letter: 'ㅔ', sound: '에', order: 8, mouthHint: '입 중간 에~' }
  ],

  // Stage 3: 음절 조합 데이터 (단어에 사용되는 핵심 음절)
  syllables: [
    { syllable: '가', cho: 'ㄱ', jung: 'ㅏ', usedInWords: ['가방'] },
    { syllable: '나', cho: 'ㄴ', jung: 'ㅏ', usedInWords: ['나비', '나무'] },
    { syllable: '다', cho: 'ㄷ', jung: 'ㅏ', usedInWords: ['다리', '바다'] },
    { syllable: '마', cho: 'ㅁ', jung: 'ㅏ', usedInWords: [] },
    { syllable: '바', cho: 'ㅂ', jung: 'ㅏ', usedInWords: ['바다', '바지'] },
    { syllable: '사', cho: 'ㅅ', jung: 'ㅏ', usedInWords: ['사자', '사람'] },
    { syllable: '아', cho: 'ㅇ', jung: 'ㅏ', usedInWords: ['아기', '아버지'] },
    { syllable: '자', cho: 'ㅈ', jung: 'ㅏ', usedInWords: ['사자'] },
    { syllable: '라', cho: 'ㄹ', jung: 'ㅏ', usedInWords: [] },
    { syllable: '거', cho: 'ㄱ', jung: 'ㅓ', usedInWords: [] },
    { syllable: '너', cho: 'ㄴ', jung: 'ㅓ', usedInWords: [] },
    { syllable: '머', cho: 'ㅁ', jung: 'ㅓ', usedInWords: ['머리'] },
    { syllable: '버', cho: 'ㅂ', jung: 'ㅓ', usedInWords: ['아버지'] },
    { syllable: '고', cho: 'ㄱ', jung: 'ㅗ', usedInWords: ['고기'] },
    { syllable: '노', cho: 'ㄴ', jung: 'ㅗ', usedInWords: [] },
    { syllable: '모', cho: 'ㅁ', jung: 'ㅗ', usedInWords: [] },
    { syllable: '소', cho: 'ㅅ', jung: 'ㅗ', usedInWords: ['소'] },
    { syllable: '오', cho: 'ㅇ', jung: 'ㅗ', usedInWords: ['오리'] },
    { syllable: '구', cho: 'ㄱ', jung: 'ㅜ', usedInWords: ['구름'] },
    { syllable: '누', cho: 'ㄴ', jung: 'ㅜ', usedInWords: [] },
    { syllable: '무', cho: 'ㅁ', jung: 'ㅜ', usedInWords: ['나무'] },
    { syllable: '비', cho: 'ㅂ', jung: 'ㅣ', usedInWords: ['나비'] },
    { syllable: '리', cho: 'ㄹ', jung: 'ㅣ', usedInWords: ['머리', '다리', '오리', '우리'] },
    { syllable: '기', cho: 'ㄱ', jung: 'ㅣ', usedInWords: ['고기', '아기'] },
    { syllable: '지', cho: 'ㅈ', jung: 'ㅣ', usedInWords: ['바지', '아버지'] }
  ],

  // 받침 음절 (Stage 3 후반)
  batchimSyllables: [
    { syllable: '손', base: '소', jong: 'ㄴ' },
    { syllable: '물', base: '무', jong: 'ㄹ' },
    { syllable: '밥', base: '바', jong: 'ㅂ' },
    { syllable: '눈', base: '누', jong: 'ㄴ' },
    { syllable: '람', base: '라', jong: 'ㅁ' },
    { syllable: '름', base: '르', jong: 'ㅁ' }
  ],

  // Stage 4: 단어 (난이도순, 보너스 포함)
  words: [
    // 1음절 받침X (CV)
    { word: '나', meaning: '나', illustration: 'child',
      syllables: [{ char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' }] },
    { word: '구', meaning: '구(공)', illustration: 'ball',
      syllables: [{ char: '구', type: 'tb', cho: 'ㄱ', jung: 'ㅜ' }] },
    { word: '소', meaning: '소', illustration: 'cow',
      syllables: [{ char: '소', type: 'tb', cho: 'ㅅ', jung: 'ㅗ' }] },
    // 1음절 받침O (CVC)
    { word: '손', meaning: '손', illustration: 'hand',
      syllables: [{ char: '손', type: 'tmb', cho: 'ㅅ', jung: 'ㅗ', jong: 'ㄴ' }] },
    { word: '물', meaning: '물', illustration: 'water',
      syllables: [{ char: '물', type: 'tmb', cho: 'ㅁ', jung: 'ㅜ', jong: 'ㄹ' }] },
    { word: '밥', meaning: '밥', illustration: 'rice',
      syllables: [{ char: '밥', type: 'lrb', cho: 'ㅂ', jung: 'ㅏ', jong: 'ㅂ' }] },
    { word: '눈', meaning: '눈', illustration: 'eye',
      syllables: [{ char: '눈', type: 'tmb', cho: 'ㄴ', jung: 'ㅜ', jong: 'ㄴ' }] },
    // 2음절 받침X (CV+CV)
    { word: '머리', meaning: '머리', illustration: 'head',
      syllables: [
        { char: '머', type: 'lr', cho: 'ㅁ', jung: 'ㅓ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ] },
    { word: '다리', meaning: '다리', illustration: 'legs',
      syllables: [
        { char: '다', type: 'lr', cho: 'ㄷ', jung: 'ㅏ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ] },
    { word: '바지', meaning: '바지', illustration: 'pants',
      syllables: [
        { char: '바', type: 'lr', cho: 'ㅂ', jung: 'ㅏ' },
        { char: '지', type: 'lr', cho: 'ㅈ', jung: 'ㅣ' }
      ] },
    { word: '오리', meaning: '오리', illustration: 'duck',
      syllables: [
        { char: '오', type: 'tb', cho: 'ㅇ', jung: 'ㅗ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ] },
    { word: '나무', meaning: '나무', illustration: 'tree',
      syllables: [
        { char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' },
        { char: '무', type: 'tb', cho: 'ㅁ', jung: 'ㅜ' }
      ] },
    { word: '나비', meaning: '나비', illustration: 'butterfly',
      syllables: [
        { char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' },
        { char: '비', type: 'lr', cho: 'ㅂ', jung: 'ㅣ' }
      ] },
    { word: '고기', meaning: '고기', illustration: 'meat',
      syllables: [
        { char: '고', type: 'tb', cho: 'ㄱ', jung: 'ㅗ' },
        { char: '기', type: 'lr', cho: 'ㄱ', jung: 'ㅣ' }
      ] },
    { word: '우리', meaning: '우리', illustration: 'us',
      syllables: [
        { char: '우', type: 'tb', cho: 'ㅇ', jung: 'ㅜ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ] },
    // 2음절 혼합
    { word: '사자', meaning: '사자', illustration: 'lion',
      syllables: [
        { char: '사', type: 'lr', cho: 'ㅅ', jung: 'ㅏ' },
        { char: '자', type: 'lr', cho: 'ㅈ', jung: 'ㅏ' }
      ] },
    { word: '구름', meaning: '구름', illustration: 'cloud',
      syllables: [
        { char: '구', type: 'tb', cho: 'ㄱ', jung: 'ㅜ' },
        { char: '름', type: 'tmb', cho: 'ㄹ', jung: 'ㅡ', jong: 'ㅁ' }
      ] },
    { word: '바다', meaning: '바다', illustration: 'sea',
      syllables: [
        { char: '바', type: 'lr', cho: 'ㅂ', jung: 'ㅏ' },
        { char: '다', type: 'lr', cho: 'ㄷ', jung: 'ㅏ' }
      ] },
    // 3음절
    { word: '아버지', meaning: '아버지', illustration: 'dad',
      syllables: [
        { char: '아', type: 'lr', cho: 'ㅇ', jung: 'ㅏ' },
        { char: '버', type: 'lr', cho: 'ㅂ', jung: 'ㅓ' },
        { char: '지', type: 'lr', cho: 'ㅈ', jung: 'ㅣ' }
      ] },
    { word: '사람', meaning: '사람', illustration: 'person',
      syllables: [
        { char: '사', type: 'lr', cho: 'ㅅ', jung: 'ㅏ' },
        { char: '람', type: 'lrb', cho: 'ㄹ', jung: 'ㅏ', jong: 'ㅁ' }
      ] },
    { word: '하나', meaning: '하나(1)', illustration: 'one',
      syllables: [
        { char: '하', type: 'lr', cho: 'ㅎ', jung: 'ㅏ' },
        { char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' }
      ] },
    // 보너스: Stage 0 콜백 단어
    { word: '엄마', meaning: '엄마', illustration: 'mother', bonus: true,
      syllables: [
        { char: '엄', type: 'lrb', cho: 'ㅇ', jung: 'ㅓ', jong: 'ㅁ' },
        { char: '마', type: 'lr', cho: 'ㅁ', jung: 'ㅏ' }
      ] },
    { word: '아빠', meaning: '아빠', illustration: 'father', bonus: true,
      syllables: [
        { char: '아', type: 'lr', cho: 'ㅇ', jung: 'ㅏ' },
        { char: '빠', type: 'lr', cho: 'ㅃ', jung: 'ㅏ' }
      ] }
  ],

  // Stage 5: 문장 데이터
  sentences: [
    {
      text: '나는 밥을 좋아해',
      slots: ['나는', '밥을', '좋아해'],
      petEmotion: 'hungry',
      animation: 'eat'
    },
    {
      text: '나비가 나무에 있어',
      slots: ['나비가', '나무에', '있어'],
      petEmotion: 'curious',
      animation: 'look_up'
    },
    {
      text: '바다에 물이 있어',
      slots: ['바다에', '물이', '있어'],
      petEmotion: 'excited',
      animation: 'jump'
    },
    {
      text: '오리가 물을 좋아해',
      slots: ['오리가', '물을', '좋아해'],
      petEmotion: 'happy',
      animation: 'dance'
    },
    {
      text: '사자는 고기를 좋아해',
      slots: ['사자는', '고기를', '좋아해'],
      petEmotion: 'excited',
      animation: 'roar'
    }
  ],

  // 자음-모음 인터리브 순서 (기존 Stage 1/2 대체)
  interleaved: [
    { type: 'consonant', index: 0 },  // ㄱ (가방)
    { type: 'vowel',     index: 0 },  // ㅏ (아이스크림)
    { type: 'consonant', index: 1 },  // ㄴ (나비)
    { type: 'consonant', index: 2 },  // ㄷ (다리)
    { type: 'vowel',     index: 1 },  // ㅓ (어? 상자)
    { type: 'consonant', index: 3 },  // ㅁ (모자)
    { type: 'vowel',     index: 2 },  // ㅗ (높은 언덕)
    { type: 'consonant', index: 4 },  // ㅂ (바다)
    { type: 'vowel',     index: 3 },  // ㅜ (우산)
    { type: 'consonant', index: 5 },  // ㅅ (사자)
    { type: 'vowel',     index: 4 },  // ㅡ (으르렁)
    { type: 'consonant', index: 6 },  // ㅇ (아기)
    { type: 'vowel',     index: 5 },  // ㅣ (이! 선물)
    { type: 'consonant', index: 7 },  // ㅈ (자동차)
    { type: 'consonant', index: 8 }   // ㄹ (라면)
  ]
};

var EVOLUTION = [
  { stage: 0, name: '알', condition: 'start' },
  { stage: 1, name: '갓 태어남', condition: 'hatch' },
  { stage: 2, name: '호기심쟁이', condition: 'consonants_done' },
  { stage: 3, name: '말하기 시작', condition: 'vowels_done' },
  { stage: 4, name: '수다쟁이', condition: 'words_10' },
  { stage: 5, name: '다 큰 펫', condition: 'words_15' }
];

var EVO_THRESHOLDS = {
  consonants: 9,
  vowels: 6,
  syllables: 15,
  words4: 10,
  words5: 15,
  sentences: 5
};
