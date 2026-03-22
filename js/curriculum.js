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

var CURRICULUM = {
  consonants: [
    { letter: 'ㄱ', sound: '기역. 그', order: 1 },
    { letter: 'ㄴ', sound: '니은. 느', order: 2 },
    { letter: 'ㄷ', sound: '디귿. 드', order: 3 },
    { letter: 'ㄹ', sound: '리을. 르', order: 4 },
    { letter: 'ㅁ', sound: '미음. 므', order: 5 },
    { letter: 'ㅂ', sound: '비읍. 브', order: 6 },
    { letter: 'ㅅ', sound: '시옷. 스', order: 7 },
    { letter: 'ㅇ', sound: '이응', order: 8 },
    { letter: 'ㅈ', sound: '지읒. 즈', order: 9 }
  ],
  vowels: [
    { letter: 'ㅏ', sound: '아', order: 1 },
    { letter: 'ㅓ', sound: '어', order: 2 },
    { letter: 'ㅗ', sound: '오', order: 3 },
    { letter: 'ㅜ', sound: '우', order: 4 },
    { letter: 'ㅡ', sound: '으', order: 5 },
    { letter: 'ㅣ', sound: '이', order: 6 }
  ],
  words: [
    { word: '나', meaning: '나', illustration: 'child',
      syllables: [{ char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' }] },
    { word: '구', meaning: '구(공)', illustration: 'ball',
      syllables: [{ char: '구', type: 'tb', cho: 'ㄱ', jung: 'ㅜ' }] },
    { word: '소', meaning: '소', illustration: 'cow',
      syllables: [{ char: '소', type: 'tb', cho: 'ㅅ', jung: 'ㅗ' }] },
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
    { word: '우리', meaning: '우리', illustration: 'us',
      syllables: [
        { char: '우', type: 'tb', cho: 'ㅇ', jung: 'ㅜ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ] },
    { word: '나무', meaning: '나무', illustration: 'tree',
      syllables: [
        { char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' },
        { char: '무', type: 'tb', cho: 'ㅁ', jung: 'ㅜ' }
      ] },
    { word: '고기', meaning: '고기', illustration: 'meat',
      syllables: [
        { char: '고', type: 'tb', cho: 'ㄱ', jung: 'ㅗ' },
        { char: '기', type: 'lr', cho: 'ㄱ', jung: 'ㅣ' }
      ] },
    { word: '오리', meaning: '오리', illustration: 'duck',
      syllables: [
        { char: '오', type: 'tb', cho: 'ㅇ', jung: 'ㅗ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ] },
    { word: '아버지', meaning: '아버지', illustration: 'dad',
      syllables: [
        { char: '아', type: 'lr', cho: 'ㅇ', jung: 'ㅏ' },
        { char: '버', type: 'lr', cho: 'ㅂ', jung: 'ㅓ' },
        { char: '지', type: 'lr', cho: 'ㅈ', jung: 'ㅣ' }
      ] },
    { word: '손', meaning: '손', illustration: 'hand',
      syllables: [{ char: '손', type: 'tmb', cho: 'ㅅ', jung: 'ㅗ', jong: 'ㄴ' }] },
    { word: '물', meaning: '물', illustration: 'water',
      syllables: [{ char: '물', type: 'tmb', cho: 'ㅁ', jung: 'ㅜ', jong: 'ㄹ' }] },
    { word: '밥', meaning: '밥', illustration: 'rice',
      syllables: [{ char: '밥', type: 'lrb', cho: 'ㅂ', jung: 'ㅏ', jong: 'ㅂ' }] },
    { word: '사람', meaning: '사람', illustration: 'person',
      syllables: [
        { char: '사', type: 'lr', cho: 'ㅅ', jung: 'ㅏ' },
        { char: '람', type: 'lrb', cho: 'ㄹ', jung: 'ㅏ', jong: 'ㅁ' }
      ] }
  ],
  extConsonants: [
    { letter: 'ㅊ', sound: '치읓. 츠', order: 10 },
    { letter: 'ㅋ', sound: '키읔. 크', order: 11 },
    { letter: 'ㅌ', sound: '티읕. 트', order: 12 },
    { letter: 'ㅍ', sound: '피읖. 프', order: 13 },
    { letter: 'ㅎ', sound: '히읗. 흐', order: 14 }
  ],
  extVowels: [
    { letter: 'ㅐ', sound: '애', order: 7 },
    { letter: 'ㅔ', sound: '에', order: 8 }
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

function getSyllableType(jung, hasJong) {
  var verticalVowels = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅣ'];
  var isVertical = verticalVowels.indexOf(jung) !== -1;
  if (hasJong) return isVertical ? 'lrb' : 'tmb';
  return isVertical ? 'lr' : 'tb';
}
