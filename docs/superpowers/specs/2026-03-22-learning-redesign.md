# 한글 학습 시스템 재설계

## 개요

타마고지의 한글 학습 시스템을 전면 재설계한다.

**문제:**
1. 퍼즐이 한글의 2D 블록 구조를 무시하고 일렬 나열
2. 한글 못 읽는 5~7세에게 한글 텍스트로 안내
3. 게임↔학습 화면 전환이 급작스럽고 맥락 끊김
4. TTS가 낱글자(ㅁ,ㄱ) 발음을 제대로 못함
5. 통글자 방식 대신 자음/모음 순차 학습 필요

**변경 범위:** js/activities/\*, js/curriculum.js, js/learning.js, js/effects.js, css/styles.css, index.html

---

## 1. 학습 순서: 3단계 커리큘럼

기존 통글자(맘마→물→나...) 방식을 폐기. 자음→모음→조합 순차 학습으로 변경.

### 1단계: 기본 자음 (9개)

순서: ㄱ → ㄴ → ㄷ → ㄹ → ㅁ → ㅂ → ㅅ → ㅇ → ㅈ

각 자음 학습 활동:
1. **모양 보기** — 큰 글자 표시 + 발음 재생 + 펫이 소리 따라냄
2. **따라 그리기** — 획순 가이드(화살표 애니메이션) + 손가락 애니메이션 데모 + 70% 커버리지 판정
3. **구분하기** — 비슷한 글자 2~3개 중 방금 배운 글자 고르기 (예: ㄱ vs ㄴ vs ㄷ 중 ㄱ 터치)

### 2단계: 기본 모음 (6개)

순서: ㅏ → ㅓ → ㅗ → ㅜ → ㅡ → ㅣ

학습 활동은 자음과 동일한 3단계 (모양 보기 → 따라 그리기 → 구분하기).

### 3단계: 조합 + 확장

기본 자음+모음으로 조합 시작. 일상 단어 위주.

학습 활동:
1. **2D 블록 퍼즐** — 음절 구조에 맞는 슬롯에 자음/모음 끌어놓기
2. **단어 완성** — 여러 음절 블록을 조합해서 단어 완성
3. **듣고 만들기** — 발음 듣고 해당 단어를 퍼즐로 조합

확장 자음(ㅊ ㅋ ㅌ ㅍ ㅎ) + 확장 모음(ㅐ ㅔ)은 조합 단계에서 필요할 때 추가 학습.

### 조합 단어 목록 (초기 15개)

| # | 단어 | 음절 구조 | 사용 글자 |
|---|------|-----------|-----------|
| 1 | 나 | ㄴ+ㅏ (lr) | 기본 |
| 2 | 구 | ㄱ+ㅜ (tb) | 기본 |
| 3 | 소 | ㅅ+ㅗ (tb) | 기본 |
| 4 | 머리 | ㅁ+ㅓ (lr) / ㄹ+ㅣ (lr) | 기본 |
| 5 | 다리 | ㄷ+ㅏ (lr) / ㄹ+ㅣ (lr) | 기본 |
| 6 | 바지 | ㅂ+ㅏ (lr) / ㅈ+ㅣ (lr) | 기본 |
| 7 | 우리 | ㅇ+ㅜ (tb) / ㄹ+ㅣ (lr) | 기본 |
| 8 | 나무 | ㄴ+ㅏ (lr) / ㅁ+ㅜ (tb) | 기본 |
| 9 | 고기 | ㄱ+ㅗ (tb) / ㄱ+ㅣ (lr) | 기본 |
| 10 | 오리 | ㅇ+ㅗ (tb) / ㄹ+ㅣ (lr) | 기본 |
| 11 | 아버지 | ㅇ+ㅏ (lr) / ㅂ+ㅓ (lr) / ㅈ+ㅣ (lr) | 기본 |
| 12 | 손 | ㅅ+ㅗ+ㄴ (tmb) | 종성 도입 |
| 13 | 물 | ㅁ+ㅜ+ㄹ (tmb) | 종성 |
| 14 | 밥 | ㅂ+ㅏ+ㅂ (lrb) | 종성 |
| 15 | 사람 | ㅅ+ㅏ (lr) / ㄹ+ㅏ+ㅁ (lrb) | 종성 |

