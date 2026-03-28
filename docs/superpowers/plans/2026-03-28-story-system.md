# Story System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FSM-driven weather, time, season, visitor, and exploration systems that react visually/audibly to game state and learning progress.

**Architecture:** 10 new files in `js/story/`, each with a single responsibility. Systems communicate only via EventBus (deferred queue + flush). WorldRenderer subscribes to events and drives existing World/PetRenderer methods. StoryEngine facade orchestrates init/update/pause.

**Tech Stack:** Vanilla ES5 JavaScript, PixiJS 8.6.6 (existing), Web Audio API (existing `playSound`)

**Spec:** `docs/superpowers/specs/2026-03-28-story-system-design.md`

---

## File Structure

| File | Responsibility | Creates/Modifies |
|------|---------------|-----------------|
| `js/story/Constants.js` | Integer enum constants + fsmNode + fsmTransition | Create |
| `js/story/EventBus.js` | Double-buffer event bus with deferred flush | Create |
| `js/story/Utils.js` | weightedPick, pickVisitor helpers | Create |
| `js/story/TimeSystem.js` | Time-of-day FSM (real clock) | Create |
| `js/story/WeatherSystem.js` | Weather FSM + transition table + season bias | Create |
| `js/story/SeasonSystem.js` | Season FSM (real month) | Create |
| `js/story/VisitorSystem.js` | Visitor FSM + visitor pool data | Create |
| `js/story/ExploreSystem.js` | Location unlock FSM + unlock conditions | Create |
| `js/story/WorldRenderer.js` | EventBus subscriber → visual/audio reactions | Create |
| `js/story/StoryEngine.js` | Facade: init, update, pause | Create |
| `js/storage.js` | Add migrateStory() | Modify |
| `js/world.js` | Remove timers, add snow/lightning/rainbow/season methods | Modify |
| `js/effects.js` | Add new sound types (rain, wind, thunder, sparkle, footstep, visitor, unlock) | Modify |
| `js/game.js` | Integrate StoryEngine into tick() and initGame() | Modify |
| `index.html` | Add 10 script tags | Modify |

---

### Task 1: Constants + FSM Helpers

**Files:**
- Create: `js/story/Constants.js`

- [ ] **Step 1: Create js/story directory and Constants.js**

```javascript
// js/story/Constants.js
// Integer enum constants — shared by all story systems
// O(1) switch-case, smaller serialization than strings

var TIME    = { DAWN:0, MORNING:1, NOON:2, DUSK:3, NIGHT:4 };
var WEATHER = { SUNNY:0, CLOUDY:1, RAINY:2, SNOWY:3, THUNDER:4, RAINBOW:5 };
var SEASON  = { SPRING:0, SUMMER:1, FALL:2, WINTER:3 };
var VISITOR = { ABSENT:0, APPROACHING:1, PRESENT:2, DEPARTING:3 };
var LOC     = { LOCKED:0, PREVIEW:1, UNLOCKED:2, VISITING:3 };

// FSM node record — every system uses same structure
// s=current state, p=prev (for transition anim), t=elapsed ticks,
// d=duration (-1=external trigger), f=dirty flag, x=extra data
function fsmNode(initialState, duration) {
  return { s: initialState, p: -1, t: 0, d: duration, f: true, x: null };
}

// FSM transition — intentional mutation + dirty flag (game loop pattern)
// Returns true if state changed, false if same state (no-op)
function fsmTransition(node, newState, duration) {
  if (node.s === newState) return false;
  node.p = node.s;
  node.s = newState;
  node.t = 0;
  node.d = duration;
  node.f = true;
  return true;
}

// Migration helper — ensures st.story exists for legacy saves
function migrateStory(st) {
  if (st.story) return;
  st.story = {
    time:    fsmNode(TIME.MORNING,  -1),
    weather: fsmNode(WEATHER.SUNNY, 300),
    season:  fsmNode(SEASON.SPRING,  -1),
    visitor: fsmNode(VISITOR.ABSENT, 600),
    locs: {
      forest:   fsmNode(LOC.LOCKED, -1),
      beach:    fsmNode(LOC.LOCKED, -1),
      mountain: fsmNode(LOC.LOCKED, -1),
      village:  fsmNode(LOC.LOCKED, -1)
    }
  };
}
```

- [ ] **Step 2: Verify file loads without errors**

