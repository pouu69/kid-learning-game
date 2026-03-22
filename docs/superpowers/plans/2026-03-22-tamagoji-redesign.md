# 타마고지 교육용 한글 다마고치 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 타마고지를 5~7세 한글 교육용 다마고치로 전면 재설계 구현

**Architecture:** PixiJS(펫+마당 렌더링) + Vanilla JS(게임 로직+학습 엔진) + localStorage(영속 저장) + PWA(오프라인). 기존 파일 구조를 재활용하되 내용은 전면 재작성. 학습 활동은 activities/ 서브디렉토리에 모듈화.

**Tech Stack:** PixiJS 8.6.6, Web Speech API (TTS), Vanilla JS (ES modules 없이 script 태그), CSS3, localStorage, Service Worker

**Spec:** `docs/superpowers/specs/2026-03-22-tamagoji-redesign.md`

---

## 파일 구조

### 새로 생성
| 파일 | 역할 |
|------|------|
| `js/curriculum.js` | 20단어 커리큘럼 데이터 + 글자 트레이싱/발음 데이터 |
| `js/storage.js` | localStorage CRUD, 상태 초기화, 마이그레이션 |
| `js/pet.js` | 펫 행동 로직 — 요청 결정, 말풍선 텍스트, 감정 상태 |
| `js/world.js` | 마당 렌더링 — 하늘, 잔디, 구름, 해/달, 날씨, 글자꽃 |
| `js/learning.js` | 4단계 학습 사이클 엔진 — 단계 전환, 단어 완료, 진화 판정 |
| `js/activities/meet.js` | 1단계: 만남 — 통글자 표시, 발음, 터치→펫 전달 |
| `js/activities/discover.js` | 2단계: 발견 — 분해 애니메이션, 터치 탐구, 따라 그리기 |
| `js/activities/play.js` | 3단계: 놀이 — 퍼즐, 색칠, 소리 매칭 |
| `js/activities/reunite.js` | 4단계: 재회 — 아는 글자 하이라이트, 새 글자만 학습 |
| `js/report.js` | 부모 리포트 대시보드 |

### 전면 재작성
| 파일 | 변경 |
|------|------|
| `index.html` | 3화면 구조 (홈/학습/보상)로 교체. 기존 4화면/D-pad/미니게임 제거 |
| `css/styles.css` | 그림책 팔레트, 글라스모피즘 스탯, 터치 최적화 레이아웃 |
| `js/game.js` | 3스탯 루프, 펫 요청 로직, 학습 연동 |
| `js/renderer.js` | 월드+펫 통합 렌더링, 표정 시스템, 말풍선 |
| `js/sprites.js` | 8단계 펫 스프라이트 + 표정 변형 |
| `js/effects.js` | TTS 발음, 별 파티클, 축하 연출 |

### 삭제
| 파일 | 이유 |
|------|------|
| `js/minigames.js` | 학습 활동으로 대체 |

---

## Task 1: 커리큘럼 데이터 + 저장소

**Files:**
- Create: `js/curriculum.js`
- Create: `js/storage.js`

- [ ] **Step 1: curriculum.js — 글자 데이터 작성**

`js/curriculum.js` 생성. 자음 8개 + 모음 6개의 발음/트레이싱 데이터:

```javascript
// js/curriculum.js
// 한글 학습 커리큘럼 데이터

const LETTERS = {
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
    // 원: 중심 (50,50), 반지름 30 — 특수 처리
    [{x:50,y:20,circle:true,cx:50,cy:50,r:30}]
  ]},
  'ㅈ': { name: '지읒', sound: '읏', strokes: [
    [{x:20,y:20},{x:80,y:20}],
    [{x:50,y:35},{x:20,y:80}], [{x:50,y:35},{x:80,y:80}]
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
  ]}
};

const CURRICULUM = [
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
  }
];

// 진화 요구사항
const EVOLUTION = [
  { stage: 0, name: '알', wordsNeeded: 0 },
  { stage: 1, name: '갓 태어남', wordsNeeded: 1 },
  { stage: 2, name: '아기', wordsNeeded: 3 },
  { stage: 3, name: '호기심쟁이', wordsNeeded: 5 },
  { stage: 4, name: '말하기 시작', wordsNeeded: 8 },
  { stage: 5, name: '수다쟁이', wordsNeeded: 12 },
  { stage: 6, name: '글자 요리사', wordsNeeded: 18 },
  { stage: 7, name: '다 큰 펫', wordsNeeded: 25 }
];

// 한글 음절 분해 유틸리티
function decomposeHangul(char) {
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  const result = [CHO[cho], JUNG[jung]];
  if (jong > 0) result.push(JONG[jong]);
  return result;
}
```

- [ ] **Step 2: storage.js — 상태 관리 작성**

`js/storage.js` 생성:

