# Phase 1a: 펫 대사 확장 + 글자비 미니게임 + 커리큘럼 인터리브

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 학습 흐름에 펫 동적 대사, 글자비 미니게임, 자음-모음 인터리브 순서를 적용하여 체감 변화를 가장 빠르게 전달한다.

**Architecture:** 기존 `learning.js`의 `_showContinuePrompt` 흐름에 미니게임을 삽입하고, `curriculum.js`에 인터리브 순서 배열을 추가하며, `pet.js`의 대사 시스템을 배운 글자 기반으로 확장한다. 기존 학습 버튼과 활동은 그대로 유지하며 fallback으로 동작.

**Tech Stack:** Vanilla JS, PixiJS 8 (PIXI.Graphics 프로시저럴), Web Speech API (speakText), localStorage

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `js/curriculum.js` | 인터리브 순서 배열 추가, ㅁ 연관단어 변경 |
| Modify | `js/learning.js` | 인터리브 순서 기반 학습, 미니게임 삽입, 퀵 리콜 |
| Modify | `js/pet.js` | 동적 대사 확장 (배운 글자 기반 인사/요청) |
| Modify | `js/storage.js` | V3 마이그레이션 (인터리브 인덱스, 별, 세션 카운트) |
| Create | `js/minigames/letter-rain.js` | 글자비 미니게임 |
| Modify | `js/game.js` | 인터리브 Stage 반영, 진화 조건 업데이트 |
| Modify | `index.html` | letter-rain.js 로드 |
| Modify | `css/styles.css` | 글자비 UI, 퀵 리콜 UI |

---

### Task 1: 커리큘럼 인터리브 순서 추가

**Files:**
- Modify: `js/curriculum.js:94-140`

- [ ] **Step 1: CURRICULUM.interleaved 배열 추가**

`curriculum.js`의 `CURRICULUM` 객체 끝(line 318 `};` 직전)에 인터리브 순서 배열을 추가한다. 기존 `consonants`/`vowels` 배열은 그대로 유지 (미니게임, 복습에서 참조).

```javascript
// curriculum.js — CURRICULUM 객체 내부 끝에 추가

  // 자음-모음 인터리브 순서 (기존 Stage 1/2 대체)
  // type: 'consonant' | 'vowel', ref: consonants/vowels 배열 인덱스
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
```

- [ ] **Step 2: ㅁ 연관단어 변경 (엄마 → 모자)**

`curriculum.js:109`의 ㅁ 항목을 수정:

```javascript
// Before:
{ letter: 'ㅁ', sound: '미음. 므', order: 4, associatedWord: '엄마', combinedSyllable: '마' },
// After:
{ letter: 'ㅁ', sound: '미음. 므', order: 4, associatedWord: '모자', combinedSyllable: '마' },
```

- [ ] **Step 3: 브라우저에서 확인**

`index.html` 열고 콘솔에서 확인:
```javascript
console.log(CURRICULUM.interleaved.length); // 15
console.log(CURRICULUM.consonants[3].associatedWord); // "모자"
```

- [ ] **Step 4: Commit**

```bash
git add js/curriculum.js
git commit -m "feat(curriculum): 자음-모음 인터리브 순서 + ㅁ 연관단어 변경"
```

---

### Task 2: 스토리지 V3 마이그레이션

**Files:**
- Modify: `js/storage.js:1-60`

- [ ] **Step 1: STORAGE_VERSION을 3으로 변경하고 새 필드 추가**

```javascript
// storage.js 상단
var STORAGE_VERSION = 3;
```

`createDefaultState()`의 `learning` 객체에 추가:

```javascript
    learning: {
      stage: 0,
      interleavedIndex: 0,     // 인터리브 배열 현재 위치
      consonantIndex: 0,
      vowelIndex: 0,
      // ... 기존 필드 유지
    },
    // daily 객체에 추가:
    daily: {
      date: new Date().toISOString().slice(0, 10),
      sessionsToday: 0,
      learnSessionsToday: 0,   // 새 학습 세션 (최대 2)
      minutesToday: 0,
      activitiesDone: 0,
      bonusUnlocked: false
    },
    // 최상위에 추가:
    stars: 0,
    items: [],
```

- [ ] **Step 2: V2→V3 마이그레이션 함수 추가**

`migrateState` 함수 내부에 V2→V3 분기 추가:

