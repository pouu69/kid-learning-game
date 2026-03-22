// js/learning.js
// 3단계 학습 엔진: 자음 → 모음 → 낱말
// Globals: CURRICULUM, saveState (storage.js), updateHome, playSound, speakText (game.js)
// Depends on: LetterActivity, PuzzleActivity, PetRenderer, World

var Learning = {
  popupEl: null,
  overlayEl: null,

  // Get current learning target based on state
  getCurrentTarget: function(st) {
    if (st.learning.stage === 1) {
      // Consonants
      var idx = st.learning.consonantIndex;
      if (idx < CURRICULUM.consonants.length) {
        return { type: 'consonant', data: CURRICULUM.consonants[idx], index: idx };
      }
      // All consonants done → advance to stage 2
      st.learning.stage = 2;
      st.learning.vowelIndex = 0;
      saveState(st);
    }
    if (st.learning.stage === 2) {
      var idx2 = st.learning.vowelIndex;
      if (idx2 < CURRICULUM.vowels.length) {
        return { type: 'vowel', data: CURRICULUM.vowels[idx2], index: idx2 };
      }
      // All vowels done → advance to stage 3
      st.learning.stage = 3;
      st.learning.wordIndex = 0;
      saveState(st);
    }
    if (st.learning.stage === 3) {
      var idx3 = st.learning.wordIndex;
      if (idx3 < CURRICULUM.words.length) {
        return { type: 'word', data: CURRICULUM.words[idx3], index: idx3 };
      }
      return null; // All done
    }
    return null;
  },

  // Open learning popup overlay (no screen transition)
  openPopup: function(content) {
    var self = this;
    // Create overlay if not exists
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'learning-overlay';
      this.overlayEl.onclick = function(e) {
        if (e.target === Learning.overlayEl) return; // don't close on overlay click
      };
      document.body.appendChild(this.overlayEl);
    }
    if (!this.popupEl) {
      this.popupEl = document.createElement('div');
      this.popupEl.className = 'learning-popup';
      this.overlayEl.appendChild(this.popupEl);
    }
    this.popupEl.innerHTML = '';

    // Close button (X, top-right)
    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close-btn';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.onclick = function() {
      self.closePopup();
    };
    this.popupEl.appendChild(closeBtn);

    // Progress indicator
    var st = typeof getState === 'function' ? getState() : null;
    if (st) {
      var target = this.getCurrentTarget(st);
      if (target) {
        var progressEl = document.createElement('div');
        progressEl.className = 'learning-progress';

        if (target.type === 'consonant') {
          var total = CURRICULUM.consonants.length;
          var done = st.learning.consonantIndex;
          for (var i = 0; i < total; i++) {
            var dot = document.createElement('span');
            var cls = 'progress-dot';
            if (i < done) cls += ' done';
            else if (i === done) cls += ' current';
            dot.className = cls;
            progressEl.appendChild(dot);
          }
        } else if (target.type === 'vowel') {
          var totalV = CURRICULUM.vowels.length;
          var doneV = st.learning.vowelIndex;
          for (var v = 0; v < totalV; v++) {
            var dotV = document.createElement('span');
            var clsV = 'progress-dot';
            if (v < doneV) clsV += ' done';
            else if (v === doneV) clsV += ' current';
            dotV.className = clsV;
            progressEl.appendChild(dotV);
          }
        } else if (target.type === 'word') {
          var countEl = document.createElement('span');
          countEl.className = 'progress-word-count';
          countEl.textContent = (st.learning.wordIndex + 1) + '/' + CURRICULUM.words.length;
          progressEl.appendChild(countEl);
        }

        this.popupEl.appendChild(progressEl);
      }
    }

    // Main content
    if (typeof content === 'string') {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = content;
      this.popupEl.appendChild(wrapper);
    } else if (content instanceof HTMLElement) {
      this.popupEl.appendChild(content);
    }

    // Peeking pet at bottom
    var peek = document.createElement('div');
    peek.className = 'popup-pet-peek';
    peek.innerHTML = '<div class="peek-eyes"><span class="peek-eye"></span><span class="peek-eye"></span></div><div class="peek-mouth"></div>';
    this.popupEl.appendChild(peek);

    this.overlayEl.classList.add('active');
  },

  closePopup: function() {
    if (this.overlayEl) {
      this.overlayEl.classList.remove('active');
    }
  },

  // Start learning for current target
  startLearning: function(st) {
    var target = this.getCurrentTarget(st);
    if (!target) return;

    if (target.type === 'consonant' || target.type === 'vowel') {
      // Letter learning: show → trace → distinguish
      LetterActivity.start(st, target);
    } else if (target.type === 'word') {
      // Word composition: 2D block puzzle
      PuzzleActivity.start(st, target.data);
    }
  },

  // Called when a letter is learned
  onLetterComplete: function(st, target) {
    var letter = target.data.letter;
    if (target.type === 'consonant') {
      if (st.learning.knownConsonants.indexOf(letter) === -1) {
        st.learning.knownConsonants.push(letter);
      }
      st.learning.consonantIndex++;
    } else {
      if (st.learning.knownVowels.indexOf(letter) === -1) {
        st.learning.knownVowels.push(letter);
      }
      st.learning.vowelIndex++;
    }

    // Check evolution
    this._checkEvolution(st);

    // Update flower in world
    if (typeof World !== 'undefined') {
      World.addLetterFlower(letter, true);
    }

    saveState(st);
    this.closePopup();

    // Pet reaction
    if (typeof PetRenderer !== 'undefined' && PetRenderer.celebrate) {
      PetRenderer.celebrate();
    }
    playSound('correct');
    speakText(target.data.sound);

    // Stat recovery
    st.hunger = Math.min(100, st.hunger + 15);
    st.mood = Math.min(100, st.mood + 10);
    saveState(st);
    updateHome(st);
  },

  // Called when a word is completed
  onWordComplete: function(st, wordData) {
    if (st.learning.completedWords.indexOf(wordData.word) === -1) {
      st.learning.completedWords.push(wordData.word);
    }
    st.learning.wordIndex++;

    this._checkEvolution(st);

    if (typeof World !== 'undefined') {
      World.addWordFlower(wordData.word);
    }

    saveState(st);
    this.closePopup();

    if (typeof PetRenderer !== 'undefined' && PetRenderer.celebrate) {
      PetRenderer.celebrate();
    }
    playSound('correct');
    speakText(wordData.word);

    st.hunger = Math.min(100, st.hunger + 20);
    st.mood = Math.min(100, st.mood + 15);
    saveState(st);
    updateHome(st);
  },

  _checkEvolution: function(st) {
    var consCount = st.learning.knownConsonants.length;
    var vowCount = st.learning.knownVowels.length;
    var wordCount = st.learning.completedWords.length;

    var newStage = st.stage;
    if (wordCount >= 15) newStage = 5;
    else if (wordCount >= 10) newStage = 4;
    else if (vowCount >= 6) newStage = 3;
    else if (consCount >= 9) newStage = 2;
    else if (st.stage >= 1) newStage = st.stage;

    if (newStage > st.stage) {
      st.stage = newStage;
      playSound('evolve');
    }
  }
};

// Global function called from game.js
function startLearning(st) {
  Learning.startLearning(st);
}
