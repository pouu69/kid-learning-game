// js/curriculum.js
// 한글 학습 커리큘럼 데이터

var LETTERS = {
  // 자음
  'ㅁ': { name: '미음', sound: '음', strokes: [
    [{x:20,y:20},{x:80,y:20}], [{x:80,y:20},{x:80,y:80}],
    [{x:80,y:80},{x:20,y:80}], [{x:20,y:80},{x:20,y:20}]
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
  'ㅂ': { name: '비읍', sound: '읍', strokes: [
    [{x:20,y:20},{x:20,y:80}], [{x:80,y:20},{x:80,y:80}],
    [{x:20,y:20},{x:80,y:20}], [{x:20,y:50},{x:80,y:50}],
    [{x:20,y:80},{x:80,y:80}]
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
  'ㄱ': { name: '기역', sound: '역', strokes: [
    [{x:20,y:20},{x:80,y:20}], [{x:80,y:20},{x:80,y:80}]
  ]},
  'ㅊ': { name: '치읓', sound: '읓', strokes: [
    [{x:50,y:10},{x:50,y:25}],
    [{x:20,y:25},{x:80,y:25}],
    [{x:50,y:38},{x:20,y:80}], [{x:50,y:38},{x:80,y:80}]
  ]},
  'ㅋ': { name: '키읔', sound: '읔', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:50,y:20},{x:50,y:80}],
    [{x:50,y:50},{x:80,y:50}]
  ]},
  'ㅌ': { name: '티읕', sound: '읕', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:50,y:20},{x:50,y:80}],
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
  // 모음
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

var CURRICULUM = [
  {
    word: '맘마', meaning: '밥', illustration: 'rice',
    syllables: ['맘','마'], letters: ['ㅁ','ㅏ'], reviewLetters: [],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅁ','ㅏ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅁ','ㅏ','ㅁ','ㅁ','ㅏ'] },
        { type: 'coloring', letter: 'ㅁ' },
        { type: 'soundMatch', choices: ['ㅁ','ㅏ'] }
      ]
    }
  },
  {
    word: '물', meaning: '물', illustration: 'water',
    syllables: ['물'], letters: ['ㅜ','ㄹ'], reviewLetters: ['ㅁ'],
    petRequest: 'thirsty',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅜ','ㄹ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅁ','ㅜ','ㄹ'] },
        { type: 'coloring', letter: 'ㅜ' },
        { type: 'soundMatch', choices: ['ㅜ','ㄹ','ㅁ'] }
      ]
    }
  },
  {
    word: '나', meaning: '나', illustration: 'child',
    syllables: ['나'], letters: ['ㄴ'], reviewLetters: ['ㅏ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㄴ'] },
      play: [
        { type: 'puzzle', pieces: ['ㄴ','ㅏ'] },
        { type: 'coloring', letter: 'ㄴ' },
        { type: 'soundMatch', choices: ['ㄴ','ㅁ','ㅏ'] }
      ]
    }
  },
  {
    word: '누나', meaning: '누나', illustration: 'sister',
    syllables: ['누','나'], letters: [], reviewLetters: ['ㄴ','ㅜ','ㅏ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㄴ','ㅜ','ㄴ','ㅏ'] },
        { type: 'soundMatch', choices: ['ㄴ','ㅜ','ㅏ'] }
      ]
    }
  },
  {
    word: '머리', meaning: '머리', illustration: 'head',
    syllables: ['머','리'], letters: ['ㅓ','ㅣ'], reviewLetters: ['ㅁ','ㄹ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅓ','ㅣ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅁ','ㅓ','ㄹ','ㅣ'] },
        { type: 'coloring', letter: 'ㅓ' },
        { type: 'soundMatch', choices: ['ㅓ','ㅣ','ㅏ'] }
      ]
    }
  },
  {
    word: '다리', meaning: '다리', illustration: 'legs',
    syllables: ['다','리'], letters: ['ㄷ'], reviewLetters: ['ㅏ','ㄹ','ㅣ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㄷ'] },
      play: [
        { type: 'puzzle', pieces: ['ㄷ','ㅏ','ㄹ','ㅣ'] },
        { type: 'coloring', letter: 'ㄷ' },
        { type: 'soundMatch', choices: ['ㄷ','ㄴ','ㄹ'] }
      ]
    }
  },
  {
    word: '아빠', meaning: '아빠', illustration: 'dad',
    syllables: ['아','빠'], letters: ['ㅂ'], reviewLetters: ['ㅏ'],
    unlearnedLetters: ['ㅇ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅂ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅂ','ㅏ'] },
        { type: 'coloring', letter: 'ㅂ' },
        { type: 'soundMatch', choices: ['ㅂ','ㄷ','ㅁ'] }
      ]
    }
  },
  {
    word: '바나나', meaning: '바나나', illustration: 'banana',
    syllables: ['바','나','나'], letters: [], reviewLetters: ['ㅂ','ㅏ','ㄴ'],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅂ','ㅏ','ㄴ','ㅏ','ㄴ','ㅏ'] },
        { type: 'soundMatch', choices: ['ㅂ','ㄴ','ㅏ'] }
      ]
    }
  },
  {
    word: '우리', meaning: '우리', illustration: 'us',
    syllables: ['우','리'], letters: [], reviewLetters: ['ㅜ','ㄹ','ㅣ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅜ','ㄹ','ㅣ'] },
        { type: 'soundMatch', choices: ['ㅜ','ㄹ','ㅣ'] }
      ]
    }
  },
  {
    word: '손', meaning: '손', illustration: 'hand',
    syllables: ['손'], letters: ['ㅅ','ㅗ'], reviewLetters: ['ㄴ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅅ','ㅗ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅅ','ㅗ','ㄴ'] },
        { type: 'coloring', letter: 'ㅅ' },
        { type: 'soundMatch', choices: ['ㅅ','ㅗ','ㅜ'] }
      ]
    }
  },
  {
    word: '사다리', meaning: '사다리', illustration: 'ladder',
    syllables: ['사','다','리'], letters: [], reviewLetters: ['ㅅ','ㅏ','ㄷ','ㄹ','ㅣ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅅ','ㅏ','ㄷ','ㅏ','ㄹ','ㅣ'] },
        { type: 'soundMatch', choices: ['ㅅ','ㄷ','ㄹ'] }
      ]
    }
  },
  {
    word: '아이', meaning: '아이', illustration: 'children',
    syllables: ['아','이'], letters: ['ㅇ'], reviewLetters: ['ㅏ','ㅣ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅇ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅇ','ㅏ','ㅇ','ㅣ'] },
        { type: 'coloring', letter: 'ㅇ' },
        { type: 'soundMatch', choices: ['ㅇ','ㅁ','ㄴ'] }
      ]
    }
  },
  {
    word: '오이', meaning: '오이', illustration: 'cucumber',
    syllables: ['오','이'], letters: [], reviewLetters: ['ㅇ','ㅗ','ㅣ'],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅇ','ㅗ','ㅇ','ㅣ'] },
        { type: 'soundMatch', choices: ['ㅗ','ㅣ','ㅏ'] }
      ]
    }
  },
  {
    word: '바다', meaning: '바다', illustration: 'sea',
    syllables: ['바','다'], letters: [], reviewLetters: ['ㅂ','ㅏ','ㄷ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅂ','ㅏ','ㄷ','ㅏ'] },
        { type: 'soundMatch', choices: ['ㅂ','ㄷ','ㅁ'] }
      ]
    }
  },
  {
    word: '자다', meaning: '자다', illustration: 'sleep',
    syllables: ['자','다'], letters: ['ㅈ'], reviewLetters: ['ㅏ','ㄷ'],
    petRequest: 'sleepy',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅈ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅈ','ㅏ','ㄷ','ㅏ'] },
        { type: 'coloring', letter: 'ㅈ' },
        { type: 'soundMatch', choices: ['ㅈ','ㅅ','ㄷ'] }
      ]
    }
  },
  {
    word: '주스', meaning: '주스', illustration: 'juice',
    syllables: ['주','스'], letters: [], reviewLetters: ['ㅈ','ㅜ','ㅅ'],
    petRequest: 'thirsty',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅈ','ㅜ','ㅅ','ㅡ'] },
        { type: 'soundMatch', choices: ['ㅈ','ㅅ','ㅜ'] }
      ]
    }
  },
  {
    word: '모자', meaning: '모자', illustration: 'hat',
    syllables: ['모','자'], letters: [], reviewLetters: ['ㅁ','ㅗ','ㅈ','ㅏ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅁ','ㅗ','ㅈ','ㅏ'] },
        { type: 'soundMatch', choices: ['ㅁ','ㅈ','ㅗ'] }
      ]
    }
  },
  {
    word: '나무', meaning: '나무', illustration: 'tree',
    syllables: ['나','무'], letters: [], reviewLetters: ['ㄴ','ㅏ','ㅁ','ㅜ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㄴ','ㅏ','ㅁ','ㅜ'] },
        { type: 'soundMatch', choices: ['ㄴ','ㅁ','ㅏ'] }
      ]
    }
  },
  {
    word: '두부', meaning: '두부', illustration: 'tofu',
    syllables: ['두','부'], letters: ['ㅡ'], reviewLetters: ['ㄷ','ㅜ','ㅂ'],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅡ'] },
      play: [
        { type: 'puzzle', pieces: ['ㄷ','ㅜ','ㅂ','ㅜ'] },
        { type: 'coloring', letter: 'ㅡ' },
        { type: 'soundMatch', choices: ['ㅡ','ㅜ','ㅣ'] }
      ]
    }
  },
  {
    word: '버스', meaning: '버스', illustration: 'bus',
    syllables: ['버','스'], letters: [], reviewLetters: ['ㅂ','ㅓ','ㅅ','ㅡ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㅂ','ㅓ','ㅅ','ㅡ'] },
        { type: 'soundMatch', choices: ['ㅂ','ㅅ','ㅓ','ㅡ'] }
      ]
    }
  },
  {
    word: '가지', meaning: '가지', illustration: 'eggplant',
    syllables: ['가','지'], letters: ['ㄱ'], reviewLetters: ['ㅏ','ㅈ','ㅣ'],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㄱ'] },
      play: [
        { type: 'puzzle', pieces: ['ㄱ','ㅏ','ㅈ','ㅣ'] },
        { type: 'coloring', letter: 'ㄱ' },
        { type: 'soundMatch', choices: ['ㄱ','ㄴ','ㅈ'] }
      ]
    }
  },
  {
    word: '구두', meaning: '구두', illustration: 'shoes',
    syllables: ['구','두'], letters: [], reviewLetters: ['ㄱ','ㅜ','ㄷ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㄱ','ㅜ','ㄷ','ㅜ'] },
        { type: 'soundMatch', choices: ['ㄱ','ㄷ','ㅜ'] }
      ]
    }
  },
  {
    word: '고기', meaning: '고기', illustration: 'meat',
    syllables: ['고','기'], letters: [], reviewLetters: ['ㄱ','ㅗ','ㅣ'],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: [] },
      play: [
        { type: 'puzzle', pieces: ['ㄱ','ㅗ','ㄱ','ㅣ'] },
        { type: 'soundMatch', choices: ['ㄱ','ㅗ','ㅣ'] }
      ]
    }
  },
  {
    word: '토끼', meaning: '토끼', illustration: 'rabbit',
    syllables: ['토','끼'], letters: ['ㅌ'], reviewLetters: ['ㅗ','ㄱ','ㅣ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅌ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅌ','ㅗ','ㄱ','ㅣ'] },
        { type: 'coloring', letter: 'ㅌ' },
        { type: 'soundMatch', choices: ['ㅌ','ㄷ','ㄱ'] }
      ]
    }
  },
  {
    word: '코', meaning: '코', illustration: 'nose',
    syllables: ['코'], letters: ['ㅋ'], reviewLetters: ['ㅗ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅋ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅋ','ㅗ'] },
        { type: 'coloring', letter: 'ㅋ' },
        { type: 'soundMatch', choices: ['ㅋ','ㄱ','ㅌ'] }
      ]
    }
  },
  {
    word: '하나', meaning: '하나', illustration: 'one',
    syllables: ['하','나'], letters: ['ㅎ'], reviewLetters: ['ㅏ','ㄴ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅎ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅎ','ㅏ','ㄴ','ㅏ'] },
        { type: 'coloring', letter: 'ㅎ' },
        { type: 'soundMatch', choices: ['ㅎ','ㅁ','ㄴ'] }
      ]
    }
  },
  {
    word: '포도', meaning: '포도', illustration: 'grapes',
    syllables: ['포','도'], letters: ['ㅍ'], reviewLetters: ['ㅗ','ㄷ'],
    petRequest: 'hungry',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅍ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅍ','ㅗ','ㄷ','ㅗ'] },
        { type: 'coloring', letter: 'ㅍ' },
        { type: 'soundMatch', choices: ['ㅍ','ㅂ','ㄷ'] }
      ]
    }
  },
  {
    word: '치마', meaning: '치마', illustration: 'skirt',
    syllables: ['치','마'], letters: ['ㅊ'], reviewLetters: ['ㅣ','ㅁ','ㅏ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅊ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅊ','ㅣ','ㅁ','ㅏ'] },
        { type: 'coloring', letter: 'ㅊ' },
        { type: 'soundMatch', choices: ['ㅊ','ㅈ','ㅅ'] }
      ]
    }
  },
  {
    word: '개나리', meaning: '개나리', illustration: 'forsythia',
    syllables: ['개','나','리'], letters: ['ㅐ'], reviewLetters: ['ㄱ','ㄴ','ㄹ','ㅣ'],
    petRequest: 'bored',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅐ'] },
      play: [
        { type: 'puzzle', pieces: ['ㄱ','ㅐ','ㄴ','ㅏ','ㄹ','ㅣ'] },
        { type: 'coloring', letter: 'ㅐ' },
        { type: 'soundMatch', choices: ['ㅐ','ㅏ','ㅓ'] }
      ]
    }
  },
  {
    word: '세수', meaning: '세수', illustration: 'facewash',
    syllables: ['세','수'], letters: ['ㅔ'], reviewLetters: ['ㅅ','ㅜ'],
    petRequest: 'sleepy',
    activities: {
      meet: { type: 'fullword' },
      discover: { type: 'decompose', trace: ['ㅔ'] },
      play: [
        { type: 'puzzle', pieces: ['ㅅ','ㅔ','ㅅ','ㅜ'] },
        { type: 'coloring', letter: 'ㅔ' },
        { type: 'soundMatch', choices: ['ㅔ','ㅐ','ㅓ'] }
      ]
    }
  }
];

var EVOLUTION = [
  { stage: 0, name: '알', wordsNeeded: 0 },
  { stage: 1, name: '갓 태어남', wordsNeeded: 1 },
  { stage: 2, name: '아기', wordsNeeded: 3 },
  { stage: 3, name: '호기심쟁이', wordsNeeded: 5 },
  { stage: 4, name: '말하기 시작', wordsNeeded: 8 },
  { stage: 5, name: '수다쟁이', wordsNeeded: 12 },
  { stage: 6, name: '글자 요리사', wordsNeeded: 18 },
  { stage: 7, name: '다 큰 펫', wordsNeeded: 25 }
];

function decomposeHangul(char) {
  var code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var cho = Math.floor(code / 588);
  var jung = Math.floor((code % 588) / 28);
  var jong = code % 28;
  var result = [CHO[cho], JUNG[jung]];
  if (jong > 0) result.push(JONG[jong]);
  return result;
}