```javascript
function migrateState(st) {
  if (!st.version || st.version < 2) {
    st = migrateV1toV2(st);
  }
  if (st.version === 2) {
    st = migrateV2toV3(st);
  }
  return st;
}

function migrateV2toV3(st) {
  st.version = 3;
  if (typeof st.learning.interleavedIndex === 'undefined') {
    // 기존 진행도로 인터리브 인덱스 계산
    var consIdx = st.learning.consonantIndex || 0;
    var vowIdx = st.learning.vowelIndex || 0;
    var idx = 0;
    for (var i = 0; i < CURRICULUM.interleaved.length; i++) {
      var item = CURRICULUM.interleaved[i];
      if (item.type === 'consonant' && item.index < consIdx) idx = i + 1;
      else if (item.type === 'vowel' && item.index < vowIdx) idx = i + 1;
    }
    st.learning.interleavedIndex = Math.min(idx, CURRICULUM.interleaved.length);
  }
  if (typeof st.stars === 'undefined') st.stars = 0;
  if (!st.items) st.items = [];
  if (typeof st.daily.learnSessionsToday === 'undefined') st.daily.learnSessionsToday = 0;
  return st;
}
```

- [ ] **Step 3: 브라우저에서 기존 세이브 로드 확인**

콘솔에서:
```javascript
var s = loadState(); console.log(s.version, s.learning.interleavedIndex, s.stars);
// 3, (계산된 인덱스), 0
```

- [ ] **Step 4: Commit**

```bash
git add js/storage.js
git commit -m "feat(storage): V3 마이그레이션 - interleavedIndex, stars, learnSessions"
```

---

### Task 3: Learning 엔진 인터리브 학습 적용

**Files:**
- Modify: `js/learning.js:24-110, 260-300`

- [ ] **Step 1: `_syncStage` 수정 — 인터리브 기반 스테이지 계산**

`learning.js`의 `_syncStage` 함수를 수정. 기존 Stage 1(자음만)/Stage 2(모음만) 분리를 Stage 1(인터리브)로 통합:

```javascript
  _syncStage: function(st) {
    var l = st.learning;
    var newStage;

    var wholeCount = (l.wholeWordsMatched || []).length;
    var intIdx = l.interleavedIndex || 0;
    var syllCount = l.syllablesCompleted || 0;
    var wordCount = (l.completedWords || []).length;

    if (wholeCount < 5) {
      newStage = 0;
    } else if (intIdx < CURRICULUM.interleaved.length) {
      newStage = 1;  // 자음+모음 인터리브 (기존 Stage 1+2 통합)
    } else if (syllCount < 15) {
      newStage = 3;
    } else if (wordCount < 10) {
      newStage = 4;
    } else {
      newStage = 5;
    }

    if (l.stage !== newStage) {
      l.stage = newStage;
      saveState(st);
    }
  },
```

- [ ] **Step 2: `getCurrentTarget` 수정 — 인터리브 배열 기반 타겟**

Stage 1에서 `interleavedIndex`를 사용하여 다음 학습 대상을 결정:

```javascript
    if (stage === 1) {
      var intIdx = l.interleavedIndex || 0;
      if (intIdx < CURRICULUM.interleaved.length) {
        var entry = CURRICULUM.interleaved[intIdx];
        var pool = entry.type === 'consonant' ? CURRICULUM.consonants : CURRICULUM.vowels;
        var data = pool[entry.index];
        return { type: entry.type, data: data, index: intIdx };
      }
      return null;
    }
```

Stage 2를 제거하고 Stage 3 이후는 기존 로직 유지. (기존 `stage === 2` 분기 삭제)

- [ ] **Step 3: `onLetterComplete` 수정 — interleavedIndex 증가**

```javascript
  onLetterComplete: function(st, target) {
    var letter = target.data.letter;
    var isNew = false;
    if (target.type === 'consonant') {
      if (st.learning.knownConsonants.indexOf(letter) === -1) {
        st.learning.knownConsonants.push(letter);
      }
      if (!target.review) { st.learning.consonantIndex++; st.learning.interleavedIndex++; isNew = true; }
    } else {
      if (st.learning.knownVowels.indexOf(letter) === -1) {
        st.learning.knownVowels.push(letter);
      }
      if (!target.review) { st.learning.vowelIndex++; st.learning.interleavedIndex++; isNew = true; }
    }
    // ... 나머지 기존 로직 유지
```

- [ ] **Step 4: 인터리브 완료 시 스테이지 리캡 수정**