Run: Open browser console, check for syntax errors after adding the script tag (done in Task 10).

- [ ] **Step 3: Commit**

```bash
mkdir -p js/story
git add js/story/Constants.js
git commit -m "feat(story): add integer constants, fsmNode, fsmTransition, migrateStory"
```

---

### Task 2: EventBus

**Files:**
- Create: `js/story/EventBus.js`

- [ ] **Step 1: Create EventBus.js**

```javascript
// js/story/EventBus.js
// Double-buffer deferred event bus
// Systems emit() during update, flush() delivers all at once after all systems ran
// Re-entrant safe: emit during flush goes to next flush cycle

var EventBus = (function() {
  var _listeners = {};
  var _queue = [];
  var _swap  = [];

  function _callSafe(fn, data) {
    try { fn(data); } catch(e) { /* isolate listener errors */ }
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
      // Double-buffer swap — zero allocation
      var tmp = _swap;
      _swap = _queue;
      _queue = tmp;
      _queue.length = 0;

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
    },

    // For testing: clear all listeners and queues
    _reset: function() {
      _listeners = {};
      _queue = [];
      _swap = [];
    }
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/story/EventBus.js
git commit -m "feat(story): add double-buffer EventBus with deferred flush"
```

---

### Task 3: Utils (weightedPick, pickVisitor)

**Files:**
- Create: `js/story/Utils.js`

- [ ] **Step 1: Create Utils.js**

```javascript
// js/story/Utils.js
// Pure helper functions for story systems

// Weighted random pick with optional bias multiplier
// transitions: [{ to: stateInt, w: weight }, ...]
// bias: { [stateInt]: multiplier } or undefined
function weightedPick(transitions, bias) {
  var total = 0;
  for (var i = 0; i < transitions.length; i++) {
    var t = transitions[i];
    var w = t.w;
    if (bias && bias[t.to] !== undefined) {
      w *= bias[t.to];
    }
    total += w;
  }
  var r = Math.random() * total;
  var acc = 0;
  for (var j = 0; j < transitions.length; j++) {
    var t2 = transitions[j];
    var w2 = t2.w;
    if (bias && bias[t2.to] !== undefined) {
      w2 *= bias[t2.to];
    }
    acc += w2;
    if (r < acc) return t2.to;
  }
  return transitions[transitions.length - 1].to;
}

// Visitor data — unlocked by learning progress
var VISITORS = [
  { id: 'bunny',  emoji: '\uD83D\uDC30', minCons: 3 },
  { id: 'bird',   emoji: '\uD83D\uDC26', minCons: 5 },
  { id: 'fox',    emoji: '\uD83E\uDD8A', minVow: 3 },
  { id: 'turtle', emoji: '\uD83D\uDC22', minWords: 2 }
];

// Pick a random visitor from the unlocked pool
// Returns visitor object or null if none available
function pickVisitor(st) {
  var pool = [];
  for (var i = 0; i < VISITORS.length; i++) {
    var v = VISITORS[i];
    if (v.minCons  && st.learning.knownConsonants.length < v.minCons) continue;
    if (v.minVow   && st.learning.knownVowels.length < v.minVow) continue;
    if (v.minWords && st.learning.completedWords.length < v.minWords) continue;
    pool.push(v);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
```

- [ ] **Step 2: Commit**

```bash
git add js/story/Utils.js
git commit -m "feat(story): add weightedPick, pickVisitor, VISITORS data"
```

---

### Task 4: TimeSystem

**Files:**
- Create: `js/story/TimeSystem.js`

- [ ] **Step 1: Create TimeSystem.js**

```javascript
// js/story/TimeSystem.js
// Real clock-based time-of-day FSM
// States: DAWN(5-7), MORNING(7-12), NOON(12-17), DUSK(17-20), NIGHT(20-5)

var TimeSystem = {
  update: function(st) {
    var h = new Date().getHours();
    var next;
    if      (h >= 5  && h < 7)  next = TIME.DAWN;
    else if (h >= 7  && h < 12) next = TIME.MORNING;
    else if (h >= 12 && h < 17) next = TIME.NOON;
    else if (h >= 17 && h < 20) next = TIME.DUSK;
    else                         next = TIME.NIGHT;

    if (fsmTransition(st.story.time, next, -1)) {
      EventBus.emit('time:changed', {
        type: 'time:changed',
        prev: st.story.time.p,
        next: st.story.time.s,
        st: st
      });
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/story/TimeSystem.js
git commit -m "feat(story): add TimeSystem — real clock FSM"
```

