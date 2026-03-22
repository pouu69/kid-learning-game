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
      var allKnown = st.learning.knownConsonants.concat(st.learning.knownVowels);
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

  var actionBtn = document.getElementById('actionBtn');
  var petHint = document.querySelector('.pet-hint');
  if (actionBtn) {
    var btn = Pet.getActionButton(st);
    if (btn) {
      actionBtn.textContent = btn.label;
      actionBtn.dataset.action = btn.action;
      actionBtn.classList.remove('hidden');
      if (petHint) petHint.classList.add('hidden');
    } else {
      actionBtn.classList.add('hidden');
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
      st.learning.currentWord = {
        word: CURRICULUM[0].word,
        phase: 1,
        startedAt: Date.now()
      };
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
  var allKnown = st.learning.knownConsonants.concat(st.learning.knownVowels);
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
      var allKnown = st.learning.knownConsonants.concat(st.learning.knownVowels);
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
