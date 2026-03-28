# Story System Design

**Date:** 2026-03-28
**Status:** Approved
**Target:** 5-7세 한글 학습 게임 (글자 없이 이모지/소리로 전달)

---

## Overview

게임 세계에 다채로운 스토리를 제공하는 시스템. 날씨, 시간, 계절, 방문자, 장소 탐험이 FSM(Finite State Machine) + EventBus 패턴으로 동작하며, 학습 진도에 따라 콘텐츠가 해금된다.

**설계 원칙:**
- 상태 머신 + 게임 프로그래밍 기법 (FSM node record, dirty flag, data-driven transitions)
- 시스템 간 결합도 0 (EventBus만 사용)
- 글자 없는 UI (5-7세 pre-reader 대상)
- ES5 호환 (기존 코드베이스 일관성)

---

## 1. File Structure

```
js/story/
  Constants.js      — 정수 열거형 상수 (TIME, WEATHER, SEASON, VISITOR, LOC)
  EventBus.js       — 이중버퍼 이벤트 버스
  Utils.js          — weightedPick, pickVisitor, fsmNode, fsmTransition
  TimeSystem.js     — 시간대 FSM (실제 시각 기반)
  WeatherSystem.js  — 날씨 FSM + 전이 테이블 + 계절 bias
  SeasonSystem.js   — 계절 FSM (실제 월 기반)
  VisitorSystem.js  — 방문자 FSM + VISITORS 데이터
  ExploreSystem.js  — 장소 해금 + LOCATION_UNLOCK 데이터
  WorldRenderer.js  — EventBus 구독 → 시각/청각 반응
  StoryEngine.js    — Facade (init, update, pause)
```

---

## 2. State Schema

### 2.1 Integer Constants (Enum Pattern)

```javascript
var TIME    = { DAWN:0, MORNING:1, NOON:2, DUSK:3, NIGHT:4 };
var WEATHER = { SUNNY:0, CLOUDY:1, RAINY:2, SNOWY:3, THUNDER:4, RAINBOW:5 };
var SEASON  = { SPRING:0, SUMMER:1, FALL:2, WINTER:3 };
var VISITOR = { ABSENT:0, APPROACHING:1, PRESENT:2, DEPARTING:3 };
var LOC     = { LOCKED:0, PREVIEW:1, UNLOCKED:2, VISITING:3 };
```

- 정수 비교로 switch-case O(1)
- 문자열보다 직렬화 크기 작음

### 2.2 FSM Node Record (State Record Pattern)

모든 시스템이 동일한 노드 구조를 사용:

```javascript
// { s, p, t, d, f, x }
function fsmNode(initialState, duration) {
  return { s: initialState, p: -1, t: 0, d: duration, f: true, x: null };
}

function fsmTransition(node, newState, duration) {
  if (node.s === newState) return false;
  node.p = node.s;    // prev (전환 애니에 사용)
  node.s = newState;  // current state
  node.t = 0;         // ticks 리셋
  node.d = duration;  // 지속 시간
  node.f = true;      // dirty flag → renderer 통보
  return true;
}
```

| Field | 설명 |
|-------|------|
| `s` | 현재 상태 (정수) |
| `p` | 이전 상태 (전환 애니메이션용) |
| `t` | 경과 틱 |
| `d` | 지속 시간 (-1 = 외부 트리거) |
| `f` | dirty 플래그 |
| `x` | 추가 데이터 (방문자 정보 등) |

**설계 노트 — 의도적 Mutation:** fsmTransition()은 노드를 직접 변경한다. 일반적으로 immutability가 권장되지만, 게임 루프 내 FSM은 의도적 mutation + dirty flag가 표준 패턴. 매 틱(1초)마다 새 객체 생성 시 GC 압력 증가. story 시스템 내부에서만 mutation 허용, 외부(UI, 저장)에서는 읽기 전용.

### 2.3 저장 상태 (st.story)

