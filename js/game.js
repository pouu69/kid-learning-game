// js/game.js
// 게임 루프, 스탯 관리, 화면 전환

var st = null;
var tickCount = 0;
var sessionStart = Date.now();
var currentScreen = 'home';
var hatchTaps = 0;
var _tickInterval = null;
// (PixiJS bubbles handle speech now, no DOM timer needed)

function initGame() {
  st = loadState();
  if (st && st.name) {
    applyOfflineDecay(st);
    updateDaily(st);
    showScreen('home');
    startTicking();
    initWorld();
    if (typeof StoryEngine !== 'undefined') {
      StoryEngine.init(st);
    }
  } else {
    st = createDefaultState();
    showScreen('naming');
  }
}

function startTicking() {
  if (_tickInterval) clearInterval(_tickInterval);
  _tickInterval = setInterval(tick, 1000);
}

// Pause game when tab/app goes to background
document.addEventListener('visibilitychange', function() {
  if (!st || !st.name) return;
  if (document.hidden) {
    // Tab hidden → stop ticking, save state
    if (_tickInterval) {
      clearInterval(_tickInterval);
      _tickInterval = null;
    }
    saveState(st);
    if (typeof StoryEngine !== 'undefined') StoryEngine.pause();
  } else {
    // Tab visible → apply offline decay, resume
    applyOfflineDecay(st);
    updateDaily(st);
    saveState(st);
    startTicking();
    if (currentScreen === 'home') updateHome(st);
  }
});

function initWorld() {
  var container = document.getElementById('worldCanvas');
  if (container && typeof World !== 'undefined') {
    World.init(container).then(function() {
      // effects.js 앱 레지스트리 등록 (effects↔world 순환참조 해결)
      if (typeof setPixiApp === 'function') setPixiApp(World.app);
      var allKnown = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
      World.syncLetterFlowers(allKnown);
      var completedWords = st.learning.completedWords || [];
      for (var wi = 0; wi < completedWords.length; wi++) {
        World.addWordFlower(completedWords[wi]);
      }
      if (typeof PetRenderer !== 'undefined') {
        PetRenderer.init(World.app, st);
      }
      updateHome(st);
      // Daily greeting: pet waves on new session
      setTimeout(function() {
        if (typeof PetRenderer !== 'undefined' && PetRenderer.petted) {
          PetRenderer.petted();
        }
        // Show greeting via PixiJS bubble
        if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble && st.stage > 0) {
          var greeting = Pet.getGreeting(st);
          PetRenderer.showPixiBubble(greeting, 180);
          PetRenderer.emitParticles('star', 4);
        }
      }, 1500);
    });
  }
}

function applyOfflineDecay(st) {
  var elapsed = (Date.now() - st.lastUpdate) / 1000;
  if (elapsed <= 0) return;
  if (st.sleeping) {
    st.sleepy = Math.max(0, st.sleepy - elapsed * 1.5);
    if (st.sleepy <= 0) {
      st.sleeping = false;
      st.sleepy = 0;
    }
    return;
  }
  var cappedElapsed = Math.min(elapsed, 3600);
  st.hunger = Math.max(0, st.hunger - cappedElapsed * 0.3);
  st.mood = Math.max(0, st.mood - cappedElapsed * 0.2);
  st.sleepy = Math.min(100, st.sleepy + cappedElapsed * 0.15);
}

function tick() {
  if (!st || !st.name) return;
  tickCount++;

  // 1. Stat decay (existing logic)
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

  // 2. Story systems update + EventBus flush
  if (typeof StoryEngine !== 'undefined') {
    StoryEngine.update(st);
  }

  // 3. Pet reaction (after story state is updated)
  Pet.updateRequest(st);

  // 4. Save periodically
  if (tickCount % 30 === 0) saveState(st);

  // 5. Render (after flush — sees latest state)
  if (currentScreen === 'home') {
    updateHome(st);
  }
}

// Cached DOM references (populated once on first updateHome)
var _domCache = null;
function _getDom() {
  if (!_domCache) {
    _domCache = {
      nameEl: document.getElementById('petNameLabel'),
      stageEl: document.getElementById('petStageLabel'),
      barH: document.getElementById('fillHunger'),
      barM: document.getElementById('fillMood'),
      barS: document.getElementById('fillSleepy'),
      feedBtn: document.querySelector('[data-action="feed"]'),
      sleepBtn: document.querySelector('[data-action="sleep"]'),
      learnBtn: document.querySelector('[data-action="learn"]'),
      petHint: document.querySelector('.pet-hint'),
    };
  }
  return _domCache;
}