기존 "자음 완료!", "모음 완료!" 대신 인터리브 완료 체크:

```javascript
    // Stage complete -> show recap (인터리브 전체 완료 시)
    if (st.learning.interleavedIndex >= CURRICULUM.interleaved.length && !target.review) {
      saveState(st);
      this._showStageRecap(st, 'interleaved');
      return;
    }
```

- [ ] **Step 5: `_dispatchActivity` Stage 2 분기 제거**

기존 `stage === 2` 분기를 삭제하고, `stage === 1`에서 consonant/vowel 모두 처리:

```javascript
    // Stage 1: 인터리브 학습 (자음+모음)
    if (stage === 1) {
      if (typeof LetterHuntActivity !== 'undefined') {
        this._activeActivity = LetterHuntActivity;
        LetterHuntActivity.start(st, target);
      } else if (typeof LetterActivity !== 'undefined') {
        LetterActivity.start(st, target);
      }
      return;
    }
```

- [ ] **Step 6: DEBUG 로그 업데이트**

```javascript
    console.log('[Learning] stage=' + st.learning.stage +
      ' intIdx=' + (st.learning.interleavedIndex || 0) +
      ' newSinceReview=' + (st.learning.newSinceReview || 0) +
      ' sessionAct=' + this._sessionActivities +
      ' lastPicks=' + JSON.stringify(this._lastPicks));
```

- [ ] **Step 7: 브라우저 테스트**

1. localStorage 클리어 후 새 게임 시작
2. Stage 0 통글자 5개 완료
3. Stage 1 진입 확인 — 첫 글자 ㄱ (자음)
4. ㄱ 완료 후 다음 글자 ㅏ (모음) 확인
5. 콘솔 로그: `[Learning] stage=1 intIdx=2` 확인

- [ ] **Step 8: Commit**

```bash
git add js/learning.js
git commit -m "feat(learning): 자음-모음 인터리브 학습 적용 (Stage 1+2 통합)"
```

---

### Task 4: 마이크로 마일스톤 인터리브 대응

**Files:**
- Modify: `js/learning.js` (`_checkMicroMilestone` 함수)

- [ ] **Step 1: 마일스톤 기준을 인터리브 인덱스 기반으로 변경**

기존 자음 3/6, 모음 2/4 대신 인터리브 진행도 기반:

```javascript
  _checkMicroMilestone: function(st, type) {
    var intIdx = st.learning.interleavedIndex || 0;
    // 첫 음절 완성 (자음 1개 + 모음 1개 = intIdx 2)
    if (intIdx === 2) return '첫 음절 완성! "가"를 만들 수 있어!';
    // 5개 완료
    if (intIdx === 5) return '벌써 5개! 펫이 옹알이 시작!';
    // 10개 완료
    if (intIdx === 10) return '10개 달성! 거의 다 왔어!';
    return null;
  },
```

- [ ] **Step 2: Commit**

```bash
git add js/learning.js
git commit -m "feat(learning): 마이크로 마일스톤 인터리브 기반으로 변경"
```

---

### Task 5: 펫 동적 대사 확장

**Files:**
- Modify: `js/pet.js:19-74`

- [ ] **Step 1: `getSpeechText` 확장 — 배운 글자 기반 요청**

```javascript
  getSpeechText: function(st) {
    if (st.sleeping) return 'zzz';
    if (st.stage === 0) return null;

    var l = st.learning;
    var words = l.completedWords || [];

    // 배운 단어 기반 요청 (우선)
    if (this.request === 'hungry') {
      if (words.indexOf('밥') !== -1) return '밥!';
      if (words.indexOf('물') !== -1) return '물!';
      return null;  // 단어 모르면 표정으로만
    }
    if (this.request === 'sleepy') {
      if (words.length >= 5) return '졸려...';
      return null;
    }
    if (this.request === 'bored') {
      if (words.length >= 5) return '심심해~';
      return null;
    }

    // 랜덤 혼잣말 (배운 글자 연습)
    var cons = l.knownConsonants || [];
    var vows = l.knownVowels || [];
    if (cons.length > 0 && vows.length > 0 && Math.random() < 0.3) {
      // 배운 자음+모음으로 음절 만들어 중얼거림
      var c = cons[Math.floor(Math.random() * cons.length)];
      var v = vows[Math.floor(Math.random() * vows.length)];
      var code = (c.charCodeAt(0) - 0x3131) * 588 + (v.charCodeAt(0) - 0x314F) * 28 + 0xAC00;
      if (code >= 0xAC00 && code <= 0xD7A3) {
        return String.fromCharCode(code) + '...';
      }
    }

    return null;
  },
```

