// js/learning.js
// 3단계 학습 엔진: 자음 → 모음 → 낱말
// Globals: CURRICULUM, saveState (storage.js), updateHome, playSound, speakText (game.js)
// Depends on: LetterActivity, PuzzleActivity, PetRenderer, World

var Learning = {
  popupEl: null,
  overlayEl: null,

  // Sync learning stage to match actual progress (call before getCurrentTarget)
  _syncStage: function(st) {
    var consIdx = st.learning.consonantIndex || 0;
    var vowIdx = st.learning.vowelIndex || 0;
    var changed = false;

    if (consIdx < CURRICULUM.consonants.length) {
      if (st.learning.stage > 1) { st.learning.stage = 1; changed = true; }
    } else if (vowIdx < CURRICULUM.vowels.length) {
      if (st.learning.stage !== 2) { st.learning.stage = 2; changed = true; }
    } else if (st.learning.stage < 3) {
      st.learning.stage = 3;
      if (!st.learning.wordIndex) st.learning.wordIndex = 0;
      changed = true;
    }

    if (changed) saveState(st);
  },

  // Get current learning target (pure read, no side effects)
  getCurrentTarget: function(st) {
    var consIdx = st.learning.consonantIndex || 0;
    var vowIdx = st.learning.vowelIndex || 0;

    if (consIdx < CURRICULUM.consonants.length) {
      return { type: 'consonant', data: CURRICULUM.consonants[consIdx], index: consIdx };
    }
    if (vowIdx < CURRICULUM.vowels.length) {
      return { type: 'vowel', data: CURRICULUM.vowels[vowIdx], index: vowIdx };
    }

    var wordIdx = st.learning.wordIndex || 0;
    if (wordIdx < CURRICULUM.words.length) {
      return { type: 'word', data: CURRICULUM.words[wordIdx], index: wordIdx };
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
    // Always refresh HUD when popup closes
    var currentSt = typeof getState === 'function' ? getState() : null;
    if (currentSt && typeof updateHome === 'function') {
      updateHome(currentSt);
    }
    // Auto-return to home when learning is complete
    if (typeof currentScreen !== 'undefined' && currentScreen === 'learning') {
      if (typeof showScreen === 'function') showScreen('home');
      if (typeof PetRenderer !== 'undefined') {
        if (PetRenderer.container) PetRenderer.container.visible = true;
        if (PetRenderer.walkOnScreen) PetRenderer.walkOnScreen('left');
      }
    }
  },

  // Spaced repetition learning system
  // Pattern: 새 글자 → 복습 → 복습 → 새 글자 → 복습 → 복습 ...
  _sessionCount: 0,

  startLearning: function(st) {
    this._syncStage(st);
    this._sessionCount++;

    // Initialize practice tracker if missing
    if (!st.learning.practiceCount) st.learning.practiceCount = {};

    var target = this.getCurrentTarget(st);
    var knownLetters = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    var knownWords = st.learning.completedWords || [];
    var hasReviewable = knownLetters.length >= 1 || knownWords.length >= 1;

    if (!target && !hasReviewable) return; // Nothing to learn or review

    if (!target) {
      // All curriculum done — pure review mode
      this._startReview(st);
      return;
    }

    // Spaced repetition: new → review → review cycle
    // Every 2 out of 3 sessions should be review (if there's anything to review)
    if (hasReviewable && this._sessionCount % 3 !== 1) {
      this._startReview(st);
      return;
    }

    // New content
    if (target.type === 'consonant' || target.type === 'vowel') {
      LetterActivity.start(st, target);
    } else if (target.type === 'word') {
      PuzzleActivity.start(st, target.data);
    }
  },

  // Smart review — prioritize least-practiced items
  _startReview: function(st) {
    var self = this;
    if (!st.learning.practiceCount) st.learning.practiceCount = {};
    var pc = st.learning.practiceCount;

    var allLetters = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    var allWords = st.learning.completedWords || [];
    var allItems = [];

    // Build items with practice counts
    for (var i = 0; i < allLetters.length; i++) {
      allItems.push({ key: allLetters[i], type: 'letter', count: pc[allLetters[i]] || 0 });
    }
    for (var w = 0; w < allWords.length; w++) {
      allItems.push({ key: allWords[w], type: 'word', count: pc[allWords[w]] || 0 });
    }

    if (allItems.length === 0) return;

    // Sort by practice count (least practiced first), add randomness to ties
    allItems.sort(function(a, b) {
      var diff = a.count - b.count;
      return diff !== 0 ? diff : (Math.random() - 0.5);
    });

    // Pick from the least practiced third
    var pickRange = Math.max(1, Math.ceil(allItems.length / 3));
    var pick = allItems[Math.floor(Math.random() * pickRange)];

    // Track practice
    pc[pick.key] = (pc[pick.key] || 0) + 1;
    saveState(st);

    if (pick.type === 'word') {
      var wordData = null;
      for (var wi = 0; wi < CURRICULUM.words.length; wi++) {
        if (CURRICULUM.words[wi].word === pick.key) { wordData = CURRICULUM.words[wi]; break; }
      }
      if (wordData) {
        PuzzleActivity.start(st, wordData);
      }
    } else {
      var isConsonant = (st.learning.knownConsonants || []).indexOf(pick.key) !== -1;
      var pool = isConsonant ? CURRICULUM.consonants : CURRICULUM.vowels;
      var letterData = null;
      for (var li = 0; li < pool.length; li++) {
        if (pool[li].letter === pick.key) { letterData = pool[li]; break; }
      }
      if (letterData) {
        var target = { type: isConsonant ? 'consonant' : 'vowel', data: letterData, index: 0, review: true };
        LetterActivity.start(st, target);
      }
    }
  },

  // Shared reward sequence (eliminates duplication between onLetterComplete/onWordComplete)
  _showReward: function(st, displayText, praise, soundType, speechText, particleType, hungerBonus, moodBonus) {
    var self = this;
    var prevStage = st.stage;
    this._checkEvolution(st);
    var didEvolve = st.stage > prevStage;

    saveState(st);
    if (typeof updateHome === 'function') updateHome(st);

    var rewardEl = document.createElement('div');
    rewardEl.style.cssText = 'text-align:center;padding:2rem;';
    rewardEl.innerHTML = '<div style="font-size:' + (displayText.length > 1 ? '3.5' : '4') + 'rem;animation:popIn 0.4s ease">' + displayText + '</div>' +
      '<div style="font-size:1.2rem;color:var(--gold);margin-top:1rem;font-family:var(--font-pixel);animation:popIn 0.6s ease">' + praise + '</div>';
    self.openPopup(rewardEl);

    if (typeof showCelebration === 'function') {
      showCelebration(window.innerWidth / 2, window.innerHeight / 2);
    }
    if (didEvolve && typeof flashScreen === 'function') {
      flashScreen();
      playSound('evolve');
    } else {
      playSound(soundType);
    }
    if (speechText) speakText(speechText);

    setTimeout(function() {
      self.closePopup();
      if (typeof PetRenderer !== 'undefined') {
        if (PetRenderer.celebrate) PetRenderer.celebrate();
        if (PetRenderer.emitParticles) PetRenderer.emitParticles(particleType, 5);
        if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('잘했어!', 120);
      }
      st.hunger = Math.min(100, st.hunger + hungerBonus);
      st.mood = Math.min(100, st.mood + moodBonus);
      st.daily.activitiesDone++;
      saveState(st);
      updateHome(st);
    }, 1500);
  },

  // Called when a letter is learned
  onLetterComplete: function(st, target) {
    var letter = target.data.letter;
    if (target.type === 'consonant') {
      if (st.learning.knownConsonants.indexOf(letter) === -1) {
        st.learning.knownConsonants.push(letter);
        if (!target.review) st.learning.consonantIndex++;
      }
    } else {
      if (st.learning.knownVowels.indexOf(letter) === -1) {
        st.learning.knownVowels.push(letter);
        if (!target.review) st.learning.vowelIndex++;
      }
    }

    if (typeof World !== 'undefined') World.addLetterFlower(letter, true);

    // Stage complete → show recap instead of normal reward
    if (target.type === 'consonant' && st.learning.consonantIndex >= CURRICULUM.consonants.length) {
      saveState(st);
      this._showStageRecap(st, 'consonant');
      return;
    }
    if (target.type === 'vowel' && st.learning.vowelIndex >= CURRICULUM.vowels.length) {
      saveState(st);
      this._showStageRecap(st, 'vowel');
      return;
    }

    var praises = ['잘했어!', '멋져!', '최고야!', '대단해!'];
    var praise = praises[Math.floor(Math.random() * praises.length)];
    this._showReward(st, letter, praise, 'correct', target.data.sound, 'star', 15, 10);
  },

  // Show recap grid of all learned letters before advancing stage
  _showStageRecap: function(st, type) {
    var self = this;
    var letters = type === 'consonant' ? st.learning.knownConsonants : st.learning.knownVowels;

    var container = document.createElement('div');
    container.className = 'letter-activity';

    // Title message
    var title = document.createElement('div');
    title.style.cssText = 'font-family:var(--font-pixel);font-size:1.4rem;color:var(--gold);text-align:center;animation:popIn 0.4s ease;margin-bottom:0.3rem';
    title.textContent = type === 'consonant' ? '자음 완료!' : '모음 완료!';
    container.appendChild(title);

    // Subtitle
    var subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-family:var(--font-pixel);font-size:0.85rem;color:var(--text-light);text-align:center;opacity:0.7;margin-bottom:0.5rem';
    subtitle.textContent = '배운 글자를 눌러보세요';
    container.appendChild(subtitle);

    // Letter grid — tappable to hear sounds
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:1rem 0;width:100%;max-width:300px';
    for (var i = 0; i < letters.length; i++) {
      var cell = document.createElement('div');
      cell.className = 'distinguish-choice choice-correct';
      cell.textContent = letters[i];
      cell.style.animation = 'popIn ' + (0.3 + i * 0.1) + 's ease';
      (function(ltr) {
        cell.onclick = function() {
          var data = null;
          for (var ci = 0; ci < CURRICULUM.consonants.length; ci++) {
            if (CURRICULUM.consonants[ci].letter === ltr) { data = CURRICULUM.consonants[ci]; break; }
          }
          if (!data) {
            for (var vi = 0; vi < CURRICULUM.vowels.length; vi++) {
              if (CURRICULUM.vowels[vi].letter === ltr) { data = CURRICULUM.vowels[vi]; break; }
            }
          }
          if (data) speakText(data.sound, 0.7);
        };
      })(letters[i]);
      grid.appendChild(cell);
    }
    container.appendChild(grid);

    self.popupEl.innerHTML = '';
    self.popupEl.appendChild(container);

    // Celebration
    if (typeof showCelebration === 'function') {
      showCelebration(window.innerWidth / 2, window.innerHeight / 2);
    }
    playSound('evolve');

    // Auto-advance to next stage after 3.5 seconds
    setTimeout(function() {
      self.closePopup();
      if (type === 'consonant') {
        st.learning.stage = 2;
        st.learning.vowelIndex = 0;
      } else {
        st.learning.stage = 3;
        st.learning.wordIndex = 0;
      }
      if (typeof PetRenderer !== 'undefined' && PetRenderer.celebrate) {
        PetRenderer.celebrate();
      }
      st.hunger = Math.min(100, st.hunger + 15);
      st.mood = Math.min(100, st.mood + 10);
      saveState(st);
      updateHome(st);
    }, 3500);
  },

  // Called when a word is completed
  onWordComplete: function(st, wordData) {
    if (st.learning.completedWords.indexOf(wordData.word) === -1) {
      st.learning.completedWords.push(wordData.word);
    }
    st.learning.wordIndex++;

    if (typeof World !== 'undefined') World.addWordFlower(wordData.word);

    var wordPraises = ['새로운 말을 배웠어!', '또 하나 배웠다!', '점점 잘하고 있어!', '너무 잘해!'];
    var wPraise = wordPraises[Math.floor(Math.random() * wordPraises.length)];
    this._showReward(st, wordData.word, wPraise, 'correct', wordData.word, 'note', 20, 15);
  },

  _checkEvolution: function(st) {
    var consCount = st.learning.knownConsonants.length;
    var vowCount = st.learning.knownVowels.length;
    var wordCount = st.learning.completedWords.length;

    var th = typeof EVO_THRESHOLDS !== 'undefined' ? EVO_THRESHOLDS : { consonants: 9, vowels: 6, words4: 10, words5: 15 };
    var newStage = st.stage;
    if (wordCount >= th.words5) newStage = 5;
    else if (wordCount >= th.words4) newStage = 4;
    else if (vowCount >= th.vowels) newStage = 3;
    else if (consCount >= th.consonants) newStage = 2;
    else if (st.stage >= 1) newStage = st.stage;

    if (newStage > st.stage) {
      st.stage = newStage;

      // Dramatic evolution animation
      if (typeof PetRenderer !== 'undefined' && PetRenderer.playEvolution) {
        PetRenderer.playEvolution(newStage);
      } else {
        // Fallback
        playSound('evolve');
        if (typeof PetRenderer !== 'undefined') {
          PetRenderer.buildPet(newStage);
        }
      }

      // Show new stage name as floating text after animation
      setTimeout(function() {
        if (typeof PetRenderer !== 'undefined' && PetRenderer._app && PetRenderer.container && typeof PET_STAGES !== 'undefined') {
          var stageData = PET_STAGES[Math.min(newStage, PET_STAGES.length - 1)];
          var stageName = stageData ? stageData.name : '';
          var nameStyle = new PIXI.TextStyle({
            fontFamily: '"DungGeunMo", monospace',
            fontSize: 22,
            fontWeight: 'bold',
            fill: '#f8d848',
          });
          var nameText = new PIXI.Text({ text: stageName + '!', style: nameStyle });
          nameText.anchor.set(0.5, 1);
          nameText.x = PetRenderer.container.x;
          nameText.y = PetRenderer.container.y - 70;
          nameText.alpha = 1;
          nameText._life = 120;
          PetRenderer._app.stage.addChild(nameText);
          var nameTicker = function() {
            nameText.y -= 0.4;
            nameText._life--;
            if (nameText._life < 30) nameText.alpha -= 0.033;
            if (nameText._life <= 0) {
              PetRenderer._app.stage.removeChild(nameText);
              PetRenderer._app.ticker.remove(nameTicker);
              nameText.destroy();
            }
          };
          PetRenderer._app.ticker.add(nameTicker);
        }
      }, 3500); // Show name after evolution animation finishes
    }
  }
};