---

## 2. 2D 블록 퍼즐

### 음절 구조 4가지 타입

한글 음절은 모음의 방향에 따라 레이아웃이 달라짐:

**세로 모음 (ㅏ ㅓ ㅣ):**
- `lr` — 초성(좌) + 중성(우). 예: 가, 나, 머
- `lrb` — 초성(좌상) + 중성(우상) + 종성(하). 예: 맘, 밥

**가로 모음 (ㅗ ㅜ ㅡ):**
- `tb` — 초성(상) + 중성(하). 예: 고, 무
- `tmb` — 초성(상) + 중성(중) + 종성(하). 예: 물, 손

### 퍼즐 레이아웃

```
타입 lr:              타입 tb:
┌────────┬────────┐   ┌─────────────────┐
│        │        │   │                 │
│  초성  │  중성  │   │     초성        │
│ (파랑) │ (초록) │   │    (파랑)       │
│        │        │   ├─────────────────┤
└────────┴────────┘   │                 │
                      │     중성        │
                      │    (초록)       │
                      └─────────────────┘

타입 lrb:             타입 tmb:
┌────────┬────────┐   ┌─────────────────┐
│  초성  │  중성  │   │     초성        │
│ (파랑) │ (초록) │   │    (파랑)       │
├────────┴────────┤   ├─────────────────┤
│                 │   │     중성        │
│     종성        │   │    (초록)       │
│    (주황)       │   ├─────────────────┤
└─────────────────┘   │     종성        │
                      │    (주황)       │
                      └─────────────────┘
```

### 슬롯 시각 구분