- [ ] **Step 2: `getGreeting` 확장 — 인터리브 대응**

```javascript
  getGreeting: function(st) {
    var l = st.learning;
    var intIdx = l.interleavedIndex || 0;

    // Stage 0: pre-verbal
    if ((l.stage || 0) === 0) return '...!';

    // 인터리브 초반 (글자 1~2개)
    if (intIdx <= 2) {
      var knownCons = l.knownConsonants || [];
      if (knownCons.length > 0) {
        return knownCons[knownCons.length - 1] + '...!';
      }
      return '응?';
    }

    // 인터리브 중반 (음절 가능)
    var cons = l.knownConsonants || [];
    var vows = l.knownVowels || [];
    if (cons.length > 0 && vows.length > 0 && intIdx < CURRICULUM.interleaved.length) {
      // 배운 음절 중 랜덤
      var syllables = [];
      for (var ci = 0; ci < cons.length; ci++) {
        for (var vi = 0; vi < Math.min(vows.length, 2); vi++) {
          var code = (cons[ci].charCodeAt(0) - 0x3131) * 588 + (vows[vi].charCodeAt(0) - 0x314F) * 28 + 0xAC00;
          if (code >= 0xAC00 && code <= 0xD7A3) syllables.push(String.fromCharCode(code));
        }
      }
      if (syllables.length > 0) {
        var pick = syllables[Math.floor(Math.random() * syllables.length)];
        return pick + '!';
      }
    }

    // 단어 단계
    var words = l.completedWords || [];
    if (words.length > 0 && Math.random() > 0.3) {
      return words[Math.floor(Math.random() * words.length)] + '~';
    }

    var greetings = ['반가워!', '안녕~', '헤헤~'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  },
```

- [ ] **Step 3: 브라우저 테스트**

1. ㄱ, ㅏ 배운 상태에서 홈 화면 확인
2. 펫 인사 말풍선에 "가!" 등 음절이 나오는지 확인
3. 배고플 때(hunger < 30) 펫이 단어를 모르면 말풍선 없이 표정만 표시

- [ ] **Step 4: Commit**

```bash
git add js/pet.js
git commit -m "feat(pet): 배운 글자 기반 동적 대사 + 음절 조합 인사"
```

---

### Task 6: 글자비 미니게임 구현

**Files:**
- Create: `js/minigames/letter-rain.js`
- Modify: `index.html`

- [ ] **Step 1: minigames 디렉토리 생성**

```bash
mkdir -p js/minigames
```

- [ ] **Step 2: letter-rain.js 작성**