```javascript
// js/storage.js
// localStorage 상태 관리

const STORAGE_KEY = 'tamagoji_state';

function createDefaultState() {
  return {
    name: '',
    stage: 0,
    birthTime: Date.now(),
    lastUpdate: Date.now(),
    hunger: 80,
    mood: 80,
    sleepy: 10,
    sleeping: false,
    learning: {
      knownLetters: [],
      completedWords: [],
      currentWord: null,
      wordHistory: []
    },
    daily: {
      date: new Date().toISOString().slice(0, 10),
      sessionsToday: 0,
      minutesToday: 0,
      activitiesDone: 0,
      bonusUnlocked: false
    },
    reports: {
      totalDays: 0,
      totalMinutes: 0,
      weeklyLog: [],
      letterStats: {}
    }
  };
}

function saveState(st) {
  st.lastUpdate = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

function updateDaily(st) {
  const today = new Date().toISOString().slice(0, 10);
  if (st.daily.date !== today) {
    // 새 날
    if (st.daily.minutesToday > 0) {
      st.reports.weeklyLog.push({
        date: st.daily.date,
        minutes: st.daily.minutesToday,
        activities: st.daily.activitiesDone,
        newLetters: 0
      });
      // 최근 14일만 유지
      if (st.reports.weeklyLog.length > 14) {
        st.reports.weeklyLog = st.reports.weeklyLog.slice(-14);
      }
    }
    st.daily = {
      date: today,
      sessionsToday: 0,
      minutesToday: 0,
      activitiesDone: 0,
      bonusUnlocked: false
    };
    st.reports.totalDays++;
  }
  st.daily.sessionsToday++;
}
```

- [ ] **Step 3: 브라우저에서 curriculum.js 로드 확인**

`index.html`에 `<script src="js/curriculum.js"></script>` 와 `<script src="js/storage.js"></script>` 추가.
브라우저 콘솔에서 `CURRICULUM.length` → 20, `LETTERS['ㅁ'].strokes.length` → 4, `decomposeHangul('맘')` → `['ㅁ','ㅏ','ㅁ']` 확인.

- [ ] **Step 4: Commit**

```bash
git add js/curriculum.js js/storage.js
git commit -m "feat: add curriculum data (20 words) and storage module"
```

---

## Task 2: 게임 코어 재작성

**Files:**
- Rewrite: `js/game.js`
- Create: `js/pet.js`

- [ ] **Step 1: pet.js — 펫 행동 로직 작성**

`js/pet.js` 생성. 펫 요청 결정, 말풍선 텍스트, 감정 상태:

```javascript
// js/pet.js
// 펫 행동, 감정, 요청 로직

const Pet = {
  request: null,  // 'hungry' | 'bored' | 'sleepy' | null

  // 스탯 기반으로 요청 결정
  updateRequest(st) {
    if (st.sleeping) { this.request = null; return; }
    if (st.hunger < 30) this.request = 'hungry';
    else if (st.mood < 40) this.request = 'bored';
    else if (st.sleepy > 80) this.request = 'sleepy';
    else this.request = null;
  },

  // 현재 요청에 맞는 말풍선 텍스트
  getSpeechText(st) {
    if (st.sleeping) return 'zzz';
    if (st.stage === 0) return '...';

    const words = st.learning.completedWords;
    if (words.length === 0) return '...';

    // 상태에 맞는 말 찾기
    if (this.request === 'hungry') {
      if (words.includes('맘마')) return '맘마...';
      if (words.includes('물')) return '물...';
      return '...';
    }
    if (this.request === 'sleepy') {
      if (words.includes('자다')) return '자...';
      return 'zzz';
    }
    if (this.request === 'bored') {
      if (words.includes('우리')) return '우리 놀자~';
      if (words.includes('나')) return '나!';
      return '...?';
    }
    // 기분 좋을 때 — 랜덤하게 배운 말
    if (words.length > 0) {
      return words[Math.floor(Math.random() * words.length)] + '!';
    }
    return '~';
  },

  // 감정 상태 (렌더러에서 표정 결정에 사용)
  getMood(st) {
    if (st.sleeping) return 'sleeping';
    const avg = (st.hunger + st.mood + (100 - st.sleepy)) / 3;
    if (avg >= 70) return 'happy';
    if (avg >= 40) return 'neutral';
    return 'sad';
  },

  // 요청에 맞는 액션 버튼
  getActionButton(st) {
    if (st.sleeping) return { label: '깨우기', action: 'wake' };
    if (st.stage === 0) return { label: '톡톡 두드리기', action: 'hatch' };
    if (this.request === 'hungry') return { label: '밥 주기', action: 'feed' };
    if (this.request === 'bored') return { label: '같이 놀기', action: 'play' };
    if (this.request === 'sleepy') return { label: '재우기', action: 'sleep' };
    return null; // 괜찮으면 버튼 없음
  },

  // 진화 체크
  checkEvolution(st) {
    const completed = st.learning.completedWords.length;
    for (let i = EVOLUTION.length - 1; i >= 0; i--) {
      if (completed >= EVOLUTION[i].wordsNeeded && st.stage < EVOLUTION[i].stage) {
        return EVOLUTION[i];
      }
    }
    return null;
  }
};
```

- [ ] **Step 2: game.js 재작성 — 3스탯 루프 + 학습 연동**

`js/game.js` 전면 재작성:

```javascript
// js/game.js
// 게임 루프, 스탯 관리, 화면 전환

let st = null;
let tickCount = 0;
let sessionStart = Date.now();
let currentScreen = 'home'; // 'home' | 'naming' | 'learning' | 'reward'
let hatchTaps = 0;

function initGame() {
  st = loadState();
  if (st && st.name) {
    // 기존 세이브 로드
    applyOfflineDecay(st);
    updateDaily(st);
    showScreen('home');
  } else {
    // 새 게임
    st = createDefaultState();
    showScreen('naming');
  }
  setInterval(tick, 1000);
}

function applyOfflineDecay(st) {
  const elapsed = (Date.now() - st.lastUpdate) / 1000;
  if (elapsed <= 0 || st.sleeping) return;
  const cappedElapsed = Math.min(elapsed, 3600); // 최대 1시간
  st.hunger = Math.max(0, st.hunger - cappedElapsed * 0.3);
  st.mood = Math.max(0, st.mood - cappedElapsed * 0.2);
  st.sleepy = Math.min(100, st.sleepy + cappedElapsed * 0.15);
}

function tick() {
  if (!st || !st.name) return;
  tickCount++;

  if (!st.sleeping) {
    st.hunger = Math.max(0, st.hunger - 0.3);
    st.mood = Math.max(0, st.mood - 0.2);
    st.sleepy = Math.min(100, st.sleepy + 0.15);
  } else {
    st.sleepy = Math.max(0, st.sleepy - 1.5);
    if (st.sleepy <= 0) {
      st.sleeping = false;
      st.sleepy = 0;
    }
  }

  // 분 카운트
  if (tickCount % 60 === 0) {
    st.daily.minutesToday++;
    st.reports.totalMinutes++;
  }

  Pet.updateRequest(st);

  // 30초마다 저장
  if (tickCount % 30 === 0) saveState(st);

  // 렌더러 업데이트
  if (typeof updateHome === 'function' && currentScreen === 'home') {
    updateHome(st);
  }
}

function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

function handleAction(action) {
  if (action === 'hatch') {
    hatchTaps++;
    if (hatchTaps >= 3) {
      // 부화!
      st.stage = 1;
      // 첫 단어 시작
      st.learning.currentWord = {
        word: CURRICULUM[0].word,
        phase: 1,
        startedAt: Date.now()
      };
      saveState(st);
    }
    return;
  }

  if (action === 'feed' || action === 'play') {
    // 학습 활동으로 진입
    showScreen('learning');
    if (typeof startLearning === 'function') {
      startLearning(st);
    }
    return;
  }

  if (action === 'sleep') {
    st.sleeping = true;
    saveState(st);
    return;
  }

  if (action === 'wake') {
    st.sleeping = false;
    saveState(st);
    return;
  }

  if (action === 'pet') {
    // 쓰다듬기
    st.mood = Math.min(100, st.mood + 5);
    saveState(st);
  }
}

// 학습 완료 콜백
function onLearningComplete(result) {
  if (result.fed) st.hunger = Math.min(100, st.hunger + 25);
  if (result.played) st.mood = Math.min(100, st.mood + 15);
  st.daily.activitiesDone++;

  // 보너스 체크
  if (st.daily.activitiesDone >= 3 && !st.daily.bonusUnlocked) {
    st.daily.bonusUnlocked = true;
  }

  // 진화 체크
  const evo = Pet.checkEvolution(st);
  if (evo) {
    st.stage = evo.stage;
  }

  saveState(st);
  showScreen(result.newWord ? 'reward' : 'home');
}

// 이름 설정
function setName(name) {
  st.name = name.slice(0, 6);
  st.birthTime = Date.now();
  updateDaily(st);
  saveState(st);
  showScreen('home');
}
```

- [ ] **Step 3: 브라우저에서 게임 루프 동작 확인**

콘솔에서 `st` 객체 확인. `tick()` 호출 후 스탯 감소 확인. `Pet.updateRequest(st)` → 배고플 때 'hungry' 반환 확인.

- [ ] **Step 4: Commit**

```bash
git add js/pet.js js/game.js
git commit -m "feat: rewrite game core with 3 stats and pet behavior"
```

---

## Task 3: HTML 구조 + CSS 재작성

**Files:**
- Rewrite: `index.html`
- Rewrite: `css/styles.css`

- [ ] **Step 1: index.html — 3화면 구조로 재작성**