---

### Task 5: WeatherSystem

**Files:**
- Create: `js/story/WeatherSystem.js`

- [ ] **Step 1: Create WeatherSystem.js**

```javascript
// js/story/WeatherSystem.js
// Probabilistic weather transitions with season bias

var WEATHER_TRANSITIONS = [
  /* SUNNY   → */ [{ to:WEATHER.CLOUDY, w:0.25 }, { to:WEATHER.SUNNY, w:0.75 }],
  /* CLOUDY  → */ [{ to:WEATHER.RAINY, w:0.35 }, { to:WEATHER.SUNNY, w:0.30 }, { to:WEATHER.SNOWY, w:0.05 }, { to:WEATHER.CLOUDY, w:0.30 }],
  /* RAINY   → */ [{ to:WEATHER.THUNDER, w:0.2 }, { to:WEATHER.CLOUDY, w:0.5 }, { to:WEATHER.RAINBOW, w:0.3 }],
  /* SNOWY   → */ [{ to:WEATHER.CLOUDY, w:0.6 }, { to:WEATHER.SNOWY, w:0.4 }],
  /* THUNDER → */ [{ to:WEATHER.RAINBOW, w:0.7 }, { to:WEATHER.CLOUDY, w:0.3 }],
  /* RAINBOW → */ [{ to:WEATHER.SUNNY, w:1.0 }]
];

// Season bias — ES5 compatible (no computed properties)
var SEASON_WEATHER_BIAS = {};
SEASON_WEATHER_BIAS[SEASON.WINTER] = {};
SEASON_WEATHER_BIAS[SEASON.WINTER][WEATHER.SNOWY]   = 3.0;
SEASON_WEATHER_BIAS[SEASON.WINTER][WEATHER.SUNNY]   = 0.3;
SEASON_WEATHER_BIAS[SEASON.SUMMER] = {};
SEASON_WEATHER_BIAS[SEASON.SUMMER][WEATHER.THUNDER] = 2.0;
SEASON_WEATHER_BIAS[SEASON.SUMMER][WEATHER.SUNNY]   = 1.5;
SEASON_WEATHER_BIAS[SEASON.SPRING] = {};
SEASON_WEATHER_BIAS[SEASON.SPRING][WEATHER.RAINBOW] = 2.0;

var WeatherSystem = {
  update: function(st) {
    var w = st.story.weather;
    w.t++;
    if (w.t < w.d) return;  // not yet time to evaluate transition

    var row  = WEATHER_TRANSITIONS[w.s];
    var bias = SEASON_WEATHER_BIAS[st.story.season.s];
    var next = weightedPick(row, bias);
    var dur  = 180 + Math.floor(Math.random() * 240); // 3-7 min

    if (fsmTransition(w, next, dur)) {
      EventBus.emit('weather:changed', {
        type: 'weather:changed',
        prev: w.p,
        next: w.s,
        st: st
      });
    } else {
      // Same weather continues — reset timer
      w.t = 0;
      w.d = dur;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/story/WeatherSystem.js
git commit -m "feat(story): add WeatherSystem — probabilistic transitions with season bias"
```

---

### Task 6: SeasonSystem

**Files:**
- Create: `js/story/SeasonSystem.js`

- [ ] **Step 1: Create SeasonSystem.js**

```javascript
// js/story/SeasonSystem.js
// Real date-based season FSM

var SeasonSystem = {
  update: function(st) {
    var m = new Date().getMonth(); // 0-11
    var next;
    if      (m >= 2 && m <= 4)  next = SEASON.SPRING;
    else if (m >= 5 && m <= 7)  next = SEASON.SUMMER;
    else if (m >= 8 && m <= 10) next = SEASON.FALL;
    else                         next = SEASON.WINTER;

    if (fsmTransition(st.story.season, next, -1)) {
      EventBus.emit('season:changed', {
        type: 'season:changed',
        prev: st.story.season.p,
        next: st.story.season.s,
        st: st
      });
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/story/SeasonSystem.js
git commit -m "feat(story): add SeasonSystem — real month FSM"
```

---

### Task 7: VisitorSystem

**Files:**
- Create: `js/story/VisitorSystem.js`

