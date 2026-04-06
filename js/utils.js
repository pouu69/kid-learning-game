// js/utils.js
// Shared utilities for activities and game logic

// ── Shuffle ──
function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Choice Builder ──
// Build N+1 choices: correct + N distractors from pool, shuffled
function buildChoices(correct, pool, numDistractors) {
  var n = numDistractors || 2;
  var distractors = pool.filter(function(item) { return item !== correct; });
  distractors = shuffleArray(distractors).slice(0, n);
  distractors.push(correct);
  return shuffleArray(distractors);
}

// ── Timer Mixin ──
// Apply to any activity object to get _timers, _cleanup, _setTimeout
function applyTimerMixin(target) {
  target._timers = [];
  target._cleanup = function() {
    for (var i = 0; i < this._timers.length; i++) {
      clearTimeout(this._timers[i]);
    }
    this._timers = [];
  };
  target._setTimeout = function(fn, ms) {
    var self = this;
    var id = setTimeout(function() {
      var idx = self._timers.indexOf(id);
      if (idx !== -1) self._timers.splice(idx, 1);
      fn();
    }, ms);
    this._timers.push(id);
    return id;
  };
}

// ── Sound Button ──
var SOUND_ICON_SVG = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';

function createSoundButton(onClickFn) {
  var btn = document.createElement('button');
  btn.className = 'sound-btn sound-btn-big sound-btn-wave';
  btn.innerHTML = SOUND_ICON_SVG;
  btn.onclick = onClickFn;
  return btn;
}

// ── Choice Handling ──
// Lock buttons, mark correct/wrong, unlock after delay
function handleChoiceResult(activity, buttons, dataAttr, selectedVal, correctVal, onCorrect, onRetry) {
  var i;
  for (i = 0; i < buttons.length; i++) {
    buttons[i].classList.add('choice-locked');
  }

  if (selectedVal === correctVal) {
    for (i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute(dataAttr) === correctVal) {
        buttons[i].classList.add('choice-correct');
      }
    }
    playSound('correct');
    var delayFn = (activity && activity._setTimeout) ? function(fn, ms) { activity._setTimeout(fn, ms); } : setTimeout;
    if (onCorrect) delayFn(onCorrect, 800);
  } else {
    for (i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute(dataAttr) === selectedVal) {
        buttons[i].classList.add('choice-wrong');
      }
    }
    var delayFn2 = (activity && activity._setTimeout) ? function(fn, ms) { activity._setTimeout(fn, ms); } : setTimeout;
    delayFn2(function() {
      for (var k = 0; k < buttons.length; k++) {
        buttons[k].classList.remove('choice-locked', 'choice-wrong');
      }
      if (onRetry) onRetry();
    }, 800);
  }
}

// ── CURRICULUM Lookup Maps (cached, built on first access) ──
var _wordMap = null;
var _letterMap = null;

function getWordMap() {
  if (_wordMap) return _wordMap;
  _wordMap = {};
  for (var i = 0; i < CURRICULUM.words.length; i++) {
    _wordMap[CURRICULUM.words[i].word] = CURRICULUM.words[i];
  }
  return _wordMap;
}

function getLetterMap() {
  if (_letterMap) return _letterMap;
  _letterMap = {};
  var pools = [CURRICULUM.consonants, CURRICULUM.bonusConsonants || [], CURRICULUM.vowels, CURRICULUM.bonusVowels || []];
  for (var p = 0; p < pools.length; p++) {
    for (var i = 0; i < pools[p].length; i++) {
      _letterMap[pools[p][i].letter] = pools[p][i];
    }
  }
  return _letterMap;
}

// All curriculum letters as flat array (cached)
var _allLetterPool = null;
function getAllLetterPool() {
  if (_allLetterPool) return _allLetterPool;
  _allLetterPool = CURRICULUM.consonants
    .concat(CURRICULUM.bonusConsonants || [])
    .concat(CURRICULUM.vowels)
    .concat(CURRICULUM.bonusVowels || []);
  return _allLetterPool;
}