```javascript
// js/minigames/letter-rain.js
// 글자비 미니게임: 배운 글자는 탭, 안 배운 글자는 피하기
// Depends: PIXI (global), CURRICULUM, Learning, playSound, speakText

var LetterRainGame = {
  _app: null,
  _container: null,
  _letters: [],       // 떨어지는 글자 오브젝트
  _score: 0,
  _combo: 0,
  _timer: null,
  _duration: 15000,   // 15초
  _spawnInterval: null,
  _tickInterval: null,
  _onComplete: null,
  _knownSet: null,    // Set of known letters
  _overlay: null,

  start: function(st, onComplete) {
    this._cleanup();
    this._score = 0;
    this._combo = 0;
    this._onComplete = onComplete;

    // 배운 글자 세트 구성
    var known = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    this._knownSet = {};
    for (var i = 0; i < known.length; i++) {
      this._knownSet[known[i]] = true;
    }

    // 최소 2개 이상 배운 글자가 있어야 게임 가능
    if (known.length < 2) {
      if (onComplete) onComplete(0);
      return;
    }

    // 전체 글자 풀 (배운 것 + 안 배운 것 혼합)
    var allLetters = [];
    for (var c = 0; c < CURRICULUM.consonants.length; c++) {
      allLetters.push(CURRICULUM.consonants[c].letter);
    }
    for (var v = 0; v < CURRICULUM.vowels.length; v++) {
      allLetters.push(CURRICULUM.vowels[v].letter);
    }
    this._allLetters = allLetters;
    this._knownLetters = known;

    this._createOverlay();
    this._createGame();
    this._startLoop();
  },

  _createOverlay: function() {
    var overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;background:rgba(0,0,0,0.85);';
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // 스코어 HUD
    var hud = document.createElement('div');
    hud.className = 'minigame-hud';
    hud.style.cssText = 'position:fixed;top:12px;left:0;width:100%;z-index:310;display:flex;justify-content:space-between;padding:0 16px;box-sizing:border-box;font-family:var(--font-pixel);color:#f8d848;font-size:1.1rem;';
    hud.innerHTML = '<span id="lr-score">0</span><span id="lr-timer">15</span>';
    overlay.appendChild(hud);

    // 캔버스 컨테이너
    var canvasWrap = document.createElement('div');
    canvasWrap.id = 'letter-rain-canvas';
    canvasWrap.style.cssText = 'position:fixed;top:40px;left:0;width:100%;height:calc(100% - 40px);z-index:305;';
    overlay.appendChild(canvasWrap);
  },

  _createGame: function() {
    var wrap = document.getElementById('letter-rain-canvas');
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;

    var app = new PIXI.Application();
    var self = this;
    app.init({ width: w, height: h, backgroundAlpha: 0 }).then(function() {
      wrap.appendChild(app.canvas);
      self._app = app;
      self._container = new PIXI.Container();
      app.stage.addChild(self._container);
    });
  },

  _startLoop: function() {
    var self = this;
    var elapsed = 0;

    // 글자 생성 (800ms 간격)
    this._spawnInterval = setInterval(function() {
      self._spawnLetter();
    }, 800);

    // 게임 틱 (30fps)
    this._tickInterval = setInterval(function() {
      self._tick();
    }, 33);

    // 타이머 카운트다운
    var timerEl = document.getElementById('lr-timer');
    this._timer = setInterval(function() {
      elapsed += 1000;
      var remaining = Math.max(0, Math.ceil((self._duration - elapsed) / 1000));
      if (timerEl) timerEl.textContent = remaining;
      if (elapsed >= self._duration) {
        self._end();
      }
    }, 1000);
  },

  _spawnLetter: function() {
    if (!this._app || !this._container) return;
    var w = this._app.screen.width;

    // 70% 확률로 배운 글자, 30% 안 배운 글자
    var isKnown = Math.random() < 0.7;
    var letter;
    if (isKnown && this._knownLetters.length > 0) {
      letter = this._knownLetters[Math.floor(Math.random() * this._knownLetters.length)];
    } else {
      letter = this._allLetters[Math.floor(Math.random() * this._allLetters.length)];
    }

    var known = !!this._knownSet[letter];
    var fontSize = 32;
    var text = new PIXI.Text({ text: letter, style: {
      fontFamily: '"DungGeunMo", monospace',
      fontSize: fontSize,
      fill: known ? 0x48a868 : 0xf08080,
      fontWeight: 'bold'
    }});
    text.x = Math.random() * (w - fontSize);
    text.y = -fontSize;
    text.interactive = true;
    text.cursor = 'pointer';

    var self = this;
    text.on('pointerdown', function() {
      self._onTap(this, letter, known);
    });

    text._speed = 1.5 + Math.random() * 1.0;
    text._letter = letter;
    text._known = known;

    this._container.addChild(text);
    this._letters.push(text);
  },

  _tick: function() {
    if (!this._app) return;
    var h = this._app.screen.height;
    for (var i = this._letters.length - 1; i >= 0; i--) {
      var t = this._letters[i];
      t.y += t._speed;
      if (t.y > h) {
        this._container.removeChild(t);
        t.destroy();
        this._letters.splice(i, 1);
        // 배운 글자를 놓치면 콤보 리셋 (패널티 없음)
        if (t._known) this._combo = 0;
      }
    }
  },

  _onTap: function(textObj, letter, known) {
    if (known) {
      this._score += 10 + this._combo * 5;
      this._combo++;
      playSound('correct');
      if (this._combo >= 3) {
        // 콤보 보너스
        this._score += 15;
        speakText('잘한다!', 0.8);
        this._combo = 0;
      }
    } else {
      this._combo = 0;
      // 안 배운 글자 탭 → 글자 이름 알려주기
      var pool = CURRICULUM.consonants.concat(CURRICULUM.vowels);
      for (var p = 0; p < pool.length; p++) {
        if (pool[p].letter === letter) {
          speakText(pool[p].sound.split('.')[0], 0.7);
          break;
        }
      }
    }

    // UI 업데이트
    var scoreEl = document.getElementById('lr-score');
    if (scoreEl) scoreEl.textContent = this._score;

    // 글자 제거 + 이펙트
    textObj.alpha = 0;
    var idx = this._letters.indexOf(textObj);
    if (idx !== -1) this._letters.splice(idx, 1);
    var self = this;
    setTimeout(function() {
      if (self._container && textObj.parent) self._container.removeChild(textObj);
      textObj.destroy();
    }, 100);
  },

  _end: function() {
    this._cleanup();
    var stars = Math.min(5, Math.floor(this._score / 30));
    if (this._onComplete) this._onComplete(stars);
  },

  _cleanup: function() {
    if (this._spawnInterval) { clearInterval(this._spawnInterval); this._spawnInterval = null; }
    if (this._tickInterval) { clearInterval(this._tickInterval); this._tickInterval = null; }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._app) {
      this._app.destroy(true);
      this._app = null;
    }
    this._container = null;
    for (var i = 0; i < this._letters.length; i++) {
      if (this._letters[i].destroy) this._letters[i].destroy();
    }
    this._letters = [];
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
  }
};
```

