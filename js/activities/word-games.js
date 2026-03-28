// js/activities/word-games.js
// Stage 4: Word learning games — multiple game modes for word mastery
// Wraps existing PuzzleActivity + adds new modes (missing syllable, word-picture match)
// Globals: CURRICULUM, LETTERS, Learning, PuzzleActivity, speakText, playSound

var WordGamesActivity = {
  _timers: [],
  _mode: null, // 'puzzle' | 'missing' | 'match'

  _cleanup: function() {
    for (var i = 0; i < this._timers.length; i++) {
      clearTimeout(this._timers[i]);
    }
    this._timers = [];
    this._mode = null;
    // Also cleanup PuzzleActivity if it was used
    if (typeof PuzzleActivity !== 'undefined' && PuzzleActivity._controller) {
      PuzzleActivity._controller.abort();
    }
  },

  _setTimeout: function(fn, ms) {
    var id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  },

  start: function(st, target) {
    this._cleanup();
    var wordData = target.data || target;

    // Pick game mode based on word complexity and review state
    if (target.review) {
      // Reviews rotate between modes
      var modes = ['missing', 'match', 'puzzle'];
      this._mode = modes[Math.floor(Math.random() * modes.length)];
    } else {
      // New words always start with puzzle (full syllable composition)
      this._mode = 'puzzle';
    }

    if (this._mode === 'puzzle') {
      this._startPuzzle(st, wordData);
    } else if (this._mode === 'missing') {
      this._startMissingSyllable(st, wordData);
    } else {
      this._startWordMatch(st, wordData);
    }
  },

  // Mode 1: Full syllable puzzle (delegates to existing PuzzleActivity)
  _startPuzzle: function(st, wordData) {
    if (typeof PuzzleActivity !== 'undefined') {
      PuzzleActivity.start(st, wordData);
    }
  },

  // Mode 2: Missing syllable — fill in the blank
  _startMissingSyllable: function(st, wordData) {
    var self = this;
    if (wordData.syllables.length < 2) {
      // Single-syllable words can't have missing parts, fall back to match
      this._startWordMatch(st, wordData);
      return;
    }

    var container = document.createElement('div');
    container.className = 'word-games-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '빈칸을 채워봐!';
    container.appendChild(label);

    // Sound button
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() { speakText(wordData.word, 0.7); };
    container.appendChild(soundBtn);

    // Pick random syllable to hide
    var hideIdx = Math.floor(Math.random() * wordData.syllables.length);
    var hiddenChar = wordData.syllables[hideIdx].char;

    // Display word with blank
    var wordRow = document.createElement('div');
    wordRow.className = 'word-games-word-row';
    for (var i = 0; i < wordData.syllables.length; i++) {
      var charEl = document.createElement('span');
      charEl.className = 'word-games-char';
      if (i === hideIdx) {
        charEl.classList.add('word-games-char--blank');
        charEl.textContent = '?';
        charEl.id = 'word-games-blank';
      } else {
        charEl.textContent = wordData.syllables[i].char;
      }
      wordRow.appendChild(charEl);
    }
    container.appendChild(wordRow);

    // Build 3 choices (correct + 2 distractors from other syllables in curriculum)
    var choices = this._buildSyllableChoices(hiddenChar, wordData);
    var choiceContainer = document.createElement('div');
    choiceContainer.className = 'word-games-choices';
    choiceContainer.onclick = function(e) {
      var btn = e.target.closest('.word-games-choice');
      if (!btn || btn.classList.contains('choice-locked')) return;
      self._handleMissingChoice(st, wordData, btn.getAttribute('data-char'), hiddenChar, choiceContainer);
    };

    for (var c = 0; c < choices.length; c++) {
      var btn = document.createElement('button');
      btn.className = 'word-games-choice';
      btn.setAttribute('data-char', choices[c]);
      btn.textContent = choices[c];
      choiceContainer.appendChild(btn);
    }
    container.appendChild(choiceContainer);

    Learning.openPopup(container);
    this._setTimeout(function() { speakText(wordData.word, 0.7); }, 500);
  },

  _buildSyllableChoices: function(correct, wordData) {
    // Collect distractors from other words' syllables
    var distractors = [];
    for (var i = 0; i < CURRICULUM.words.length; i++) {
      var w = CURRICULUM.words[i];
      if (w.word === wordData.word) continue;
      for (var j = 0; j < w.syllables.length; j++) {
        var ch = w.syllables[j].char;
        if (ch !== correct && distractors.indexOf(ch) === -1) {
          distractors.push(ch);
        }
      }
    }
    // Shuffle and pick 2
    for (var k = distractors.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var t = distractors[k]; distractors[k] = distractors[r]; distractors[r] = t;
    }
    var choices = distractors.slice(0, 2);
    choices.push(correct);
    // Shuffle final
    for (var m = choices.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var tmp = choices[m]; choices[m] = choices[n]; choices[n] = tmp;
    }
    return choices;
  },

  _handleMissingChoice: function(st, wordData, selected, correct, choiceContainer) {
    var buttons = choiceContainer.querySelectorAll('.word-games-choice');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.add('choice-locked');
    }

    if (selected === correct) {
      // Fill in the blank
      var blank = document.getElementById('word-games-blank');
      if (blank) {
        blank.textContent = correct;
        blank.classList.remove('word-games-char--blank');
        blank.classList.add('word-games-char--filled');
      }
      for (var j = 0; j < buttons.length; j++) {
        if (buttons[j].getAttribute('data-char') === correct) {
          buttons[j].classList.add('choice-correct');
        }
      }
      playSound('correct');
      var self = this;
      this._setTimeout(function() {
        Learning.onWordComplete(st, wordData);
      }, 1000);
    } else {
      for (var k = 0; k < buttons.length; k++) {
        if (buttons[k].getAttribute('data-char') === selected) {
          buttons[k].classList.add('choice-wrong');
        }
      }
      var self2 = this;
      this._setTimeout(function() {
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove('choice-locked', 'choice-wrong');
        }
        speakText(wordData.word, 0.7);
      }, 800);
    }
  },

  // Mode 3: Word-picture matching — hear word, pick correct word from choices
  _startWordMatch: function(st, wordData) {
    var self = this;

    var container = document.createElement('div');
    container.className = 'word-games-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '어떤 단어일까?';
    container.appendChild(label);

    // Sound button
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() { speakText(wordData.word, 0.7); };
    container.appendChild(soundBtn);

    // Meaning hint
    var meaningHint = document.createElement('div');
    meaningHint.className = 'word-games-meaning';
    meaningHint.textContent = wordData.meaning || '';
    container.appendChild(meaningHint);

    // Build word choices (correct + 2 distractors)
    var choices = this._buildWordChoices(wordData);
    var choiceContainer = document.createElement('div');
    choiceContainer.className = 'word-games-choices';
    choiceContainer.onclick = function(e) {
      var btn = e.target.closest('.word-games-choice');
      if (!btn || btn.classList.contains('choice-locked')) return;
      self._handleWordMatchChoice(st, wordData, btn.getAttribute('data-char'), choiceContainer);
    };

    for (var c = 0; c < choices.length; c++) {
      var btn = document.createElement('button');
      btn.className = 'word-games-choice word-games-choice--word';
      btn.setAttribute('data-char', choices[c]);
      btn.textContent = choices[c];
      choiceContainer.appendChild(btn);
    }
    container.appendChild(choiceContainer);

    Learning.openPopup(container);
    this._setTimeout(function() { speakText(wordData.word, 0.7); }, 500);
  },

  _buildWordChoices: function(wordData) {
    var correct = wordData.word;
    var distractors = [];
    // Pick words with similar syllable count
    var targetLen = wordData.syllables.length;
    for (var i = 0; i < CURRICULUM.words.length; i++) {
      var w = CURRICULUM.words[i];
      if (w.word !== correct && Math.abs(w.syllables.length - targetLen) <= 1) {
        distractors.push(w.word);
      }
    }
    for (var j = distractors.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = distractors[j]; distractors[j] = distractors[k]; distractors[k] = t;
    }
    var choices = distractors.slice(0, 2);
    choices.push(correct);
    for (var m = choices.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var tmp = choices[m]; choices[m] = choices[n]; choices[n] = tmp;
    }
    return choices;
  },

  _handleWordMatchChoice: function(st, wordData, selected, choiceContainer) {
    var buttons = choiceContainer.querySelectorAll('.word-games-choice');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.add('choice-locked');
    }

    if (selected === wordData.word) {
      for (var j = 0; j < buttons.length; j++) {
        if (buttons[j].getAttribute('data-char') === wordData.word) {
          buttons[j].classList.add('choice-correct');
        }
      }
      playSound('correct');
      var self = this;
      this._setTimeout(function() {
        Learning.onWordComplete(st, wordData);
      }, 1000);
    } else {
      for (var k = 0; k < buttons.length; k++) {
        if (buttons[k].getAttribute('data-char') === selected) {
          buttons[k].classList.add('choice-wrong');
        }
      }
      var self2 = this;
      this._setTimeout(function() {
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove('choice-locked', 'choice-wrong');
        }
        speakText(wordData.word, 0.7);
      }, 800);
    }
  }
};
