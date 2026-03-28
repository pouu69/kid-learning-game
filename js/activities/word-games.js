// js/activities/word-games.js
// Stage 4: Word learning games — multiple game modes for word mastery
// Wraps existing PuzzleActivity + adds new modes (missing syllable, word-picture match)
// Globals: CURRICULUM, LETTERS, Learning, PuzzleActivity, speakText, playSound
// Shared: shuffleArray, buildChoices, createSoundButton, handleChoiceResult, applyTimerMixin, randomPick

var WordGamesActivity = {
  _mode: null, // 'puzzle' | 'missing' | 'match'

  start: function(st, target) {
    this._cleanup();
    this._mode = null;
    var wordData = target.data || target;

    // Pick game mode based on word complexity and review state
    if (target.review) {
      // Reviews rotate between modes
      this._mode = randomPick(['missing', 'match', 'puzzle']);
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
    speakText('빈칸을 채워봐!', 0.7);
    container.appendChild(label);

    // Sound button
    var soundBtn = createSoundButton(function() {
      speakText(wordData.word, 0.7);
    });
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

    // Build 3 choices using shared utility
    var syllablePool = this._collectSyllablePool(wordData);
    var choices = buildChoices(hiddenChar, syllablePool, 2);

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

  // Collect all unique syllable chars from curriculum words (excluding current word)
  _collectSyllablePool: function(wordData) {
    var pool = [];
    for (var i = 0; i < CURRICULUM.words.length; i++) {
      var w = CURRICULUM.words[i];
      if (w.word === wordData.word) continue;
      for (var j = 0; j < w.syllables.length; j++) {
        var ch = w.syllables[j].char;
        if (pool.indexOf(ch) === -1) {
          pool.push(ch);
        }
      }
    }
    return pool;
  },

  _handleMissingChoice: function(st, wordData, selected, correct, choiceContainer) {
    var buttons = choiceContainer.querySelectorAll('.word-games-choice');
    var self = this;

    // Custom onCorrect to fill in the blank before completing
    handleChoiceResult(
      this, buttons, 'data-char', selected, correct,
      function() {
        var blank = document.getElementById('word-games-blank');
        if (blank) {
          blank.textContent = correct;
          blank.classList.remove('word-games-char--blank');
          blank.classList.add('word-games-char--filled');
        }
        self._setTimeout(function() {
          Learning.onWordComplete(st, wordData);
        }, 200);
      },
      function() {
        speakText(wordData.word, 0.7);
      }
    );
  },

  // Mode 3: Word-picture matching — hear word, pick correct word from choices
  _startWordMatch: function(st, wordData) {
    var self = this;

    var container = document.createElement('div');
    container.className = 'word-games-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '어떤 단어일까?';
    speakText('어떤 단어일까?', 0.7);
    container.appendChild(label);

    // Sound button
    var soundBtn = createSoundButton(function() {
      speakText(wordData.word, 0.7);
    });
    container.appendChild(soundBtn);

    // Meaning hint
    var meaningHint = document.createElement('div');
    meaningHint.className = 'word-games-meaning';
    meaningHint.textContent = wordData.meaning || '';
    container.appendChild(meaningHint);

    // Build word choices using shared utility
    var targetLen = wordData.syllables.length;
    var wordPool = [];
    for (var i = 0; i < CURRICULUM.words.length; i++) {
      var w = CURRICULUM.words[i];
      if (w.word !== wordData.word && Math.abs(w.syllables.length - targetLen) <= 1) {
        wordPool.push(w.word);
      }
    }
    var choices = buildChoices(wordData.word, wordPool, 2);

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

  _handleWordMatchChoice: function(st, wordData, selected, choiceContainer) {
    var buttons = choiceContainer.querySelectorAll('.word-games-choice');
    var self = this;

    handleChoiceResult(
      this, buttons, 'data-char', selected, wordData.word,
      function() {
        Learning.onWordComplete(st, wordData);
      },
      function() {
        speakText(wordData.word, 0.7);
      }
    );
  }
};

applyTimerMixin(WordGamesActivity);

// Override _cleanup to also clean up PuzzleActivity
(function() {
  var mixinCleanup = WordGamesActivity._cleanup;
  WordGamesActivity._cleanup = function() {
    mixinCleanup.call(this);
    this._mode = null;
    if (typeof PuzzleActivity !== 'undefined' && PuzzleActivity._controller) {
      PuzzleActivity._controller.abort();
    }
  };
})();