- [ ] **Step 1: Create VisitorSystem.js**

```javascript
// js/story/VisitorSystem.js
// Visitor FSM: ABSENT → APPROACHING → PRESENT → DEPARTING → ABSENT

var VisitorSystem = {
  update: function(st) {
    var v = st.story.visitor;
    v.t++;

    switch (v.s) {
      case VISITOR.ABSENT:
        if (v.t < v.d) return;
        var who = pickVisitor(st);
        if (!who) { v.t = 0; return; } // no eligible visitors yet
        v.x = who;
        fsmTransition(v, VISITOR.APPROACHING, 5);
        EventBus.emit('visitor:approaching', {
          type: 'visitor:approaching', data: who, st: st
        });
        break;

      case VISITOR.APPROACHING:
        if (v.t < v.d) return;
        fsmTransition(v, VISITOR.PRESENT, 120);
        EventBus.emit('visitor:arrived', {
          type: 'visitor:arrived', data: v.x, st: st
        });
        break;

      case VISITOR.PRESENT:
        if (v.t < v.d) return;
        fsmTransition(v, VISITOR.DEPARTING, 5);
        EventBus.emit('visitor:departing', {
          type: 'visitor:departing', data: v.x, st: st
        });
        break;

      case VISITOR.DEPARTING:
        if (v.t < v.d) return;
        v.x = null;
        fsmTransition(v, VISITOR.ABSENT, 300 + Math.floor(Math.random() * 600));
        EventBus.emit('visitor:departed', {
          type: 'visitor:departed', st: st
        });
        break;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/story/VisitorSystem.js
git commit -m "feat(story): add VisitorSystem — 4-state visitor FSM"
```

---

### Task 8: ExploreSystem

**Files:**
- Create: `js/story/ExploreSystem.js`

- [ ] **Step 1: Create ExploreSystem.js**

```javascript
// js/story/ExploreSystem.js
// Location unlock FSM: LOCKED → PREVIEW (10 ticks) → UNLOCKED

var LOCATION_UNLOCK = {
  forest:   { check: function(st) { return st.learning.knownConsonants.length >= 5; } },
  beach:    { check: function(st) { return st.learning.knownConsonants.length >= 14; } },
  mountain: { check: function(st) { return st.learning.knownVowels.length >= 8; } },
  village:  { check: function(st) { return st.learning.completedWords.length >= 5; } }
};

var LOCATION_KEYS = ['forest', 'beach', 'mountain', 'village'];

var ExploreSystem = {
  update: function(st) {
    var locs = st.story.locs;

    for (var i = 0; i < LOCATION_KEYS.length; i++) {
      var k = LOCATION_KEYS[i];
      var loc = locs[k];

      // Check unlock condition for locked locations
      if (loc.s === LOC.LOCKED) {
        if (LOCATION_UNLOCK[k].check(st)) {
          fsmTransition(loc, LOC.PREVIEW, 10);
          EventBus.emit('location:preview', {
            type: 'location:preview', data: { id: k }, st: st
          });
        }
        continue;
      }

      // Auto-advance PREVIEW → UNLOCKED after duration
      if (loc.s === LOC.PREVIEW) {
        loc.t++;
        if (loc.t >= loc.d) {
          fsmTransition(loc, LOC.UNLOCKED, -1);
          EventBus.emit('location:unlocked', {
            type: 'location:unlocked', data: { id: k }, st: st
          });
        }
      }
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/story/ExploreSystem.js
git commit -m "feat(story): add ExploreSystem — data-driven location unlock"
```

---

### Task 9: WorldRenderer (EventBus Subscriber)

**Files:**
- Create: `js/story/WorldRenderer.js`

- [ ] **Step 1: Create WorldRenderer.js**

