// js/game.js
// 게임 루프, 스탯 관리, 화면 전환

var st = null;
var tickCount = 0;
var sessionStart = Date.now();
var currentScreen = 'home';
var hatchTaps = 0;
var _tickInterval = null;

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

function initWorld() {
  var container = document.getElementById('worldCanvas');
  if (container && typeof World !== 'undefined') {
    World.init(container).then(function() {
      var allKnown = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
      World.syncLetterFlowers(allKnown);
      if (typeof PetRenderer !== 'undefined') {
        PetRenderer.init(World.app, st);
      }
      updateHome(st);
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

// showScreen is defined in index.html inline script (nameScreen pattern)
// This wrapper just tracks currentScreen
var _origShowScreen = null;
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
  var nameEl = document.getElementById('petNameLabel');
  var stageEl = document.getElementById('petStageLabel');
  if (nameEl) nameEl.textContent = st.name;
  if (stageEl) {
    var evo = EVOLUTION[st.stage] || EVOLUTION[0];
    stageEl.textContent = evo.name;
  }

  var barH = document.getElementById('fillHunger');
  var barM = document.getElementById('fillMood');
  var barS = document.getElementById('fillSleepy');
  if (barH) barH.style.width = Math.max(0, Math.min(100, st.hunger)) + '%';
  if (barM) barM.style.width = Math.max(0, Math.min(100, st.mood)) + '%';
  if (barS) barS.style.width = Math.max(0, Math.min(100, st.sleepy)) + '%';

  var speechBubble = document.getElementById('speechBubble');
  if (speechBubble) {
    var text = Pet.getSpeechText(st);
    if (text && text !== '~') {
      speechBubble.textContent = text;
      speechBubble.classList.remove('hidden');
    } else {
      speechBubble.classList.add('hidden');
    }
  }

  // Show floating need icon instead of text button
  var needIcon = document.getElementById('needIcon');
  var needIconInner = document.getElementById('needIconInner');
  var petHint = document.querySelector('.pet-hint');
  if (needIcon && needIconInner) {
    var btn = Pet.getActionButton(st);
    if (btn && btn.action !== 'hatch') {
      // Show visual icon based on pet's need
      var iconMap = {
        'feed': '<svg width="40" height="40" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#f4b870"/><path d="M16 20c0-4 3-8 8-8s8 4 8 8v8c0 2-2 4-4 4h-8c-2 0-4-2-4-4z" fill="white"/><circle cx="20" cy="24" r="2" fill="#3a3028"/><circle cx="28" cy="24" r="2" fill="#3a3028"/></svg>',
        'play': '<svg width="40" height="40" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#a8d8b0"/><path d="M18 14l16 10-16 10z" fill="white"/></svg>',
        'sleep': '<svg width="40" height="40" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#c8a0d8"/><text x="24" y="30" text-anchor="middle" fill="white" font-size="18" font-weight="bold">Z</text></svg>',
        'wake': '<svg width="40" height="40" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#88c8e8"/><circle cx="24" cy="24" r="8" fill="#f0d060"/><line x1="24" y1="8" x2="24" y2="14" stroke="#f0d060" stroke-width="2"/><line x1="24" y1="34" x2="24" y2="40" stroke="#f0d060" stroke-width="2"/><line x1="8" y1="24" x2="14" y2="24" stroke="#f0d060" stroke-width="2"/><line x1="34" y1="24" x2="40" y2="24" stroke="#f0d060" stroke-width="2"/></svg>'
      };
      needIconInner.innerHTML = iconMap[btn.action] || '';
      needIcon.dataset.action = btn.action;
      needIcon.classList.remove('hidden');
      if (petHint) petHint.classList.add('hidden');
    } else if (btn && btn.action === 'hatch') {
      // Egg: show tap icon
      needIconInner.innerHTML = '<svg width="40" height="40" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#e8c8a0"/><path d="M24 12c-6 0-10 6-10 14s4 10 10 10 10-2 10-10-4-14-10-14z" fill="#f8e8d0" stroke="#c8b898" stroke-width="1.5"/><path d="M18 24l6-4 6 4" fill="none" stroke="#c8b898" stroke-width="1.5"/></svg>';
      needIcon.dataset.action = btn.action;
      needIcon.classList.remove('hidden');
      if (petHint) petHint.classList.add('hidden');
    } else {
      needIcon.classList.add('hidden');
      if (petHint) petHint.classList.remove('hidden');
    }
  }

  if (typeof PetRenderer !== 'undefined' && PetRenderer.update) {
    PetRenderer.update(st);
  }
}

function handleAction(action) {
  if (action === 'hatch') {
    hatchTaps++;
    if (typeof PetRenderer !== 'undefined' && PetRenderer.wiggle) {
      PetRenderer.wiggle();
    }
    if (hatchTaps >= 3) {
      st.stage = 1;
      // Learning starts at stage 1 (consonants) — no currentWord needed
      st.learning.stage = 1;
      st.learning.consonantIndex = 0;
      if (typeof PetRenderer !== 'undefined' && PetRenderer.celebrate) {
        PetRenderer.celebrate();
      }
      playSound('evolve');
      saveState(st);
      updateHome(st);
    }
    return;
  }

  if (action === 'feed' || action === 'play') {
    if (typeof Learning !== 'undefined') {
      Learning.startLearning(st);
    }
    return;
  }

  if (action === 'sleep') {
    st.sleeping = true;
    saveState(st);
    updateHome(st);
    return;
  }

  if (action === 'wake') {
    st.sleeping = false;
    saveState(st);
    updateHome(st);
    return;
  }

  if (action === 'pet') {
    st.mood = Math.min(100, st.mood + 5);
    if (typeof PetRenderer !== 'undefined' && PetRenderer.petted) {
      PetRenderer.petted();
    }
    saveState(st);
    updateHome(st);
  }
}

function onLearningComplete(result) {
  if (result.fed) st.hunger = Math.min(100, st.hunger + 25);
  if (result.played) st.mood = Math.min(100, st.mood + 15);
  st.daily.activitiesDone++;
  if (st.daily.activitiesDone >= 3 && !st.daily.bonusUnlocked) {
    st.daily.bonusUnlocked = true;
  }
  saveState(st);
  var allKnown = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
  if (typeof World !== 'undefined') {
    World.syncLetterFlowers(allKnown);
  }
  updateHome(st);
}

function showReward(word) {
  showScreen('reward');
  var content = document.getElementById('rewardContent');
  if (!content) return;

  content.innerHTML = '';

  var petDiv = document.createElement('div');
  petDiv.className = 'reward-pet';
  petDiv.innerHTML = '<div class="reward-pet-bounce"></div>';
  content.appendChild(petDiv);

  var wordDiv = document.createElement('div');
  wordDiv.className = 'reward-word';
  wordDiv.textContent = word + '!';
  content.appendChild(wordDiv);

  var msgDiv = document.createElement('div');
  msgDiv.className = 'reward-message';
  msgDiv.textContent = st.name + '가 새로운 말을 배웠어!';
  content.appendChild(msgDiv);

  var btn = document.createElement('button');
  btn.className = 'btn-action reward-btn';
  btn.textContent = '돌아가기';
  btn.onclick = function() {
    showScreen('home');
    updateHome(st);
    if (typeof World !== 'undefined') {
      var allKnown = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
      World.syncLetterFlowers(allKnown);
    }
  };
  content.appendChild(btn);

  speakText(word);

  setTimeout(function() {
    if (typeof World !== 'undefined' && World.app) {
      var W = World.app.screen.width;
      var H = World.app.screen.height;
      showStarParticles(W / 2, H / 2, 20);
    }
  }, 300);
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
