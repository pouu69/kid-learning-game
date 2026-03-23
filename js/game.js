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
      var allKnown = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
      World.syncLetterFlowers(allKnown);
      // Also sync completed words as flowers
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

  Pet.updateRequest(st);

  if (tickCount % 30 === 0) saveState(st);

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
      gaugeH: document.getElementById('gaugeHunger'),
      gaugeM: document.getElementById('gaugeMood'),
      gaugeS: document.getElementById('gaugeSleepy'),
      actionBtnNeed: document.getElementById('actionBtnNeed'),
      actionBtnIcon: document.getElementById('actionBtnIcon'),
      actionBtnLabel: document.getElementById('actionBtnLabel'),
      petHint: document.querySelector('.pet-hint'),
    };
  }
  return _domCache;
}

// showScreen tracks currentScreen state
function showScreen(name) {
  currentScreen = name;
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove('active');
  }
  // HTML uses nameScreen pattern (e.g. homeScreen, learningScreen)
  var el = document.getElementById(name + 'Screen');
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }
}

function updateHome(st) {
  var d = _getDom();
  if (d.nameEl) d.nameEl.textContent = st.name;
  if (d.stageEl) {
    var evo = EVOLUTION[st.stage] || EVOLUTION[0];
    d.stageEl.textContent = evo.name;
  }

  // Update circular gauge fill (SVG stroke-dashoffset)
  var circumference = 125.66; // 2 * PI * 20, pre-computed
  if (d.barH) d.barH.style.strokeDashoffset = circumference * (1 - Math.max(0, Math.min(100, st.hunger)) / 100);
  if (d.barM) d.barM.style.strokeDashoffset = circumference * (1 - Math.max(0, Math.min(100, st.mood)) / 100);
  if (d.barS) d.barS.style.strokeDashoffset = circumference * (1 - Math.max(0, Math.min(100, st.sleepy)) / 100);
  if (d.gaugeH) d.gaugeH.classList.toggle('stat-low', st.hunger < 30);
  if (d.gaugeM) d.gaugeM.classList.toggle('stat-low', st.mood < 40);
  if (d.gaugeS) d.gaugeS.classList.toggle('stat-low', st.sleepy > 70);

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

  // Show PixiJS need bubble on pet AND update DOM action buttons
  if (typeof PetRenderer !== 'undefined' && PetRenderer.showNeed) {
    var btn = Pet.getActionButton(st);
    if (btn) {
      var needMap = { 'feed': 'hungry', 'play': 'bored', 'sleep': 'sleepy', 'wake': 'sleepy', 'hatch': null };
      PetRenderer.showNeed(needMap[btn.action] || null);
      if (d.petHint) d.petHint.classList.add('hidden');

      if (d.actionBtnNeed) {
        var iconMap = { 'feed': '\uD83C\uDF5A', 'play': '\uD83C\uDFB2', 'sleep': '\uD83D\uDCA4', 'wake': '\u2600\uFE0F', 'hatch': '\uD83D\uDC4B' };
        var classMap = { 'feed': '', 'play': '', 'sleep': 'action-btn-sleep', 'wake': 'action-btn-wake', 'hatch': '' };
        d.actionBtnNeed.classList.remove('hidden', 'action-btn-sleep', 'action-btn-wake');
        if (classMap[btn.action]) d.actionBtnNeed.classList.add(classMap[btn.action]);
        if (d.actionBtnIcon) d.actionBtnIcon.textContent = iconMap[btn.action] || '';
        if (d.actionBtnLabel) d.actionBtnLabel.textContent = btn.label;
      }
    } else {
      PetRenderer.hideNeed();
      if (d.petHint) d.petHint.classList.remove('hidden');
      if (d.actionBtnNeed) d.actionBtnNeed.classList.add('hidden');
    }
  }

  // Update care bar: hide during egg stage, toggle sleep/wake
  var careBar = document.getElementById('careBar');
  if (careBar) {
    careBar.style.display = (st.stage === 0) ? 'none' : '';
    // Disable feed/wash/learn while sleeping
    var otherBtns = careBar.querySelectorAll('.care-btn-feed,.care-btn-wash,.care-btn-learn');
    for (var bi = 0; bi < otherBtns.length; bi++) {
      otherBtns[bi].disabled = st.sleeping;
      otherBtns[bi].style.opacity = st.sleeping ? '0.4' : '';
    }
  }
  var careSleepIcon = document.getElementById('careSleepIcon');
  var careSleepLabel = document.getElementById('careSleepLabel');
  var careBtnSleep = document.getElementById('careBtnSleep');
  if (careSleepIcon && careSleepLabel && careBtnSleep) {
    if (st.sleeping) {
      careSleepIcon.innerHTML = '&#9728;&#65039;';
      careSleepLabel.textContent = '깨우기';
      careBtnSleep.onclick = function() { handleAction('wake'); };
    } else {
      careSleepIcon.innerHTML = '&#128164;';
      careSleepLabel.textContent = '잠자기';
      careBtnSleep.onclick = function() { handleAction('sleep'); };
    }
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

  if (action === 'play' || action === 'learn') {
    if (typeof Learning !== 'undefined') {
      Learning.startLearning(st);
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
    if (typeof CareActivity !== 'undefined') {
      CareActivity.startWash(st);
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

function getState() {
  return st;
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