```javascript
// js/story/WorldRenderer.js
// EventBus subscriber — maps story events to visual/audio reactions
// All notifications use emoji + sound only (no text, for 5-7yo pre-readers)

var SEASON_EMOJI = ['\uD83C\uDF38', '\u2600\uFE0F', '\uD83C\uDF42', '\u2744\uFE0F']; // 🌸☀️🍂❄️
var SEASON_SOUND = ['sparkle', 'correct', 'wind', 'wind'];

var LOCATION_EMOJI = {
  forest:   '\uD83C\uDF32',  // 🌲
  beach:    '\uD83C\uDFD6\uFE0F',  // 🏖️
  mountain: '\u26F0\uFE0F',  // ⛰️
  village:  '\uD83C\uDFD8\uFE0F'   // 🏘️
};

var WorldRenderer = {
  init: function() {
    // Time change → sky gradient + sun/moon
    EventBus.on('time:changed', function(e) {
      if (typeof World !== 'undefined') {
        World.updateTimeOfDay();
      }
    });

    // Weather change → particle effects + pet reaction
    EventBus.on('weather:changed', function(e) {
      if (typeof World === 'undefined') return;
      var prev = e.prev, next = e.next;

      // Clean up previous weather effects
      if (prev === WEATHER.RAINY || prev === WEATHER.THUNDER) World._stopRain();
      if (prev === WEATHER.SNOWY && World._stopSnow) World._stopSnow();

      // Start new weather effects
      switch (next) {
        case WEATHER.RAINY:
          World._startRain();
          playSound('rain');
          break;
        case WEATHER.SNOWY:
          if (World._startSnow) World._startSnow();
          playSound('wind');
          break;
        case WEATHER.THUNDER:
          World._startRain();
          if (World._flashLightning) World._flashLightning();
          playSound('thunder');
          break;
        case WEATHER.RAINBOW:
          if (World._showRainbow) World._showRainbow();
          playSound('sparkle');
          break;
        case WEATHER.SUNNY:
          // Clear state — no effects needed
          break;
      }

      // Pet reaction
      WorldRenderer._petReact(next);
    });

    // Season change → palette + notification
    EventBus.on('season:changed', function(e) {
      if (typeof World !== 'undefined' && World._updateSeasonPalette) {
        World._updateSeasonPalette(e.next);
      }
      WorldRenderer._showNotification(SEASON_EMOJI[e.next], SEASON_SOUND[e.next]);
    });

    // Visitor approaching → silhouette at screen edge
    EventBus.on('visitor:approaching', function(e) {
      WorldRenderer._showVisitorSilhouette(e.data);
      playSound('click'); // footstep placeholder
    });

    // Visitor arrived → character appears + notification
    EventBus.on('visitor:arrived', function(e) {
      WorldRenderer._showVisitor(e.data);
      WorldRenderer._showNotification(e.data.emoji, 'correct');
    });

    // Visitor departing → exit animation
    EventBus.on('visitor:departing', function(e) {
      WorldRenderer._hideVisitor(e.data);
    });

    // Location preview → emoji notification
    EventBus.on('location:preview', function(e) {
      WorldRenderer._showNotification(LOCATION_EMOJI[e.data.id], 'click');
    });

    // Location unlocked → celebration
    EventBus.on('location:unlocked', function(e) {
      if (typeof PetRenderer !== 'undefined') {
        PetRenderer.celebrate();
        PetRenderer.emitParticles('star', 8);
      }
      playSound('evolve');
    });
  },

  // Emoji + sound notification via pet bubble (no text)
  _showNotification: function(emoji, soundType) {
    if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble) {
      PetRenderer.showPixiBubble(emoji, 180);
    }
    if (soundType) playSound(soundType);
  },

  // Pet reaction to weather
  _petReact: function(weather) {
    if (typeof PetRenderer === 'undefined') return;
    switch (weather) {
      case WEATHER.RAINY:
        PetRenderer.showPixiBubble('\u2602\uFE0F', 120); // ☂️
        break;
      case WEATHER.SNOWY:
        PetRenderer.showPixiBubble('\u2744\uFE0F', 120); // ❄️
        PetRenderer.emitParticles('star', 3);
        break;
      case WEATHER.THUNDER:
        PetRenderer.wiggle();
        PetRenderer.showPixiBubble('\uD83D\uDE28', 120); // 😨
        break;
      case WEATHER.RAINBOW:
        PetRenderer.celebrate();
        PetRenderer.showPixiBubble('\uD83C\uDF08', 180); // 🌈
        break;
      case WEATHER.SUNNY:
        PetRenderer.showPixiBubble('\u2600\uFE0F', 90); // ☀️
        break;
    }
  },

  // Visitor visuals — placeholder implementations (Phase 2 polish)
  _showVisitorSilhouette: function(visitor) {
    // TODO Phase 2: draw silhouette at screen edge
  },
  _showVisitor: function(visitor) {
    // TODO Phase 2: show emoji character walking in
    if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble) {
      PetRenderer.showPixiBubble(visitor.emoji, 180);
    }
  },
  _hideVisitor: function(visitor) {
    // TODO Phase 2: walk-out animation
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/story/WorldRenderer.js
git commit -m "feat(story): add WorldRenderer — EventBus subscriber for visual/audio reactions"
```