- [ ] **Step 3: index.html에 script 태그 추가**

`index.html`에서 `js/activities/care.js` 다음에 추가:

```html
    <script src="js/minigames/letter-rain.js"></script>
```

- [ ] **Step 4: 브라우저에서 직접 실행 테스트**

콘솔에서:
```javascript
LetterRainGame.start(loadState(), function(stars) { console.log('Stars:', stars); });
```
- 글자가 떨어지는지 확인
- 초록 글자 탭 → 점수 증가
- 빨간 글자 탭 → 소리 재생
- 15초 후 종료 + 콜백

- [ ] **Step 5: Commit**

```bash
git add js/minigames/letter-rain.js index.html
git commit -m "feat(minigame): 글자비(Letter Rain) 미니게임 구현"
```

---

### Task 7: 학습 흐름에 미니게임 삽입

**Files:**
- Modify: `js/learning.js` (`_showContinuePrompt` 영역)

- [ ] **Step 1: `_showReward` 후 미니게임 분기 추가**

`_showContinuePrompt` 호출 전에 미니게임 삽입 여부를 판단. 세션 내 2번째, 4번째 활동 후에 미니게임 1판:

```javascript
  _showContinuePrompt: function(st) {
    var self = this;

    // 미니게임 삽입: 짝수 번째 활동 후 (2, 4번째) + 배운 글자 2개 이상
    var shouldPlayMinigame = (
      this._sessionActivities > 0 &&
      this._sessionActivities % 2 === 0 &&
      !this._justPlayedMinigame &&
      typeof LetterRainGame !== 'undefined' &&
      ((st.learning.knownConsonants || []).length + (st.learning.knownVowels || []).length) >= 2
    );

    if (shouldPlayMinigame) {
      this._justPlayedMinigame = true;
      LetterRainGame.start(st, function(stars) {
        // 별 보상
        st.stars = (st.stars || 0) + stars;
        saveState(st);
        // 미니게임 끝 → 계속 프롬프트
        self._showContinuePromptUI(st);
      });
      return;
    }

    this._justPlayedMinigame = false;
    this._showContinuePromptUI(st);
  },
```

- [ ] **Step 2: 기존 `_showContinuePrompt` 내부 UI 코드를 `_showContinuePromptUI`로 리네임**

기존 `_showContinuePrompt`의 UI 생성 코드 전체를 `_showContinuePromptUI: function(st) { ... }` 으로 이동. `_showContinuePrompt`는 위의 미니게임 분기 로직만 담당.

- [ ] **Step 3: `_justPlayedMinigame` 초기화 추가**

Learning 객체 상단에:
```javascript
  _justPlayedMinigame: false,
```

`closePopup`과 `startLearning`에서 리셋:
```javascript
  // closePopup 내부
  this._justPlayedMinigame = false;
  
  // startLearning 내부 (sessionActivities === 0 블록)
  if (this._sessionActivities === 0) {
    this._lastPicks = [];
    this._justPlayedMinigame = false;
  }
```

- [ ] **Step 4: 브라우저 테스트**