// showScreen tracks currentScreen state — uses pixel wipe for major transitions
function showScreen(name) {
  var prevScreen = currentScreen;
  currentScreen = name;

  function doSwitch() {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    var el = document.getElementById(name + 'Screen');
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('active');
    }
  }

  // Use pixel wipe only for naming→home (learning transitions handled by handleAction)
  var majorChange = (prevScreen !== name) && (prevScreen === 'naming');
  if (majorChange && typeof pixelWipeTransition === 'function') {
    pixelWipeTransition(doSwitch);
  } else {
    doSwitch();
  }
}

// Letter collection HUD — shows learned letters below pet name
var _letterCollectionCache = '';
function _updateLetterCollection(st) {
  var el = document.getElementById('letterCollection');
  if (!el) return;

  var collection = (typeof Pet !== 'undefined' && Pet.getLetterCollection)
    ? Pet.getLetterCollection(st)
    : [];

  // Cache check — skip DOM update if unchanged
  var key = collection.map(function(c) { return c.letter; }).join('');
  if (key === _letterCollectionCache) return;
  _letterCollectionCache = key;

  el.innerHTML = '';
  for (var i = 0; i < collection.length; i++) {
    var badge = document.createElement('span');
    badge.className = 'letter-badge letter-badge--' + collection[i].type;
    badge.textContent = collection[i].letter;
    el.appendChild(badge);
  }
}

function updateHome(st) {
  var d = _getDom();
  if (d.nameEl) d.nameEl.textContent = st.name;
  if (d.stageEl) {
    var evo = EVOLUTION[st.stage] || EVOLUTION[0];
    d.stageEl.textContent = evo.name;
  }

  // Evolution progress toward next stage (6-stage aware)
  var evoBar = document.getElementById('evoProgressBar');
  var evoNext = document.getElementById('evoNextLabel');
  var evoProg = document.getElementById('evoProgress');
  if (evoBar && evoNext) {
    var cons = (st.learning.knownConsonants || []).length;
    var vow = (st.learning.knownVowels || []).length;
    var words = (st.learning.completedWords || []).length;
    var wholeWords = (st.learning.wholeWordsMatched || []).length;
    var syllables = st.learning.syllablesCompleted || 0;
    var sentences = st.learning.sentencesCompleted || 0;

    var totalCons = CURRICULUM.consonants.length;
    var totalVow = CURRICULUM.vowels.length;
    var totalSyl = EVO_THRESHOLDS.syllables || 15;
    var totalWords = CURRICULUM.words.length;
    var totalSent = CURRICULUM.sentences.length;
    var totalLearned = wholeWords + cons + vow + syllables + words + sentences;
    var totalItems = 5 + totalCons + totalVow + totalSyl + totalWords + totalSent;
    var pct = Math.min(100, Math.round(totalLearned / totalItems * 100));

    // Next evolution milestone based on current pet stage
    var nextName = '';
    if (st.stage >= 5) {
      nextName = totalLearned >= totalItems ? '완료' : pct + '%';
      if (totalLearned >= totalItems && evoProg) evoProg.classList.add('maxed');
    } else if (st.stage === 0) {
      nextName = '→ ' + (EVOLUTION[1] ? EVOLUTION[1].name : '') + ' (알을 깨봐!)';
    } else if (st.stage < 3) {
      var intIdx = st.learning.interleavedIndex || 0;
      var intTotal = CURRICULUM.interleaved ? CURRICULUM.interleaved.length : 15;
      nextName = '→ ' + (EVOLUTION[3] ? EVOLUTION[3].name : '') + ' (' + intIdx + '/' + intTotal + ')';
    } else if (st.stage < 4) {
      nextName = '→ ' + (EVOLUTION[4] ? EVOLUTION[4].name : '') + ' (' + words + '/' + EVO_THRESHOLDS.words4 + ')';
    } else {
      nextName = '→ ' + (EVOLUTION[5] ? EVOLUTION[5].name : '') + ' (' + words + '/' + EVO_THRESHOLDS.words5 + ')';
    }
    evoBar.style.width = pct + '%';
    evoNext.textContent = nextName;
    if (evoProg && st.stage < 5) evoProg.classList.remove('maxed');
  }

  // Letter collection HUD
  _updateLetterCollection(st);

  // Update pixel stat bars (width-based)
  if (d.barH) {
    d.barH.style.width = st.hunger + '%';
    d.barH.classList.toggle('low', st.hunger < 30);
  }
  if (d.barM) {
    d.barM.style.width = st.mood + '%';
    d.barM.classList.toggle('low', st.mood < 40);
  }
  if (d.barS) {
    d.barS.style.width = (100 - st.sleepy) + '%';
    d.barS.classList.toggle('low', st.sleepy > 80);
  }

  // Urgent care button animations
  if (d.feedBtn) d.feedBtn.classList.toggle('urgent', st.hunger < 30);
  if (d.sleepBtn) {
    d.sleepBtn.classList.toggle('urgent', st.sleepy > 80);
    // Toggle sleep/wake button based on sleeping state
    if (st.sleeping) {
      d.sleepBtn.dataset.action = 'wake';
      d.sleepBtn.querySelector('span').textContent = '깨우기';
      d.sleepBtn.querySelector('.care-icon').textContent = '☀';
      d.sleepBtn.classList.add('urgent');
    } else {
      d.sleepBtn.dataset.action = 'sleep';
      d.sleepBtn.querySelector('span').textContent = '잠';
      d.sleepBtn.querySelector('.care-icon').textContent = '☾';
    }
  }

  // Use PixiJS bubble for speech (replaces DOM bubble)
  var text = Pet.getSpeechText(st);
  if (text) {
    if (text !== Pet._lastSpeechText) {
      Pet._lastSpeechText = text;
      if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble) {
        var dur = text === 'zzz' ? 300 : 240;
        PetRenderer.showPixiBubble(text, dur);
      }
    }
  } else if (Pet._lastSpeechText) {
    Pet._lastSpeechText = null;
    if (typeof PetRenderer !== 'undefined' && PetRenderer.hidePixiBubble) {
      PetRenderer.hidePixiBubble();
    }
  }

  // Show PixiJS need bubble on pet
  if (typeof PetRenderer !== 'undefined' && PetRenderer.showNeed) {
    var btn = Pet.getActionButton(st);
    if (btn) {
      var needMap = { 'feed': 'hungry', 'play': 'bored', 'sleep': 'sleepy', 'wake': 'sleepy', 'hatch': null };
      PetRenderer.showNeed(needMap[btn.action] || null);
      if (d.petHint) d.petHint.classList.add('hidden');
    } else {
      PetRenderer.hideNeed();
      if (d.petHint) d.petHint.classList.remove('hidden');
    }
  }

  // Hide learn button during sleep or egg stage
  if (d.learnBtn) {
    d.learnBtn.style.display = (st.sleeping || st.stage === 0) ? 'none' : '';
  }

  if (typeof PetRenderer !== 'undefined' && PetRenderer.update) {
    PetRenderer.update(st);
  }
}