---

### Task 10: StoryEngine (Facade)

**Files:**
- Create: `js/story/StoryEngine.js`

- [ ] **Step 1: Create StoryEngine.js**

```javascript
// js/story/StoryEngine.js
// Facade — single entry point for all story systems

var StoryEngine = (function() {
  var _systems = [];
  var _inited  = false;

  return {
    // Called once from initGame() after World is ready
    init: function(st) {
      if (_inited) return;
      migrateStory(st);
      _systems = [
        TimeSystem,
        WeatherSystem,
        SeasonSystem,
        VisitorSystem,
        ExploreSystem
      ];
      for (var i = 0; i < _systems.length; i++) {
        if (_systems[i].init) _systems[i].init(st);
      }
      WorldRenderer.init();
      _inited = true;
    },

    // Called every tick from game.js
    // All systems update, then EventBus flushes to listeners
    update: function(st) {
      if (!_inited) return;
      for (var i = 0; i < _systems.length; i++) {
        _systems[i].update(st);
      }
      EventBus.flush();
    },

    // Called on visibility hidden / app background
    pause: function() {
      for (var i = 0; i < _systems.length; i++) {
        if (_systems[i].pause) _systems[i].pause();
      }
    }
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/story/StoryEngine.js
git commit -m "feat(story): add StoryEngine facade — init, update, pause"
```

---

### Task 11: Modify world.js — Remove Timers + Add Weather Methods

**Files:**
- Modify: `js/world.js:81-91` (remove setInterval timers)
- Modify: `js/world.js` (add _startSnow, _stopSnow, _flashLightning, _showRainbow, _updateSeasonPalette)

- [ ] **Step 1: Remove the two setInterval timers from world.js init()**

In `js/world.js`, find and remove these lines (around lines 81-91):

```javascript
// REMOVE THIS — Day/night update every 60 seconds
setInterval(function() { self.updateTimeOfDay(); }, 60000);

// REMOVE THIS — Weather change every 5 minutes
setInterval(function() {
  var rand = Math.random();
  if (rand < 0.7) {
    if (self._weather !== 'clear') { self._stopRain(); self._weather = 'clear'; }
  } else {
    if (self._weather === 'clear') { self._startRain(); self._weather = 'rain'; }
  }
}, 300000);
```

Keep the initial `self.updateTimeOfDay()` call on line 55 — it sets the sky on first load.

- [ ] **Step 2: Add _snowDrops array to World object properties**

At the top of the World object (after `_rainDrops: [],`), add:

```javascript
  _snowDrops: [],
  _lightningTimer: 0,
  _rainbowGfx: null,
```

- [ ] **Step 3: Add _startSnow method**

Add after `_stopRain` method:

```javascript
  _startSnow: function() {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;
    for (var i = 0; i < 15; i++) {
      var flake = new PIXI.Graphics();
      var size = 2 + Math.floor(Math.random() * 3);
      flake.rect(0, 0, size, size).fill({ color: 0xffffff, alpha: 0.6 });
      flake.x = Math.random() * W;
      flake.y = Math.random() * H * 0.5;
      flake._speed = 0.5 + Math.random() * 1;
      flake._drift = (Math.random() - 0.5) * 0.3;
      self._snowDrops.push(flake);
      self.app.stage.addChild(flake);
    }
  },

  _stopSnow: function() {
    for (var i = 0; i < this._snowDrops.length; i++) {
      this.app.stage.removeChild(this._snowDrops[i]);
      this._snowDrops[i].destroy();
    }
    this._snowDrops = [];
  },
```

- [ ] **Step 4: Add _flashLightning method**

```javascript
  _flashLightning: function() {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;
    var flash = new PIXI.Graphics();
    flash.rect(0, 0, W, H).fill({ color: 0xffffff, alpha: 0.7 });
    self.app.stage.addChild(flash);
    setTimeout(function() {
      flash.alpha = 0.3;
      setTimeout(function() {
        self.app.stage.removeChild(flash);
        flash.destroy();
      }, 80);
    }, 60);
  },
```