1. 학습 시작 → 글자 1 완료 → "더 놀래?" (미니게임 없음)
2. "더 배우기" → 글자 2 완료 → 글자비 미니게임 자동 시작
3. 미니게임 15초 → 별 획득 → "더 놀래?" 표시
4. 콘솔에서 `loadState().stars` 확인

- [ ] **Step 5: Commit**

```bash
git add js/learning.js
git commit -m "feat(learning): 학습 2회 후 글자비 미니게임 자동 삽입"
```

---

### Task 8: 세션 시작 퀵 리콜 (간격 복습)

**Files:**
- Modify: `js/learning.js` (`startLearning` 영역)

- [ ] **Step 1: `_showQuickRecall` 함수 추가**

세션 시작 시 이전에 배운 글자 중 간격 복습 대상 2~3개를 빠르게 테스트:

```javascript
  // 세션 시작 퀵 리콜: 스페이스드 리피티션 기반 2~3문항
  _showQuickRecall: function(st, onDone) {
    var self = this;
    var pl = st.learning.practiceLog || {};
    var now = Date.now();
    var DAY_MS = 86400000;

    // 복습 기한이 지난 글자 찾기
    var allLetters = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    var overdue = [];
    for (var i = 0; i < allLetters.length; i++) {
      var key = allLetters[i];
      var entry = pl[key] || { count: 0, lastPracticed: 0, interval: 0 };
      var daysSince = (now - (entry.lastPracticed || 0)) / DAY_MS;
      if (daysSince >= (entry.interval || 0)) {
        overdue.push({ key: key, overdue: daysSince - (entry.interval || 0) });
      }
    }

    // 기한 지난 게 없거나 배운 글자가 3개 미만이면 스킵
    if (overdue.length < 2 || allLetters.length < 3) {
      onDone();
      return;
    }

    // 가장 오래된 순 2~3개 선택
    overdue.sort(function(a, b) { return b.overdue - a.overdue; });
    var picks = overdue.slice(0, Math.min(3, overdue.length));
    var currentIdx = 0;

    function showNext() {
      if (currentIdx >= picks.length) {
        onDone();
        return;
      }
      var pick = picks[currentIdx];
      currentIdx++;

      // hunt 형태의 빠른 인식 (buildChoices 활용)
      var isConsonant = (st.learning.knownConsonants || []).indexOf(pick.key) !== -1;
      var pool = isConsonant ? CURRICULUM.consonants : CURRICULUM.vowels;
      var letterPool = [];
      for (var p = 0; p < pool.length; p++) letterPool.push(pool[p].letter);
      var choices = buildChoices(pick.key, letterPool, 2);

      // 소리 재생 후 3지선다
      var letterData = null;
      for (var li = 0; li < pool.length; li++) {
        if (pool[li].letter === pick.key) { letterData = pool[li]; break; }
      }

      var container = document.createElement('div');
      container.className = 'quick-recall';

      var label = document.createElement('div');
      label.className = 'phase-label';
      label.textContent = '기억나?';
      container.appendChild(label);

      var soundBtn = createSoundButton(function() {
        if (letterData) speakText(letterData.sound.split('.')[0], 0.7);
      });
      container.appendChild(soundBtn);

      var choiceContainer = document.createElement('div');
      choiceContainer.className = 'letter-hunt-choices';
      choiceContainer.onclick = function(e) {
        var btn = e.target.closest('.letter-hunt-choice');
        if (!btn || btn.classList.contains('choice-locked')) return;
        var selected = btn.getAttribute('data-letter');
        var buttons = choiceContainer.querySelectorAll('.letter-hunt-choice');

        handleChoiceResult(null, buttons, 'data-letter', selected, pick.key,
          function() {
            // 정답: practiceLog 업데이트
            var logEntry = pl[pick.key] || { count: 0, lastPracticed: 0, interval: 0 };
            logEntry.count++;
            logEntry.lastPracticed = Date.now();
            var intervals = [0, 1, 3, 7, 14];
            logEntry.interval = intervals[Math.min(logEntry.count, intervals.length - 1)];
            pl[pick.key] = logEntry;
            saveState(st);
            setTimeout(showNext, 600);
          },
          function() {
            if (letterData) speakText(letterData.sound.split('.')[0], 0.7);
          }
        );
      };

      for (var ci = 0; ci < choices.length; ci++) {
        var btn = document.createElement('button');
        btn.className = 'letter-hunt-choice';
        btn.setAttribute('data-letter', choices[ci]);
        btn.textContent = choices[ci];
        choiceContainer.appendChild(btn);
      }
      container.appendChild(choiceContainer);

      self.openPopup(container);
      if (letterData) setTimeout(function() { speakText(letterData.sound.split('.')[0], 0.7); }, 300);
    }

    showNext();
  },
```