function handleAction(action) {
  if (action === 'hatch') {
    hatchTaps++;
    if (typeof PetRenderer !== 'undefined') {
      PetRenderer.wiggle();
      // Progressive crack effect
      if (PetRenderer.addCrack) PetRenderer.addCrack(hatchTaps);
    }
    playSound('click');
    if (hatchTaps >= 5) {
      // Shell burst particles
      if (typeof PetRenderer !== 'undefined' && PetRenderer.eggBurst) {
        PetRenderer.eggBurst();
      }
      setTimeout(function() {
        st.stage = 1;
        st.learning.stage = 1;
        st.learning.consonantIndex = 0;
        // Auto-complete wholeWords so _syncStage won't reset to stage 0
        st.learning.wholeWordsMatched = CURRICULUM.wholeWords.map(function(w) { return w.word; });
        if (typeof PetRenderer !== 'undefined') {
          PetRenderer.buildPet(1);
          PetRenderer.celebrate();
          PetRenderer.emitParticles('star', 8);
          PetRenderer.showPixiBubble('안녕!', 180);
        }
        if (typeof flashScreen === 'function') flashScreen();
        playSound('evolve');
        saveState(st);
        updateHome(st);
      }, 600);
    }
    return;
  }

  if (action === 'feed') {
    if (typeof CareActivity !== 'undefined') {
      CareActivity.startFeed(st);
    }
    return;
  }

  if (action === 'play') {
    showPlayMenu(st);
    return;
  }

  if (action === 'learn') {
    if (typeof Learning !== 'undefined') {
      if (typeof PetRenderer !== 'undefined' && PetRenderer.walkOffScreen) {
        PetRenderer.walkOffScreen('right', function() {
          pixelWipeTransition(function() {
            showScreen('learning');
            Learning.startLearning(refreshState());
          });
        });
      } else {
        pixelWipeTransition(function() {
          showScreen('learning');
          Learning.startLearning(refreshState());
        });
      }
    }
    return;
  }

  if (action === 'sleep') {
    if (typeof CareActivity !== 'undefined') {
      CareActivity.startSleep(st);
    }
    return;
  }

  if (action === 'wake') {
    if (typeof CareActivity !== 'undefined') {
      CareActivity.startWake(st);
    }
    return;
  }

  if (action === 'wash') {
    if (typeof CareActivity !== 'undefined' && CareActivity.startWash) {
      CareActivity.startWash(st);
    } else {
      // Fallback if no wash mini-game
      st.mood = Math.min(100, st.mood + 15);
      if (typeof PetRenderer !== 'undefined') {
        if (PetRenderer.petted) PetRenderer.petted();
        if (PetRenderer.emitParticles) PetRenderer.emitParticles('star', 4);
        if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('깨끗해!', 120);
      }
      playSound('click');
      saveState(st);
      updateHome(st);
    }
    return;
  }

  if (action === 'pet') {
    st.mood = Math.min(100, st.mood + 5);
    if (typeof PetRenderer !== 'undefined' && PetRenderer.petted) {
      PetRenderer.petted();
    }
    // Show greeting via PixiJS bubble
    if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble && st.stage > 0) {
      var greeting = Pet.getGreeting(st);
      PetRenderer.showPixiBubble(greeting, 150);
      PetRenderer.emitParticles('heart', 3);
    }
    saveState(st);
    updateHome(st);
  }
}