```javascript
// storage.js — createDefaultState() 확장
story: {
  time:    fsmNode(TIME.MORNING,  -1),     // 시계 기반
  weather: fsmNode(WEATHER.SUNNY, 300),    // 300틱(5분)마다 전이 평가
  season:  fsmNode(SEASON.SPRING,  -1),    // 날짜 기반
  visitor: fsmNode(VISITOR.ABSENT, 600),   // 600틱 후 방문자 평가
  locs: {
    forest:   fsmNode(LOC.LOCKED, -1),     // 자음 5개
    beach:    fsmNode(LOC.LOCKED, -1),     // 자음 14개 (완료)
    mountain: fsmNode(LOC.LOCKED, -1),     // 모음 8개 (완료)
    village:  fsmNode(LOC.LOCKED, -1),     // 단어 5개
  }
}
```

### 2.4 Probabilistic Transition Table (Data-Driven)

```javascript
var WEATHER_TRANSITIONS = [
  /* SUNNY   → */ [{ to:WEATHER.CLOUDY, w:0.25 }, { to:WEATHER.SUNNY, w:0.75 }],
  /* CLOUDY  → */ [{ to:WEATHER.RAINY, w:0.35 }, { to:WEATHER.SUNNY, w:0.30 }, { to:WEATHER.SNOWY, w:0.05 }, { to:WEATHER.CLOUDY, w:0.30 }],
  /* RAINY   → */ [{ to:WEATHER.THUNDER, w:0.2 }, { to:WEATHER.CLOUDY, w:0.5 }, { to:WEATHER.RAINBOW, w:0.3 }],
  /* SNOWY   → */ [{ to:WEATHER.CLOUDY, w:0.6 }, { to:WEATHER.SNOWY, w:0.4 }],
  /* THUNDER → */ [{ to:WEATHER.RAINBOW, w:0.7 }, { to:WEATHER.CLOUDY, w:0.3 }],
  /* RAINBOW → */ [{ to:WEATHER.SUNNY, w:1.0 }],
];

// 계절별 가중치 보정 (곱연산) — ES5 호환
var SEASON_WEATHER_BIAS = {};
SEASON_WEATHER_BIAS[SEASON.WINTER] = {};
SEASON_WEATHER_BIAS[SEASON.WINTER][WEATHER.SNOWY]   = 3.0;
SEASON_WEATHER_BIAS[SEASON.WINTER][WEATHER.SUNNY]   = 0.3;
SEASON_WEATHER_BIAS[SEASON.SUMMER] = {};
SEASON_WEATHER_BIAS[SEASON.SUMMER][WEATHER.THUNDER] = 2.0;
SEASON_WEATHER_BIAS[SEASON.SUMMER][WEATHER.SUNNY]   = 1.5;
SEASON_WEATHER_BIAS[SEASON.SPRING] = {};
SEASON_WEATHER_BIAS[SEASON.SPRING][WEATHER.RAINBOW] = 2.0;
```

### 2.5 Migration Strategy

```javascript
function migrateStory(st) {
  if (st.story) return;
  st.story = { /* 위 2.3의 기본값 */ };
}
// initGame()에서 loadState() 직후 호출
```

---

## 3. EventBus

이중버퍼 + deferred flush 패턴:

```javascript
var EventBus = (function() {
  var _listeners = {};
  var _queue = [];
  var _swap  = [];

  function _callSafe(fn, data) {
    try { fn(data); } catch(e) { /* 격리 */ }
  }

  return {
    on: function(event, fn) {
      (_listeners[event] || (_listeners[event] = [])).push({ fn: fn, once: false });
    },
    once: function(event, fn) {
      (_listeners[event] || (_listeners[event] = [])).push({ fn: fn, once: true });
    },
    off: function(event, fn) {
      var ls = _listeners[event];
      if (!ls) return;
      for (var i = ls.length - 1; i >= 0; i--) {
        if (ls[i].fn === fn) ls.splice(i, 1);
      }
    },
    emit: function(event, data) {
      _queue.push({ event: event, data: data });
    },
    flush: function() {
      if (_queue.length === 0) return;
      var tmp = _swap; _swap = _queue;
      _queue = tmp; _queue.length = 0;
      for (var i = 0; i < _swap.length; i++) {
        var e  = _swap[i];
        var ls = _listeners[e.event];
        if (!ls || ls.length === 0) continue;
        var hasOnce = false;
        for (var j = 0; j < ls.length; j++) {
          _callSafe(ls[j].fn, e.data);
          if (ls[j].once) hasOnce = true;
        }
        if (hasOnce) {
          _listeners[e.event] = ls.filter(function(l) { return !l.once; });
        }
      }
    }
  };
})();
```