- [ ] **Step 5: Add _showRainbow method**

```javascript
  _showRainbow: function() {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;
    if (self._rainbowGfx) {
      self.app.stage.removeChild(self._rainbowGfx);
      self._rainbowGfx.destroy();
    }
    var gfx = new PIXI.Graphics();
    var colors = [0xff0000, 0xff8800, 0xffff00, 0x00cc00, 0x0088ff, 0x4400cc];
    var cx = W * 0.5;
    var cy = H * 0.55;
    for (var i = colors.length - 1; i >= 0; i--) {
      var r = 80 + i * 12;
      // Pixel-art approximation: draw thick rect arcs
      gfx.rect(cx - r, cy - r * 0.5, r * 2, 4).fill({ color: colors[i], alpha: 0.4 });
      gfx.rect(cx - r * 0.8, cy - r * 0.7, r * 1.6, 4).fill({ color: colors[i], alpha: 0.35 });
    }
    gfx.alpha = 0;
    self.app.stage.addChild(gfx);
    self._rainbowGfx = gfx;

    // Fade in
    var fadeIn = function() {
      gfx.alpha += 0.02;
      if (gfx.alpha >= 0.8) {
        self.app.ticker.remove(fadeIn);
        // Hold 4 seconds then fade out
        setTimeout(function() {
          var fadeOut = function() {
            gfx.alpha -= 0.02;
            if (gfx.alpha <= 0) {
              self.app.ticker.remove(fadeOut);
              self.app.stage.removeChild(gfx);
              gfx.destroy();
              self._rainbowGfx = null;
            }
          };
          self.app.ticker.add(fadeOut);
        }, 4000);
      }
    };
    self.app.ticker.add(fadeIn);
  },
```

- [ ] **Step 6: Add _updateSeasonPalette method**

```javascript
  _updateSeasonPalette: function(season) {
    // Update grass color based on season
    var grassColors = [0x5aaf4f, 0x4a9f3f, 0xc08830, 0xd0d8e0]; // spring, summer, fall, winter
    var grassColor = grassColors[season] || grassColors[0];
    if (this._grassGfx) {
      var W = this.app.screen.width;
      var H = this.app.screen.height;
      this._grassGfx.clear();
      this._grassGfx.rect(0, H * 0.65, W, H * 0.35).fill({ color: grassColor });
    }
  },
```

- [ ] **Step 7: Add snow animation to existing animate() method**

In the `animate` method of World, after the rain drop animation loop, add:

```javascript
    // Animate snow
    for (var si = 0; si < self._snowDrops.length; si++) {
      var flake = self._snowDrops[si];
      flake.y += flake._speed;
      flake.x += flake._drift;
      if (flake.y > H * 0.65) {
        flake.y = -4;
        flake.x = Math.random() * W;
      }
    }
```

- [ ] **Step 8: Commit**

```bash
git add js/world.js
git commit -m "feat(story): remove timers from world.js, add snow/lightning/rainbow/season methods"
```

---

### Task 12: Modify effects.js — Add New Sound Types

**Files:**
- Modify: `js/effects.js` (add rain, wind, thunder, sparkle sound types to `playSound`)

- [ ] **Step 1: Add new sound types to playSound function**

In `js/effects.js`, inside the `playSound` function's try block, after the existing `evolve` case (line ~98), add:

```javascript
    } else if (type === 'rain') {
      // Soft continuous rain patter
      osc.frequency.value = 200;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    } else if (type === 'wind') {
      // Soft whoosh
      osc.frequency.value = 150;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    } else if (type === 'thunder') {
      // Low rumble
      osc.frequency.value = 60;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    } else if (type === 'sparkle') {
      // High twinkle
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    }
```

- [ ] **Step 2: Commit**

```bash
git add js/effects.js
git commit -m "feat(story): add rain, wind, thunder, sparkle sound types"
```

---

### Task 13: Modify game.js — Integrate StoryEngine

**Files:**
- Modify: `js/game.js:12-23` (initGame — add StoryEngine.init)
- Modify: `js/game.js:99-127` (tick — add StoryEngine.update, reorder)
- Modify: `js/game.js:32-48` (visibilitychange — add StoryEngine.pause)

- [ ] **Step 1: Add StoryEngine.init to initGame()**

In `js/game.js`, in the `initGame` function, after `initWorld();` (line 19), add:

```javascript
    if (typeof StoryEngine !== 'undefined') {
      StoryEngine.init(st);
    }
```

- [ ] **Step 2: Reorder tick() to: stat decay → StoryEngine.update → Pet.updateRequest → updateHome → save**

Replace the tick function body (lines 99-127) with:

```javascript
function tick() {
  if (!st || !st.name) return;
  tickCount++;

  // ① Stat decay (existing logic)
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

  if (tickCount % 60 === 0) {
    st.daily.minutesToday++;
    st.reports.totalMinutes++;
  }

  // ② Story systems update + EventBus flush
  if (typeof StoryEngine !== 'undefined') {
    StoryEngine.update(st);
  }

  // ③ Pet reaction (after story state is updated)
  Pet.updateRequest(st);

  // ④ Save periodically
  if (tickCount % 30 === 0) saveState(st);

  // ⑤ Render (after flush — sees latest state)
  if (currentScreen === 'home') {
    updateHome(st);
  }
}
```

- [ ] **Step 3: Add StoryEngine.pause to visibilitychange handler**

In the `document.hidden` branch (line 38), after `saveState(st);`, add:

```javascript
    if (typeof StoryEngine !== 'undefined') StoryEngine.pause();
```

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "feat(story): integrate StoryEngine into tick loop and initGame"
```

---

### Task 14: Modify index.html — Add Script Tags

**Files:**
- Modify: `index.html:139-140` (between world.js/renderer.js and game.js)

- [ ] **Step 1: Add 10 script tags for story system**

In `index.html`, after the `js/report.js` script tag (line 146) and before `js/game.js` (line 147), add:

```html
    <!-- Story System -->
    <script src="js/story/Constants.js"></script>
    <script src="js/story/EventBus.js"></script>
    <script src="js/story/Utils.js"></script>
    <script src="js/story/TimeSystem.js"></script>
    <script src="js/story/WeatherSystem.js"></script>
    <script src="js/story/SeasonSystem.js"></script>
    <script src="js/story/VisitorSystem.js"></script>
    <script src="js/story/ExploreSystem.js"></script>
    <script src="js/story/WorldRenderer.js"></script>
    <script src="js/story/StoryEngine.js"></script>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(story): add story system script tags to index.html"
```

---

### Task 15: Manual E2E Verification

**Files:** None (verification only)

- [ ] **Step 1: Open browser and check console for errors**

Run: Open `index.html` in browser, open DevTools console.
Expected: No JavaScript errors. Game loads normally.

- [ ] **Step 2: Verify time system activates**

Run: In console, type `st.story.time.s` and check it matches current time of day.
Expected: Integer matching TIME constant for current hour.

- [ ] **Step 3: Verify weather transitions**

Run: In console, type `st.story.weather` and check fields.
Expected: `{ s: 0, p: -1, t: <incrementing>, d: 300, f: false, x: null }` — `t` should increment each second.

- [ ] **Step 4: Verify season system**

Run: In console, type `st.story.season.s`
Expected: Integer matching current month's season (March = SPRING = 0).

- [ ] **Step 5: Verify EventBus works**

Run: In console, type:
```javascript
EventBus.on('test', function(d) { console.log('GOT:', d); });
EventBus.emit('test', { hello: true });
EventBus.flush();
```
Expected: Console shows `GOT: { hello: true }`

- [ ] **Step 6: Wait for weather change and verify visual**

Wait 3-7 minutes for a weather transition (or in console force it):
```javascript
fsmTransition(st.story.weather, WEATHER.RAINY, 300);
EventBus.emit('weather:changed', { type:'weather:changed', prev:WEATHER.SUNNY, next:WEATHER.RAINY, st:st });
EventBus.flush();
```
Expected: Rain particles appear, pet shows ☂️ bubble, rain sound plays.

- [ ] **Step 7: Verify existing functionality not broken**

Run: Complete a learning session (tap learn, complete a letter).
Expected: Progress updates correctly, pet walks off/on screen, no errors.

- [ ] **Step 8: Final commit with all pending changes**

```bash
git add -A
git status
git commit -m "feat(story): complete story system — weather, time, season, visitors, exploration

Adds FSM-driven story systems with EventBus architecture.
All visual/audio reactions use emoji + sound (no text, pre-reader safe).
Replaces world.js independent timers with centralized StoryEngine."
```