// Pixel wipe screen transition
function pixelWipeTransition(callback) {
  var wipe = document.getElementById('pixelWipe');
  if (!wipe) { if (callback) callback(); return; }
  wipe.innerHTML = '';
  var cols = 8;
  var rows = 12;
  var blocks = [];
  for (var i = 0; i < cols * rows; i++) {
    var block = document.createElement('div');
    block.className = 'pixel-wipe-block';
    wipe.appendChild(block);
    blocks.push(block);
  }
  wipe.classList.add('active');
  // Stagger show
  for (var b = 0; b < blocks.length; b++) {
    (function(bl, delay) {
      setTimeout(function() { bl.classList.add('show'); }, delay);
    })(blocks[b], b * 8);
  }
  // At peak, call callback
  var peakDelay = blocks.length * 8 + 60;
  setTimeout(function() {
    if (callback) callback();
    // Stagger hide
    for (var h = 0; h < blocks.length; h++) {
      (function(bl, delay) {
        setTimeout(function() { bl.classList.remove('show'); }, delay);
      })(blocks[h], h * 8);
    }
    // Cleanup
    setTimeout(function() {
      wipe.classList.remove('active');
      wipe.innerHTML = '';
    }, blocks.length * 8 + 100);
  }, peakDelay);
}

function getState() {
  return st;
}

// Sync module st from localStorage (call after external state changes)
function refreshState() {
  var fresh = loadState();
  if (fresh) st = fresh;
  return st;
}

// 놀이 게임 선택 메뉴
function showPlayMenu(st) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;background:rgba(26,24,48,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;';

  var title = document.createElement('div');
  title.style.cssText = 'font-family:"DungGeunMo",monospace;font-size:1.4rem;color:#f8d848;';
  title.textContent = '뭐 하고 놀까?';
  overlay.appendChild(title);

  var games = [
    { name: '가위바위보', icon: '\u270A', game: typeof RPSGame !== 'undefined' ? RPSGame : null },
    { name: '공 튀기기', icon: '\u26BD', game: typeof BallBounceGame !== 'undefined' ? BallBounceGame : null }
  ];

  for (var i = 0; i < games.length; i++) {
    (function(g) {
      var btn = document.createElement('button');
      btn.style.cssText = 'font-family:"DungGeunMo",monospace;font-size:1.2rem;color:#1a1830;background:#f8d848;border:none;border-radius:12px;padding:16px 32px;min-width:200px;cursor:pointer;box-shadow:0 4px 0 #c4a830;active:transform:translateY(2px);';
      btn.textContent = g.icon + ' ' + g.name;
      btn.onclick = function() {
        if (overlay.parentNode) document.body.removeChild(overlay);
        if (g.game) {
          g.game.start(refreshState(), function(stars) {
            var fresh = refreshState();
            fresh.stars = (fresh.stars || 0) + stars;
            saveState(fresh);
            if (typeof updateHome === 'function') updateHome(fresh);
          });
        }
      };
      overlay.appendChild(btn);
    })(games[i]);
  }

  // 닫기 버튼
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'font-family:"DungGeunMo",monospace;font-size:0.9rem;color:rgba(255,255,255,0.5);background:none;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:10px 24px;margin-top:0.5rem;cursor:pointer;';
  closeBtn.textContent = '돌아가기';
  closeBtn.onclick = function() {
    if (overlay.parentNode) document.body.removeChild(overlay);
  };
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);
  speakText('뭐 하고 놀까?', 0.8);
}

function setName(name) {
  st.name = name.slice(0, 6);
  st.birthTime = Date.now();
  updateDaily(st);
  saveState(st);
  showScreen('home');
  startTicking();
  initWorld();
}