**통합 이벤트 페이로드:** `{ type, prev, next, st, data }`

**성능 설계:**
- 이중버퍼 swap으로 zero-allocation flush
- `_callSafe`로 리스너 오류 격리
- `hasOnce` 플래그로 once 리스너가 없을 때 filter 스킵
- flush 중 emit → 다음 flush에서 처리 (재진입 안전)

---

## 4. StoryEngine + Systems

### 4.1 StoryEngine (Facade)

```javascript
var StoryEngine = (function() {
  var _systems = [];
  var _inited  = false;

  return {
    init: function(st) {
      if (_inited) return;
      migrateStory(st);
      _systems = [TimeSystem, WeatherSystem, SeasonSystem, VisitorSystem, ExploreSystem];
      for (var i = 0; i < _systems.length; i++) {
        if (_systems[i].init) _systems[i].init(st);
      }
      WorldRenderer.init();
      _inited = true;
    },
    update: function(st) {
      if (!_inited) return;
      for (var i = 0; i < _systems.length; i++) {
        _systems[i].update(st);
      }
      EventBus.flush();
    },
    pause: function() {
      for (var i = 0; i < _systems.length; i++) {
        if (_systems[i].pause) _systems[i].pause();
      }
    }
  };
})();
```

### 4.2 Game Loop Integration

```
tick() 실행 순서:
  ① stat decay (기존 로직)
  ② StoryEngine.update(st)  — 시스템 업데이트 + EventBus.flush()
  ③ Pet.updateRequest(st)   — 날씨/방문자 상태 반영
  ④ updateHome(st)          — 렌더 (flush 이후 → 최신 상태)
  ⑤ saveState(st)           — 30틱마다
```

### 4.3 System Contract (Duck Typing)

```
{
  init(st)   — 1회 초기화 (선택)
  update(st) — 매 틱 호출 (필수)
  pause()    — 탭 숨김 시 (선택)
}

규칙:
- update()는 자신의 FSM 노드만 수정
- 다른 시스템과 통신 = EventBus.emit() 만 사용
- 전이 발생 시 emit 후 return (같은 틱에 연쇄 전이 없음)
```

### 4.4 TimeSystem

- **트리거:** 실제 시각 (Date.getHours)
- **상태:** DAWN(5-7시), MORNING(7-12시), NOON(12-17시), DUSK(17-20시), NIGHT(20-5시)
- **duration:** -1 (외부 시계 기반)
- **emit:** `time:changed`

### 4.5 WeatherSystem

- **트리거:** 틱 카운트 >= duration
- **전이:** 확률적 전이 테이블 + 계절 bias 곱연산
- **duration:** 180~420틱 (3~7분) 랜덤
- **emit:** `weather:changed`
- **유틸:** `weightedPick(transitions, bias)` — bias가 없는 항목은 원래 가중치 유지

### 4.6 SeasonSystem

- **트리거:** 실제 월 (Date.getMonth)
- **상태:** SPRING(3-5월), SUMMER(6-8월), FALL(9-11월), WINTER(12-2월)
- **duration:** -1 (날짜 기반)
- **emit:** `season:changed`

### 4.7 VisitorSystem

- **상태 흐름:** ABSENT(300~900틱) → APPROACHING(5틱) → PRESENT(120틱) → DEPARTING(5틱) → ABSENT
- **조건:** 학습 진도에 따라 해금되는 방문자 풀
- **방문자 데이터:**

| ID | Emoji | 해금 조건 |
|----|-------|----------|
| bunny | `🐰` | 자음 3개 |
| bird | `🐦` | 자음 5개 |
| fox | `🦊` | 모음 3개 |
| turtle | `🐢` | 단어 2개 |

- **emit:** `visitor:approaching`, `visitor:arrived`, `visitor:departing`, `visitor:departed`

### 4.8 ExploreSystem

- **상태 흐름:** LOCKED → PREVIEW(10틱, 연출용) → UNLOCKED
- **해금 조건:**