기존 HTML 전면 교체. 3화면(이름/홈/학습/보상) + 부모 리포트:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>타마고지</title>
  <link rel="manifest" href="manifest.json">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- 이름 짓기 화면 -->
  <div id="screen-naming" class="screen active">
    <div class="naming-container">
      <div class="naming-egg" id="namingEgg"></div>
      <p class="naming-prompt">펫의 이름을 지어줘!</p>
      <input type="text" id="nameInput" class="naming-input" maxlength="6" placeholder="이름">
      <button id="nameSubmit" class="btn-primary" onclick="submitName()">시작하기</button>
    </div>
  </div>

  <!-- 홈 화면 -->
  <div id="screen-home" class="screen">
    <!-- 상단 UI -->
    <div class="home-header">
      <div class="pet-info glass">
        <span id="petName" class="pet-name"></span>
        <span id="petStage" class="pet-stage"></span>
      </div>
      <div class="stat-icons">
        <div class="stat-icon glass">
          <span class="stat-symbol" style="color:#f08080">♥</span>
          <div class="stat-minibar"><div id="barHunger" class="stat-fill" style="background:#f08080"></div></div>
        </div>
        <div class="stat-icon glass">
          <span class="stat-symbol" style="color:#f4b870">☺</span>
          <div class="stat-minibar"><div id="barMood" class="stat-fill" style="background:#f4b870"></div></div>
        </div>
        <div class="stat-icon glass">
          <span class="stat-symbol" style="color:#c8a0d8">☽</span>
          <div class="stat-minibar"><div id="barSleepy" class="stat-fill" style="background:#c8a0d8"></div></div>
        </div>
      </div>
    </div>

    <!-- 펫 + 마당 캔버스 -->
    <div id="worldCanvas" class="world-canvas"></div>

    <!-- 말풍선 -->
    <div id="speechBubble" class="speech-bubble hidden">
      <span id="speechText"></span>
    </div>

    <!-- 하단 액션 -->
    <div class="home-footer">
      <button id="actionBtn" class="btn-action hidden" onclick="handleActionClick()"></button>
      <div class="pet-hint">터치해서 쓰다듬기</div>
    </div>
  </div>

  <!-- 학습 화면 -->
  <div id="screen-learning" class="screen">
    <div class="learning-header">
      <button class="btn-back" onclick="exitLearning()">← 돌아가기</button>
      <div id="learningDots" class="progress-dots"></div>
    </div>
    <div id="learningContent" class="learning-content"></div>
    <div id="miniPet" class="mini-pet"></div>
  </div>

  <!-- 보상 화면 -->
  <div id="screen-reward" class="screen">
    <div id="rewardContent" class="reward-content"></div>
  </div>

  <!-- 부모 리포트 (숨김) -->
  <div id="screen-report" class="screen">
    <div class="report-header">
      <button class="btn-back" onclick="showScreen('home')">← 돌아가기</button>
      <h2>학습 리포트</h2>
    </div>
    <div id="reportContent" class="report-content"></div>
  </div>

  <!-- 스크립트 -->
  <script src="js/curriculum.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/pet.js"></script>
  <script src="js/effects.js"></script>
  <script src="js/world.js"></script>
  <script src="js/renderer.js"></script>
  <script src="js/sprites.js"></script>
  <script src="js/learning.js"></script>
  <script src="js/activities/meet.js"></script>
  <script src="js/activities/discover.js"></script>
  <script src="js/activities/play.js"></script>
  <script src="js/activities/reunite.js"></script>
  <script src="js/report.js"></script>
  <script src="js/game.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', initGame);

    function submitName() {
      const name = document.getElementById('nameInput').value.trim();
      if (name) setName(name);
    }

    function handleActionClick() {
      const btn = Pet.getActionButton(st);
      if (btn) handleAction(btn.action);
    }

    function exitLearning() {
      showScreen('home');
    }

    // 부모 리포트: 3초 길게 누르기
    let longPressTimer = null;
    const petInfo = document.querySelector('.pet-info');
    if (petInfo) {
      petInfo.addEventListener('pointerdown', () => {
        longPressTimer = setTimeout(() => {
          showScreen('report');
          if (typeof renderReport === 'function') renderReport(st);
        }, 3000);
      });
      petInfo.addEventListener('pointerup', () => clearTimeout(longPressTimer));
      petInfo.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: styles.css — 그림책 팔레트 + 터치 최적화**

`css/styles.css` 전면 재작성. 그림책 색감, 글라스모피즘 스탯, 아이패드 터치 최적화. 이 파일은 크므로 핵심 구조만 기재:

- CSS 커스텀 프로퍼티로 10색 팔레트 정의
- `.screen` — 풀 뷰포트, 전환 애니메이션 (slide)
- `.glass` — backdrop-filter: blur(8px), rgba 배경
- `.btn-action` — min-height 48pt, border-radius 18px, 귤색
- `.btn-primary` — 60pt 높이, 둥근 모서리
- `.speech-bubble` — 말풍선 + 삼각형 꼬리
- `.world-canvas` — 풀 화면, 절대 위치
- `.stat-minibar` — 30px 너비 미니 바
- `.learning-content` — 중앙 정렬, 큰 글자
- 미디어 쿼리 (가로/세로)
- safe-area-inset 대응

- [ ] **Step 3: 브라우저에서 화면 전환 확인**

이름 입력 → 홈 화면 전환 확인. 스탯 아이콘 표시 확인. 액션 버튼 표시 확인.

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: rewrite HTML/CSS with picture-book style and 3 screens"
```

---

## Task 4: 월드 렌더링 (하늘 + 잔디 + 글자꽃)

**Files:**
- Create: `js/world.js`

- [ ] **Step 1: world.js — PixiJS 마당 렌더링**

`js/world.js` 생성. 하늘(시간대별), 잔디 언덕, 구름, 해/달, 글자꽃:

```javascript
// js/world.js
// 마당 렌더링 — 하늘, 잔디, 날씨, 글자꽃

const World = {
  app: null,
  sky: null,
  grass: null,
  clouds: [],
  sun: null,
  moon: null,
  letterFlowers: [],

  async init(container) {
    this.app = new PIXI.Application();
    await this.app.init({
      resizeTo: container,
      backgroundAlpha: 1,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    container.appendChild(this.app.canvas);
    this.buildScene();
    this.app.ticker.add(() => this.animate());
  },

  buildScene() {
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // 하늘
    this.sky = new PIXI.Graphics();
    this.app.stage.addChild(this.sky);

    // 구름 (2~3개)
    for (let i = 0; i < 3; i++) {
      const cloud = new PIXI.Graphics();
      cloud.fill({ color: 0xffffff, alpha: 0.5 + Math.random() * 0.2 });
      const cw = 60 + Math.random() * 40;
      cloud.ellipse(0, 0, cw, 15 + Math.random() * 10);
      cloud.fill();
      cloud.x = Math.random() * W;
      cloud.y = 30 + Math.random() * 50;
      cloud._speed = 0.1 + Math.random() * 0.2;
      this.clouds.push(cloud);
      this.app.stage.addChild(cloud);
    }

    // 해/달
    this.sun = new PIXI.Graphics();
    this.app.stage.addChild(this.sun);
    this.moon = new PIXI.Graphics();
    this.app.stage.addChild(this.moon);

    // 잔디 언덕
    this.grass = new PIXI.Graphics();
    this.app.stage.addChild(this.grass);

    this.updateTimeOfDay();
  },

  updateTimeOfDay() {
    const hour = new Date().getHours();
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // 하늘 색상
    this.sky.clear();
    let skyTop, skyBottom;
    if (hour >= 6 && hour < 18) {
      skyTop = 0x88c8e8; skyBottom = 0xb8ddf0;
    } else if (hour >= 18 && hour < 21) {
      skyTop = 0xf0a870; skyBottom = 0xd88860;
    } else {
      skyTop = 0x2a2848; skyBottom = 0x3a3868;
    }
    // 그라데이션 근사 (상단→하단 줄무늬)
    for (let y = 0; y < H * 0.5; y++) {
      const t = y / (H * 0.5);
      const r = ((skyTop >> 16) & 0xff) * (1 - t) + ((skyBottom >> 16) & 0xff) * t;
      const g = ((skyTop >> 8) & 0xff) * (1 - t) + ((skyBottom >> 8) & 0xff) * t;
      const b = (skyTop & 0xff) * (1 - t) + (skyBottom & 0xff) * t;
      this.sky.rect(0, y, W, 1).fill({ color: (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b) });
    }

    // 잔디
    this.grass.clear();
    this.grass.fill({ color: 0xa8d8b0 });
    this.grass.ellipse(W / 2, H, W * 0.7, H * 0.55);
    this.grass.fill();
    this.grass.fill({ color: 0x98c8a0 });
    this.grass.ellipse(W / 2, H * 1.05, W * 0.6, H * 0.5);
    this.grass.fill();

    // 해/달 표시
    const isNight = hour < 6 || hour >= 21;
    this.sun.clear();
    this.moon.clear();
    if (!isNight) {
      this.sun.circle(0, 0, 22).fill({ color: 0xf0d060 });
      this.sun.x = W - 50;
      this.sun.y = 40;
      this.sun.visible = true;
      this.moon.visible = false;
    } else {
      this.moon.circle(0, 0, 16).fill({ color: 0xf0e8c0 });
      this.moon.x = W - 50;
      this.moon.y = 35;
      this.moon.visible = true;
      this.sun.visible = false;
    }
  },

  // 글자꽃 추가
  addLetterFlower(letter, knownLetters) {
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const existing = this.letterFlowers.find(f => f._letter === letter);
    if (existing) return;

    const flower = new PIXI.Container();
    // 꽃 배경 원
    const bg = new PIXI.Graphics();
    bg.circle(0, 0, 18).fill({ color: 0xffffff });
    flower.addChild(bg);
    // 글자
    const text = new PIXI.Text({
      text: letter,
      style: { fontFamily: 'Noto Sans KR', fontSize: 16, fontWeight: '900', fill: 0x3a3028 }
    });
    text.anchor.set(0.5);
    flower.addChild(text);

    // 위치: 잔디 영역에 랜덤
    flower.x = 40 + Math.random() * (W - 80);
    flower.y = H * 0.55 + Math.random() * (H * 0.25);
    flower._letter = letter;
    flower._baseY = flower.y;
    flower._floatOffset = Math.random() * Math.PI * 2;
    flower.eventMode = 'static';
    flower.cursor = 'pointer';
    flower.on('pointerdown', () => {
      if (typeof speakText === 'function') speakText(LETTERS[letter].sound);
    });

    this.letterFlowers.push(flower);
    this.app.stage.addChild(flower);
  },

  // 글자꽃 싱크 (knownLetters 기반)
  syncLetterFlowers(knownLetters) {
    knownLetters.forEach(l => this.addLetterFlower(l, knownLetters));
  },

  animate() {
    const W = this.app.screen.width;
    const t = Date.now() / 1000;

    // 구름 이동
    this.clouds.forEach(c => {
      c.x += c._speed;
      if (c.x > W + 60) c.x = -60;
    });

    // 글자꽃 둥둥
    this.letterFlowers.forEach(f => {
      f.y = f._baseY + Math.sin(t + f._floatOffset) * 3;
    });
  },

  resize() {
    if (this.app) {
      this.updateTimeOfDay();
    }
  }
};
```

- [ ] **Step 2: 브라우저에서 마당 렌더링 확인**

홈 화면에 하늘+잔디 배경, 구름 이동, 해/달 표시 확인. `World.addLetterFlower('ㅁ')` 호출하여 글자꽃 표시 확인.

- [ ] **Step 3: Commit**

```bash
git add js/world.js
git commit -m "feat: add world rendering with sky, grass, clouds, and letter flowers"
```

---

## Task 5: 펫 렌더링 + 표정

**Files:**
- Rewrite: `js/renderer.js`
- Rewrite: `js/sprites.js`

- [ ] **Step 1: sprites.js — 8단계 펫 스프라이트 + 표정**

`js/sprites.js` 재작성. 각 단계별 펫 형태 + happy/neutral/sad/sleeping 표정 변형. PixiJS Graphics로 그릴 수 있는 좌표 데이터.

- [ ] **Step 2: renderer.js — 펫+월드 통합 렌더링**

`js/renderer.js` 재작성. 펫을 월드 위에 렌더링. 표정 변경, 말풍선 업데이트, 터치→쓰다듬기, 이동(두리번/점프), 잠자기 애니메이션.

핵심 함수:
- `initRenderer(container)` — World.init() 호출 후 펫 컨테이너 추가
- `updateHome(st)` — 매 틱마다 호출. 스탯 바 업데이트, 말풍선, 표정, 액션 버튼
- `petJump()` — 점프 애니메이션
- `petCelebrate()` — 보상 시 축하 연출

- [ ] **Step 3: 홈 화면에서 펫 동작 확인**

펫 표시, 눈 깜빡임, 두리번거림, 말풍선 텍스트, 터치 반응(쓰다듬기) 확인.

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js js/sprites.js
git commit -m "feat: rewrite pet rendering with expressions and world integration"
```

---

## Task 6: 사운드 효과 + TTS

**Files:**
- Rewrite: `js/effects.js`

- [ ] **Step 1: effects.js — TTS + 사운드 재작성**

`js/effects.js` 재작성:

```javascript
// js/effects.js
// TTS 발음 + 효과음 + 파티클

function speakText(text, rate) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = rate || 0.8;
  u.pitch = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// 효과음 (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.value = 0.15;

  if (type === 'correct') {
    osc.frequency.value = 523; osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    setTimeout(() => {
      const o2 = audioCtx.createOscillator();
      const g2 = audioCtx.createGain();
      o2.connect(g2); g2.connect(audioCtx.destination);
      o2.frequency.value = 659; o2.type = 'sine';
      g2.gain.value = 0.15;
      g2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      o2.start(); o2.stop(audioCtx.currentTime + 0.3);
    }, 150);
  } else if (type === 'click') {
    osc.frequency.value = 800; osc.type = 'square';
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.start(); osc.stop(audioCtx.currentTime + 0.08);
  } else if (type === 'evolve') {
    osc.frequency.value = 440; osc.type = 'sine';
    gain.gain.value = 0.2;
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.start(); osc.stop(audioCtx.currentTime + 0.6);
  }
}

// 별 파티클 (PixiJS 기반 — World.app에 추가)
function showStarParticles(x, y, count) {
  if (!World.app) return;
  for (let i = 0; i < Math.min(count, 50); i++) {
    const star = new PIXI.Text({
      text: '✦',
      style: { fontSize: 12 + Math.random() * 12, fill: 0xf0d060 }
    });
    star.x = x + (Math.random() - 0.5) * 100;
    star.y = y + (Math.random() - 0.5) * 80;
    star.alpha = 0.8;
    star._vx = (Math.random() - 0.5) * 2;
    star._vy = -1 - Math.random() * 2;
    star._life = 60;
    World.app.stage.addChild(star);

    const ticker = () => {
      star.x += star._vx;
      star.y += star._vy;
      star._vy += 0.03;
      star.alpha -= 0.013;
      star._life--;
      if (star._life <= 0) {
        World.app.stage.removeChild(star);
        World.app.ticker.remove(ticker);
        star.destroy();
      }
    };
    World.app.ticker.add(ticker);
  }
}
```

- [ ] **Step 2: TTS 동작 확인**

`speakText('맘마')` → "맘마" 발음 재생 확인. `playSound('correct')` → 효과음 확인.

- [ ] **Step 3: Commit**

```bash
git add js/effects.js
git commit -m "feat: rewrite effects with TTS and star particles"
```

---

## Task 7: 학습 엔진 + 1단계(만남) 활동

**Files:**
- Create: `js/learning.js`
- Create: `js/activities/meet.js`

- [ ] **Step 1: learning.js — 4단계 사이클 엔진**

`js/learning.js` 생성. 현재 단어의 현재 단계에 맞는 활동 시작/완료 관리:

```javascript
// js/learning.js
// 학습 4단계 사이클 엔진

const Learning = {
  currentActivity: null,

  startLearning(st) {
    if (!st.learning.currentWord) {
      // 첫 단어 배정
      st.learning.currentWord = {
        word: CURRICULUM[0].word,
        phase: 1,
        startedAt: Date.now()
      };
    }

    const wordData = CURRICULUM.find(c => c.word === st.learning.currentWord.word);
    if (!wordData) return;

    const phase = st.learning.currentWord.phase;
    switch (phase) {
      case 1: MeetActivity.start(st, wordData); break;
      case 2: DiscoverActivity.start(st, wordData); break;
      case 3: PlayActivity.start(st, wordData); break;
      case 4: this.handleReunite(st, wordData); break;
    }
  },

  onPhaseComplete(st) {
    const cw = st.learning.currentWord;
    if (cw.phase < 4) {
      cw.phase++;
      saveState(st);
      // 다음 단계로 자연스럽게 진행 또는 홈으로
      showScreen('home');
    } else {
      this.completeWord(st);
    }
  },

  completeWord(st) {
    const cw = st.learning.currentWord;
    const wordData = CURRICULUM.find(c => c.word === cw.word);

    // 배운 글자 추가
    if (wordData) {
      wordData.letters.forEach(l => {
        if (!st.learning.knownLetters.includes(l)) {
          st.learning.knownLetters.push(l);
          // 리포트 통계
          st.reports.letterStats[l] = {
            firstSeen: new Date().toISOString().slice(0, 10),
            exposures: 1,
            lastSeen: new Date().toISOString().slice(0, 10)
          };
        }
      });
    }

    // 완료 기록
    st.learning.completedWords.push(cw.word);
    st.learning.wordHistory.push({
      word: cw.word,
      completedAt: Date.now(),
      daysSpent: Math.ceil((Date.now() - cw.startedAt) / 86400000)
    });

    // 다음 단어
    const nextIndex = st.learning.completedWords.length;
    if (nextIndex < CURRICULUM.length) {
      st.learning.currentWord = {
        word: CURRICULUM[nextIndex].word,
        phase: 1,
        startedAt: Date.now()
      };
    } else {
      st.learning.currentWord = null;
    }

    saveState(st);

    // 보상 화면
    onLearningComplete({
      fed: wordData && (wordData.petRequest === 'hungry' || wordData.petRequest === 'thirsty'),
      played: wordData && wordData.petRequest === 'bored',
      newWord: cw.word
    });
  },

  handleReunite(st, wordData) {
    // 4단계: 재회 — 아는 글자 하이라이트 후 다음 단어로
    ReuniteActivity.start(st, wordData);
  }
};

// game.js에서 호출하는 글로벌 함수
function startLearning(st) {
  Learning.startLearning(st);
}
```

- [ ] **Step 2: meet.js — 1단계 만남 활동**

`js/activities/meet.js` 생성:

```javascript
// js/activities/meet.js
// 1단계: 만남 — 통글자 표시, 발음, 터치→펫 전달

const MeetActivity = {
  start(st, wordData) {
    const container = document.getElementById('learningContent');
    container.innerHTML = '';

    // 미니 펫 (상단)
    const petArea = document.createElement('div');
    petArea.className = 'meet-pet';
    petArea.innerHTML = '<div class="mini-pet-sprite"></div>';
    container.appendChild(petArea);

    // 펫 말풍선
    const bubble = document.createElement('div');
    bubble.className = 'meet-bubble';
    bubble.textContent = this.getRequestText(wordData);
    container.appendChild(bubble);

    // 삽화 (placeholder)
    const illust = document.createElement('div');
    illust.className = 'meet-illustration';
    illust.textContent = wordData.illustration;
    container.appendChild(illust);

    // 큰 단어
    const wordEl = document.createElement('div');
    wordEl.className = 'meet-word';
    wordEl.textContent = wordData.word;
    container.appendChild(wordEl);

    // 소리 버튼
    const soundBtn = document.createElement('button');
    soundBtn.className = 'meet-sound-btn';
    soundBtn.textContent = '♪ 다시 듣기';
    soundBtn.onclick = () => speakText(wordData.word);
    container.appendChild(soundBtn);

    // 안내
    const hint = document.createElement('p');
    hint.className = 'meet-hint';
    hint.textContent = '같이 말해볼까? 글자를 터치해봐!';
    container.appendChild(hint);

    // 단어 터치 → 펫에게 전달
    wordEl.onclick = () => {
      playSound('correct');
      speakText(wordData.word);
      wordEl.classList.add('meet-word-fly');
      setTimeout(() => {
        Learning.onPhaseComplete(st);
      }, 1000);
    };

    // 자동 발음
    setTimeout(() => speakText(wordData.word), 500);
  },

  getRequestText(wordData) {
    const req = wordData.petRequest;
    if (req === 'hungry') return '배고파...';
    if (req === 'thirsty') return '목 말라...';
    if (req === 'sleepy') return '졸려...';
    return '같이 놀자~';
  }
};
```

- [ ] **Step 3: 만남 활동 동작 확인**

홈에서 "밥 주기" 클릭 → 학습 화면 전환 → "맘마" 단어 표시 + TTS 발음 → 터치 → 홈 복귀 확인.

- [ ] **Step 4: Commit**

```bash
git add js/learning.js js/activities/meet.js
git commit -m "feat: add learning engine and meet (phase 1) activity"
```

---

## Task 8: 2단계(발견) + 따라 그리기

**Files:**
- Create: `js/activities/discover.js`

- [ ] **Step 1: discover.js — 분해 애니메이션 + 터치 탐구 + 따라 그리기**

`js/activities/discover.js` 생성. 핵심 기능:

1. 통글자가 음절→낱글자로 분해되는 애니메이션
2. 각 글자 터치 시 소리 재생 (미학습 글자는 회색 + "나중에 배울 거야~")
3. 새 글자에 대해 따라 그리기: PixiJS Graphics 캔버스에 점선 가이드 + 획순 화살표. 포인터 이벤트로 경로 추적, 가이드 점의 70% 통과 시 완료

- [ ] **Step 2: 따라 그리기 판정 로직 확인**

ㅁ 따라 그리기 → 대략적으로 따라가면 완료 판정. 빗나가면 "한 번 더!" (무한 재시도). 완료 시 소리 + 다음 글자로.

- [ ] **Step 3: Commit**

```bash
git add js/activities/discover.js
git commit -m "feat: add discover (phase 2) with decomposition and tracing"
```

---

## Task 9: 3단계(놀이) — 퍼즐 + 색칠 + 소리 매칭

**Files:**
- Create: `js/activities/play.js`

- [ ] **Step 1: play.js — 3가지 놀이 활동**

`js/activities/play.js` 생성. 3가지 활동 중 하나를 순서대로 또는 랜덤 선택:

1. **퍼즐**: PixiJS 드래그 앤 드롭. 글자 조각이 흩어져 있고 틀에 맞춰 배치. 스냅 반경 60pt. 미학습 글자는 이미 고정.
2. **색칠**: PixiJS Graphics 캔버스. 큰 글자 윤곽선, 손가락으로 칠하기. 영역의 70% 이상 칠하면 완료.
3. **소리 매칭**: TTS로 소리 재생 → 2~3개 글자 중 터치. 이미 아는 글자만 선택지. 3번 틀리면 정답 하이라이트.

- [ ] **Step 2: 각 활동 개별 동작 확인**

퍼즐 드래그 → 스냅. 색칠 → 완료 판정. 소리 매칭 → 정답 시 효과음.

- [ ] **Step 3: Commit**

```bash
git add js/activities/play.js
git commit -m "feat: add play (phase 3) with puzzle, coloring, and sound matching"
```

---

## Task 10: 4단계(재회) + 보상 화면

**Files:**
- Create: `js/activities/reunite.js`

- [ ] **Step 1: reunite.js — 아는 글자 하이라이트 + 새 글자만 학습**

`js/activities/reunite.js` 생성. 다음 단어의 분해 시 이미 아는 글자를 하이라이트 + 펫 반응 "이거 알아!". 새 글자만 발견→놀이 사이클 진행.

- [ ] **Step 2: 보상 화면 구현**

`showScreen('reward')` 시:
- 펫 ^_^ + 점프 애니메이션
- 별 파티클
- 새로 배운 단어 크게 표시
- "모찌가 새로운 말을 배웠어!" 텍스트
- 터치하면 홈으로 (마당에 새 글자꽃 추가)

보상 화면 렌더링은 `game.js`의 `showScreen('reward')` 호출 시 DOM으로 구성.

- [ ] **Step 3: 전체 4단계 사이클 테스트**

만남→발견→놀이→재회→단어 완료→글자꽃 추가→다음 단어 시작. 전체 흐름 확인.

- [ ] **Step 4: Commit**

```bash
git add js/activities/reunite.js
git commit -m "feat: add reunite (phase 4) and reward screen"
```

---

## Task 11: 부모 리포트

**Files:**
- Create: `js/report.js`

- [ ] **Step 1: report.js — 학습 대시보드**

`js/report.js` 생성. 3초 길게 누르기로 진입하는 부모용 화면:

- 자음 진행: 바 + 숫자 (N/8)
- 모음 진행: 바 + 숫자 (N/6)
- 완료 단어 수
- 현재 학습 중인 단어 + 단계
- 이번 주 일별 학습 시간 그래프 (간단한 바 차트)
- 총 학습일/총 학습 시간

DOM으로 렌더링 (`#reportContent`에).

- [ ] **Step 2: 리포트 표시 확인**

홈에서 펫 이름 3초 길게 누르기 → 리포트 화면 전환 확인. 데이터 정확성 확인.

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat: add parent learning report dashboard"
```

---

## Task 12: PWA + 미니게임 삭제 + 최종 정리

**Files:**
- Modify: `sw.js`
- Modify: `manifest.json`
- Delete: `js/minigames.js`

- [ ] **Step 1: minigames.js 삭제**

```bash
git rm js/minigames.js
```

- [ ] **Step 2: sw.js — 캐시 목록 업데이트**

새 파일들을 Service Worker 캐시 목록에 추가. 버전 번호 올리기.

- [ ] **Step 3: manifest.json 업데이트**

이름을 "타마고지 — 한글 학습" 으로 변경. 아이콘 확인.

- [ ] **Step 4: .gitignore에 .superpowers/ 추가**

```bash
echo '.superpowers/' >> .gitignore
```

- [ ] **Step 5: 전체 흐름 통합 테스트**

아이패드 Safari에서 전체 흐름 테스트:
1. 이름 짓기 → 홈 (알 상태)
2. 알 3번 터치 → 부화
3. 펫이 "배고파" → 밥 주기 → 만남(맘마)
4. 발견 → 따라 그리기
5. 놀이 → 퍼즐
6. 보상 → 글자꽃 추가
7. 재우기 → zzz
8. 부모 리포트 확인
9. 오프라인 동작 확인
10. 가로/세로 전환

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete educational hangeul tamagotchi redesign"
```