- 초성 슬롯: 연한 파랑 배경 (#e0e8f0)
- 중성 슬롯: 연한 초록 배경 (#e0f0e8)
- 종성 슬롯: 연한 주황 배경 (#f0e8e0)
- 빈 슬롯: 점선 테두리 + "?" 표시
- 드래그 조각: 흰색 카드, 주황 테두리 (#f4b870), 둥근 모서리

### 퍼즐 인터랙션

1. 팝업 열리면 음절 블록 템플릿(빈 슬롯) + 드래그 조각이 표시
2. 손가락 애니메이션이 첫 조각→첫 슬롯 이동 데모 (2초)
3. 동시에 음성: "여기에 넣어봐~"
4. 아이가 조각을 터치 → 드래그 → 올바른 슬롯 근처(60px)에 놓으면 스냅
5. 잘못된 슬롯에 놓으면 부드럽게 원래 위치로 돌아감 (흔들림 효과)
6. 올바른 위치에 놓으면: 발음 재생 + 펫 반응
7. 모든 슬롯 채우면: 블록이 합쳐지며 완성 글자 표시 + 축하 효과
8. 10초 무응답 시: 손가락 가이드 다시 재생

### 타입 결정 로직

모음을 기준으로 자동 결정:
- 세로 모음 (ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅣ) → lr 또는 lrb
- 가로 모음 (ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ) → tb 또는 tmb
- 종성 유무 → b 또는 mb 추가

```javascript
function getSyllableType(cho, jung, jong) {
  var verticalVowels = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅣ'];
  var isVertical = verticalVowels.indexOf(jung) !== -1;
  if (jong) {
    return isVertical ? 'lrb' : 'tmb';
  }
  return isVertical ? 'lr' : 'tb';
}
```

---

## 3. 시각적 가이드 시스템

### 원칙

한글을 못 읽는 아이를 위해 모든 안내를 **애니메이션 + 음성**으로 전달. 한글 텍스트는 보조적으로만 사용.

### 가이드 요소

#### 손가락 애니메이션
- CSS로 구현한 반투명 원형 터치 아이콘 (pointer finger 모양)
- 조각 위에서 반짝 → 목표 슬롯으로 이동 → 사라짐 (2초 루프)
- 터치해야 할 요소 위에서 펄스(커졌다 작아졌다) 애니메이션

#### 음성 가이드
- 각 활동 시작 시 자동 재생되는 안내 음성
- Web Speech API (ko-KR) 사용, 느린 속도 (rate: 0.7)
- 주요 음성:
  - "따라 그려봐~" (따라 그리기 시작)
  - "여기에 넣어봐~" (퍼즐 시작)
  - "어떤 글자일까~?" (구분하기)
  - "잘했어~!" (성공)
  - "다시 해볼까~?" (재시도)

#### 무응답 감지
- 10초간 터치 없으면 손가락 가이드 다시 재생
- 20초간 무응답이면 음성도 다시 재생
- 절대 타임아웃/실패 없음 — 무한 대기

### 상황별 가이드 적용

| 활동 | 시각 가이드 | 음성 |
|------|------------|------|
| 글자 보기 | 글자가 크게 나타나며 반짝 | "[글자이름]. [소리]" |
| 따라 그리기 | 획순 화살표 자동 재생 + 손가락 경로 | "따라 그려봐~" |
| 구분하기 | 정답 위에 살짝 밝은 하이라이트 (3번 틀리면) | "어떤 글자일까~?" |
| 퍼즐 | 손가락이 조각→슬롯 이동 데모 | "여기에 넣어봐~" |
| 성공 | 별 파티클 + 펫 점프 | "잘했어~!" |
| 재시도 | 손가락 가이드 재생 | "다시 해볼까~?" |

---

## 4. 학습 흐름: 마당 팝업

### 기존 흐름 (폐기)

```
홈 화면 → [화면 전환] → 학습 화면 → [화면 전환] → 보상 화면 → [화면 전환] → 홈
```

### 새 흐름

```
마당에서 놀기 → 글자꽃(?) 터치 → [팝업 열림] → 학습 활동 → [팝업 닫힘] → 꽃 피어남
```

- 화면 전환 없음. 마당이 항상 배경에 보임
- 팝업은 화면의 85% 차지, 뒤에 마당이 어둡게 비침
- 펫은 팝업 아래/옆에서 반응 (표정, 점프)
- 팝업 닫기: X 버튼 또는 활동 완료 시 자동 닫힘
- 닫히면 해당 위치에 글자꽃이 피어나는 애니메이션

### 마당의 글자꽃

- 1~2단계 (자음/모음): 각 글자가 잠긴 꽃(?) 형태로 잔디에 배치
  - 순서대로 다음 배울 글자만 반짝이며 터치 유도
  - 이미 배운 글자는 피어난 꽃 (터치하면 발음 재생)
  - 아직 안 배운 글자는 회색 잠긴 상태
- 3단계 (조합): 단어 꽃으로 전환
  - 완성한 단어가 꽃으로 표시
  - 다음 배울 단어가 반짝이며 터치 유도

### 펫과의 연결

- 자음 배울 때: 펫이 옆에서 같이 소리 냄 ("그..." "느...")
- 모음 배울 때: 펫의 소리가 다양해짐 ("아~ 오~")
- 조합 시작: 펫이 처음으로 단어를 말함 ("나!" "구!")
- 조합 늘어남: 펫의 말풍선이 점점 길어짐

---

## 5. TTS 최적화

### 발음 텍스트 매핑

Web Speech API(ko-KR) 유지. 글자별 최적화된 발음 텍스트:

```javascript
// 자음: "이름. 소리" 패턴
'ㄱ': { sound: '기역. 그' }
'ㄴ': { sound: '니은. 느' }
'ㄷ': { sound: '디귿. 드' }
'ㄹ': { sound: '리을. 르' }
'ㅁ': { sound: '미음. 므' }
'ㅂ': { sound: '비읍. 브' }
'ㅅ': { sound: '시옷. 스' }
'ㅇ': { sound: '이응' }
'ㅈ': { sound: '지읒. 즈' }

// 모음: 그대로
'ㅏ': { sound: '아' }
'ㅓ': { sound: '어' }
'ㅗ': { sound: '오' }
'ㅜ': { sound: '우' }
'ㅡ': { sound: '으' }
'ㅣ': { sound: '이' }
```

TTS 설정: `rate: 0.7`, `pitch: 1.1`, `lang: 'ko-KR'`

---

## 6. 데이터 구조 변경

### 기존 (폐기)

```javascript
var CURRICULUM = [
  { word: '맘마', syllables: [...], letters: [...], activities: {...} },
  ...
];
```

### 새 구조

```javascript
var CURRICULUM = {
  // 1단계
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
  // 2단계
  vowels: [
    { letter: 'ㅏ', sound: '아', order: 1 },
    { letter: 'ㅓ', sound: '어', order: 2 },
    { letter: 'ㅗ', sound: '오', order: 3 },
    { letter: 'ㅜ', sound: '우', order: 4 },
    { letter: 'ㅡ', sound: '으', order: 5 },
    { letter: 'ㅣ', sound: '이', order: 6 }
  ],
  // 3단계
  words: [
    {
      word: '나', meaning: '나', illustration: 'child',
      syllables: [
        { char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' }
      ]
    },
    {
      word: '구', meaning: '구(공)', illustration: 'ball',
      syllables: [
        { char: '구', type: 'tb', cho: 'ㄱ', jung: 'ㅜ' }
      ]
    },
    {
      word: '소', meaning: '소', illustration: 'cow',
      syllables: [
        { char: '소', type: 'tb', cho: 'ㅅ', jung: 'ㅗ' }
      ]
    },
    {
      word: '머리', meaning: '머리', illustration: 'head',
      syllables: [
        { char: '머', type: 'lr', cho: 'ㅁ', jung: 'ㅓ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ]
    },
    {
      word: '다리', meaning: '다리', illustration: 'legs',
      syllables: [
        { char: '다', type: 'lr', cho: 'ㄷ', jung: 'ㅏ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ]
    },
    {
      word: '바지', meaning: '바지', illustration: 'pants',
      syllables: [
        { char: '바', type: 'lr', cho: 'ㅂ', jung: 'ㅏ' },
        { char: '지', type: 'lr', cho: 'ㅈ', jung: 'ㅣ' }
      ]
    },
    {
      word: '우리', meaning: '우리', illustration: 'us',
      syllables: [
        { char: '우', type: 'tb', cho: 'ㅇ', jung: 'ㅜ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ]
    },
    {
      word: '나무', meaning: '나무', illustration: 'tree',
      syllables: [
        { char: '나', type: 'lr', cho: 'ㄴ', jung: 'ㅏ' },
        { char: '무', type: 'tb', cho: 'ㅁ', jung: 'ㅜ' }
      ]
    },
    {
      word: '고기', meaning: '고기', illustration: 'meat',
      syllables: [
        { char: '고', type: 'tb', cho: 'ㄱ', jung: 'ㅗ' },
        { char: '기', type: 'lr', cho: 'ㄱ', jung: 'ㅣ' }
      ]
    },
    {
      word: '오리', meaning: '오리', illustration: 'duck',
      syllables: [
        { char: '오', type: 'tb', cho: 'ㅇ', jung: 'ㅗ' },
        { char: '리', type: 'lr', cho: 'ㄹ', jung: 'ㅣ' }
      ]
    },
    {
      word: '아버지', meaning: '아버지', illustration: 'dad',
      syllables: [
        { char: '아', type: 'lr', cho: 'ㅇ', jung: 'ㅏ' },
        { char: '버', type: 'lr', cho: 'ㅂ', jung: 'ㅓ' },
        { char: '지', type: 'lr', cho: 'ㅈ', jung: 'ㅣ' }
      ]
    },
    {
      word: '손', meaning: '손', illustration: 'hand',
      syllables: [
        { char: '손', type: 'tmb', cho: 'ㅅ', jung: 'ㅗ', jong: 'ㄴ' }
      ]
    },
    {
      word: '물', meaning: '물', illustration: 'water',
      syllables: [
        { char: '물', type: 'tmb', cho: 'ㅁ', jung: 'ㅜ', jong: 'ㄹ' }
      ]
    },
    {
      word: '밥', meaning: '밥', illustration: 'rice',
      syllables: [
        { char: '밥', type: 'lrb', cho: 'ㅂ', jung: 'ㅏ', jong: 'ㅂ' }
      ]
    },
    {
      word: '사람', meaning: '사람', illustration: 'person',
      syllables: [
        { char: '사', type: 'lr', cho: 'ㅅ', jung: 'ㅏ' },
        { char: '람', type: 'lrb', cho: 'ㄹ', jung: 'ㅏ', jong: 'ㅁ' }
      ]
    }
  ],
  // 확장 자음 (3단계에서 필요 시 추가)
  extConsonants: [
    { letter: 'ㅊ', sound: '치읓. 츠', order: 10 },
    { letter: 'ㅋ', sound: '키읔. 크', order: 11 },
    { letter: 'ㅌ', sound: '티읕. 트', order: 12 },
    { letter: 'ㅍ', sound: '피읖. 프', order: 13 },
    { letter: 'ㅎ', sound: '히읗. 흐', order: 14 }
  ],
  // 확장 모음
  extVowels: [
    { letter: 'ㅐ', sound: '애', order: 7 },
    { letter: 'ㅔ', sound: '에', order: 8 }
  ]
};
```

### 학습 상태 (localStorage)

```javascript
st.learning = {
  stage: 1,                    // 1=자음, 2=모음, 3=조합
  consonantIndex: 3,           // 자음 몇 번째까지 완료
  vowelIndex: 0,               // 모음 몇 번째까지 완료
  wordIndex: 0,                // 조합 단어 몇 번째까지 완료
  knownConsonants: ['ㄱ','ㄴ','ㄷ'],
  knownVowels: [],
  completedWords: [],
  currentActivity: null        // { type: 'consonant|vowel|word', index: N, phase: N }
};
```

---

## 7. 펫 성장 연동 (수정)

| 조건 | 펫 변화 |
|------|---------|
| 게임 시작 | 알 상태 |
| 알 3번 터치 | 부화 (1단계 시작) |
| 자음 3개 완료 | 소리 내기 시작 ("그... 느...") |
| 자음 6개 완료 | 더 다양한 소리 |
| 자음 9개 완료 | 진화: 아기 → 호기심쟁이 |
| 모음 3개 완료 | "아~ 오~" 소리 추가 |
| 모음 6개 완료 | 진화: 호기심쟁이 → 말하기 시작 |
| 조합 5개 완료 | 펫이 단어를 말함! |
| 조합 10개 완료 | 진화: 수다쟁이 |
| 조합 15개 완료 | 최종 진화: 다 큰 펫 |

---

## 8. 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `js/curriculum.js` | CURRICULUM 구조 전면 변경 (배열→객체, syllable structure 추가) |
| `js/learning.js` | 3단계 학습 엔진 (자음→모음→조합 분기) |
| `js/activities/meet.js` | "모양 보기" 활동으로 변경 |
| `js/activities/discover.js` | "따라 그리기" + "구분하기" 활동으로 변경 |
| `js/activities/play.js` | 2D 블록 퍼즐 전면 재작성 |
| `js/activities/reunite.js` | 삭제 또는 "단어 완성" 활동으로 대체 |
| `js/effects.js` | TTS sound 매핑 최적화 + 가이드 음성 추가 |
| `js/game.js` | 학습 진입을 팝업 방식으로 변경, showScreen('learning') 제거 |
| `js/world.js` | 글자꽃 순서 관리, 잠긴/열린/반짝이는 상태 추가 |
| `css/styles.css` | 팝업 오버레이, 블록 퍼즐 레이아웃, 손가락 가이드 애니메이션 |
| `index.html` | learningScreen을 팝업 오버레이로 변경 |