| 장소 | Emoji | 조건 |
|------|-------|------|
| forest | `🌲` | 자음 5개 |
| beach | `🏖️` | 자음 14개 (완료) |
| mountain | `⛰️` | 모음 8개 (완료) |
| village | `🏘️` | 단어 5개 |

- **emit:** `location:preview`, `location:unlocked`

---

## 5. WorldRenderer Integration

### 5.1 Breaking Change: 기존 타이머 제거

world.js의 독립 `setInterval`을 제거:
- `setInterval(updateTimeOfDay, 60000)` — TimeSystem이 대체
- 날씨 랜덤 `setInterval(300000)` — WeatherSystem이 대체

기존 메서드 `updateTimeOfDay()`, `_startRain()`, `_stopRain()`은 유지 — EventBus 리스너에서 호출.

### 5.2 WorldRenderer (Observer)

EventBus 구독자로서 모든 스토리 이벤트의 시각/청각 반응을 처리:

| Event | 시각 반응 | 청각 | 펫 반응 |
|-------|----------|------|---------|
| `time:changed` | 하늘 그라데이션, 해/달 | — | — |
| `weather:changed → RAINY` | 빗방울 파티클, 하늘 어두움 | rain | ☂️ 버블 |
| `weather:changed → SNOWY` | 눈송이 파티클, 풀밭 하양 | wind | ❄️ 버블 + ⭐ |
| `weather:changed → THUNDER` | 빗방울 + 번개 플래시 | thunder | 😨 + 떨림 |
| `weather:changed → RAINBOW` | 무지개 아치 | sparkle | 🌈 + celebrate |
| `weather:changed → SUNNY` | 이펙트 클리어 | — | ☀️ 버블 |
| `season:changed` | 팔레트 전환, 장식 교체 | 계절별 | 이모지 버블 |
| `visitor:approaching` | 가장자리 실루엣 | footstep | — |
| `visitor:arrived` | 이모지 캐릭터 등장 | visitor | 이모지 버블 |
| `visitor:departing` | 퇴장 애니메이션 | — | — |
| `location:preview` | 이모지 알림 | unlock | — |
| `location:unlocked` | 축하 파티클 | evolve | celebrate + ⭐ |

### 5.3 world.js 추가 메서드

| 메서드 | 설명 | 상태 |
|--------|------|------|
| `_startSnow()` | 눈송이 파티클 (느린 속도, 흰색) | 신규 |
| `_stopSnow()` | 눈 파티클 정리 | 신규 |
| `_flashLightning()` | 화면 흰색 플래시 (0.1초) | 신규 |
| `_showRainbow()` | 무지개 아치 (5초 후 페이드) | 신규 |
| `_updateSeasonPalette(season)` | 풀밭/나무/하늘 색상 전환 | 신규 |
| `updateTimeOfDay()` | 시간대별 배경색 | 기존 유지 |
| `_startRain()` / `_stopRain()` | 비 파티클 | 기존 유지 |

### 5.4 Script Load Order (index.html)

```
기존: storage → curriculum → sprites → effects → pet → world → renderer → learning → activities
신규: Constants → EventBus → Utils → TimeSystem → WeatherSystem → SeasonSystem → VisitorSystem → ExploreSystem → WorldRenderer → StoryEngine
기존: game.js (마지막)
```

---

## Event Catalog

| Event | Payload | Emitter |
|-------|---------|---------|
| `time:changed` | `{ type, prev, next, st }` | TimeSystem |
| `weather:changed` | `{ type, prev, next, st }` | WeatherSystem |
| `season:changed` | `{ type, prev, next, st }` | SeasonSystem |
| `visitor:approaching` | `{ type, data:{id,emoji,...}, st }` | VisitorSystem |
| `visitor:arrived` | `{ type, data:{id,emoji,...}, st }` | VisitorSystem |
| `visitor:departing` | `{ type, data:{id,emoji,...}, st }` | VisitorSystem |
| `visitor:departed` | `{ type, st }` | VisitorSystem |
| `location:preview` | `{ type, data:{id}, st }` | ExploreSystem |
| `location:unlocked` | `{ type, data:{id}, st }` | ExploreSystem |