- [ ] **Step 2: `startLearning`에 퀵 리콜 삽입**

세션 시작 시(sessionActivities === 0) 퀵 리콜을 먼저 실행:

```javascript
  startLearning: function(st) {
    this._syncStage(st);
    this._sessionCount++;
    if (this._sessionActivities === 0) {
      this._lastPicks = [];
      this._justPlayedMinigame = false;
    }

    if (!st.learning.practiceLog) st.learning.practiceLog = {};
    if (typeof st.learning.newSinceReview !== 'number') st.learning.newSinceReview = 0;

    // 세션 첫 시작 + 배운 글자 3개 이상이면 퀵 리콜
    var self = this;
    if (this._sessionActivities === 0 && !this._recallDone) {
      this._recallDone = true;
      this._showQuickRecall(st, function() {
        self._continueStartLearning(st);
      });
      return;
    }

    this._continueStartLearning(st);
  },

  _continueStartLearning: function(st) {
    // 기존 startLearning 로직 (target, reviewableCount, dispatch 등)
    // ... 기존 코드 이동
  },
```

- [ ] **Step 3: `_recallDone` 초기화**

```javascript
  _recallDone: false,
```

`closePopup`에서 리셋:
```javascript
  this._recallDone = false;
```

- [ ] **Step 4: 브라우저 테스트**

1. 글자 5개 이상 배운 상태에서 앱 종료
2. 다시 학습 시작 → "기억나?" 퀵 리콜 2~3문항 표시
3. 정답 탭 → 다음 문항 → 완료 후 일반 학습 진행
4. 같은 세션 내 "더 배우기" → 퀵 리콜 안 나옴 (recallDone)

- [ ] **Step 5: Commit**

```bash
git add js/learning.js
git commit -m "feat(learning): 세션 시작 퀵 리콜 - 스페이스드 리피티션 간격 복습"
```

---

### Task 9: game.js 진화 조건 업데이트

**Files:**
- Modify: `js/game.js` (진화 관련 코드)

- [ ] **Step 1: 진화 표시 텍스트에서 Stage 2 제거**

`updateHome`의 진화 진행 표시에서 기존 Stage 1(자음)/Stage 2(모음) 분기를 인터리브 기반으로 변경:

```javascript
    } else if (st.stage < 3) {
      var intIdx = st.learning.interleavedIndex || 0;
      var intTotal = CURRICULUM.interleaved.length;
      nextName = '-> ' + (EVOLUTION[2] ? EVOLUTION[2].name : '') + ' (' + intIdx + '/' + intTotal + ')';
    } else if (st.stage < 4) {
```

- [ ] **Step 2: `_checkEvolution` 인터리브 대응**

`learning.js`의 `_checkEvolution`에서 인터리브 완료 시 Stage 3으로 진화:

기존 consonants/vowels 체크를 interleavedIndex 체크로 변경.

- [ ] **Step 3: Commit**

```bash
git add js/game.js js/learning.js
git commit -m "feat(game): 진화 조건 인터리브 기반으로 업데이트"
```

---

### Task 10: CSS 스타일 + 최종 정리

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: 미니게임 오버레이 스타일 추가**

```css
/* 미니게임 */
.minigame-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.minigame-hud {
    pointer-events: none;
}

/* 퀵 리콜 */
.quick-recall {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
}
```

- [ ] **Step 2: DEBUG 로그 제거**

`learning.js`에서 `console.log('[Learning]')`, `console.log('[Review]')` 라인 모두 제거.

- [ ] **Step 3: 전체 흐름 최종 테스트**

1. localStorage 클리어 → 새 게임
2. Stage 0: 통글자 5개 완료 → 부화
3. Stage 1: ㄱ(자음) → ㅏ(모음) → 글자비 미니게임 → ㄴ(자음) → 글자비 → 세션 종료
4. 앱 닫고 재진입 → 퀵 리콜 → 다음 학습 이어서
5. 펫 인사에 배운 음절("가!", "나!") 표시 확인

- [ ] **Step 4: Commit**

```bash
git add css/styles.css js/learning.js
git commit -m "chore: 미니게임 CSS + DEBUG 로그 제거"
```
