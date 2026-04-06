// js/learning.js
// 6단계 학습 엔진: 통글자 → 자음 → 모음 → 음절조합 → 단어 → 문장
// Globals: CURRICULUM, EVO_THRESHOLDS, saveState (storage.js), updateHome, playSound, speakText (game.js)
// Depends on: LetterActivity (meet.js), PuzzleActivity (play.js), PetRenderer, World

// Stage → Activity 매핑 (Phase 2에서 실제 Activity 파일로 교체)
// Stage 0: SoundMatchActivity  → 현재 폴백: LetterActivity
// Stage 1: LetterHuntActivity  → 자음+모음 인터리브 (기존 Stage 1+2 통합)
// Stage 3: SyllableFactoryActivity → 현재 폴백: 없음 (스킵)
// Stage 4: WordGamesActivity   → 현재 폴백: PuzzleActivity
// Stage 5: SentenceBuilderActivity → 현재 폴백: 없음 (스킵)

var Learning = {
  popupEl: null,
  overlayEl: null,
  _sessionCount: 0,
  _NEW_BEFORE_REVIEW: 2,  // 새 항목 2개 배운 후 복습 삽입
  _lastPicks: [],          // 직전 복습 항목 (최대 2개, 연속 반복 방지)
  _sessionActivities: 0,   // 현재 세션 활동 횟수
  _SESSION_LIMIT: 4,       // 세션당 최대 활동 수
  _rewardTimer: null,
  _recapTimer: null,
  _evoTicker: null,
  _activeActivity: null,  // current activity for cleanup on popup close
  _justPlayedMinigame: false,

  // Sync learning stage to match actual progress (6-stage: 0~5)
  _syncStage: function(st) {
    var l = st.learning;
    var newStage;

    var wholeCount = (l.wholeWordsMatched || []).length;
    var intIdx = l.interleavedIndex || 0;
    var syllCount = l.syllablesCompleted || 0;
    var wordCount = (l.completedWords || []).length;

    if (wholeCount < 5) {
      newStage = 0;
    } else if (intIdx < CURRICULUM.interleaved.length) {
      newStage = 1;  // 자음+모음 인터리브 (기존 Stage 1+2 통합)
    } else if (syllCount < 15) {
      newStage = 3;
    } else if (wordCount < 10) {
      newStage = 4;
    } else {
      newStage = 5;
    }

    if (l.stage !== newStage) {
      l.stage = newStage;
      saveState(st);
    }
  },

  // Get current learning target based on stage
  getCurrentTarget: function(st) {
    var l = st.learning;
    var stage = l.stage || 0;

    if (stage === 0) {
      var matched = (l.wholeWordsMatched || []).length;
      if (matched < CURRICULUM.wholeWords.length) {
        return { type: 'wholeWord', data: CURRICULUM.wholeWords[matched], index: matched };
      }
      return null;
    }

    if (stage === 1) {
      var intIdx = l.interleavedIndex || 0;
      if (intIdx < CURRICULUM.interleaved.length) {
        var entry = CURRICULUM.interleaved[intIdx];
        var pool = entry.type === 'consonant' ? CURRICULUM.consonants : CURRICULUM.vowels;
        var data = pool[entry.index];
        return { type: entry.type, data: data, index: intIdx };
      }
      return null;
    }

    if (stage === 3) {
      var syllCount = l.syllablesCompleted || 0;
      if (syllCount < CURRICULUM.syllables.length) {
        return { type: 'syllable', data: CURRICULUM.syllables[syllCount], index: syllCount };
      }
      return null;
    }

    if (stage === 4) {
      var wordIdx = l.wordIndex || 0;
      if (wordIdx < CURRICULUM.words.length) {
        return { type: 'word', data: CURRICULUM.words[wordIdx], index: wordIdx };
      }
      return null;
    }

    if (stage === 5) {
      var sentCount = l.sentencesCompleted || 0;
      if (sentCount < CURRICULUM.sentences.length) {
        return { type: 'sentence', data: CURRICULUM.sentences[sentCount], index: sentCount };
      }
      return null;
    }

    return null;
  },

  // Open learning popup overlay
  // options: { showProgress: bool, activity: object }
  openPopup: function(content, options) {
    var self = this;
    var opts = options || {};

    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'learning-overlay';
      this.overlayEl.onclick = function(e) {
        if (e.target === Learning.overlayEl) return;
      };
      document.body.appendChild(this.overlayEl);
    }
    if (!this.popupEl) {
      this.popupEl = document.createElement('div');
      this.popupEl.className = 'learning-popup';
      this.overlayEl.appendChild(this.popupEl);
    }
    this.popupEl.innerHTML = '';

    // Register activity for cleanup
    if (opts.activity) {
      this._activeActivity = opts.activity;
    }

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.onclick = function() { self.closePopup(); };
    this.popupEl.appendChild(closeBtn);

    // Progress indicator (only for learning activities, not care)
    if (opts.showProgress !== false) {
      var currentSt = typeof getState === 'function' ? getState() : null;
      if (currentSt) {
        var progressEl = this._buildProgressIndicator(currentSt);
        if (progressEl) this.popupEl.appendChild(progressEl);
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

    // Peeking pet
    var peek = document.createElement('div');
    peek.className = 'popup-pet-peek';
    peek.innerHTML = '<div class="peek-eyes"><span class="peek-eye"></span><span class="peek-eye"></span></div><div class="peek-mouth"></div>';
    this.popupEl.appendChild(peek);

    this.overlayEl.classList.add('active');
  },

  _buildProgressIndicator: function(st) {
    var target = this.getCurrentTarget(st);
    if (!target) return null;

    var progressEl = document.createElement('div');
    progressEl.className = 'learning-progress';

    if (target.type === 'wholeWord') {
      var totalW = CURRICULUM.wholeWords.length;
      var doneW = (st.learning.wholeWordsMatched || []).length;
      for (var w = 0; w < totalW; w++) {
        var dotW = document.createElement('span');
        dotW.className = 'progress-dot' + (w < doneW ? ' done' : w === doneW ? ' current' : '');
        progressEl.appendChild(dotW);
      }
    } else if (target.type === 'consonant') {
      var totalC = CURRICULUM.consonants.length;
      var doneC = st.learning.consonantIndex || 0;
      for (var c = 0; c < totalC; c++) {
        var dotC = document.createElement('span');
        dotC.className = 'progress-dot' + (c < doneC ? ' done' : c === doneC ? ' current' : '');
        progressEl.appendChild(dotC);
      }
    } else if (target.type === 'vowel') {
      var totalV = CURRICULUM.vowels.length;
      var doneV = st.learning.vowelIndex || 0;
      for (var v = 0; v < totalV; v++) {
        var dotV = document.createElement('span');
        dotV.className = 'progress-dot' + (v < doneV ? ' done' : v === doneV ? ' current' : '');
        progressEl.appendChild(dotV);
      }
    } else if (target.type === 'syllable') {
      var countEl = document.createElement('span');
      countEl.className = 'progress-word-count';
      countEl.textContent = (st.learning.syllablesCompleted || 0) + '/' + CURRICULUM.syllables.length;
      progressEl.appendChild(countEl);
    } else if (target.type === 'word') {
      var countWd = document.createElement('span');
      countWd.className = 'progress-word-count';
      countWd.textContent = ((st.learning.completedWords || []).length) + '/' + CURRICULUM.words.length;
      progressEl.appendChild(countWd);
    } else if (target.type === 'sentence') {
      var countSt = document.createElement('span');
      countSt.className = 'progress-word-count';
      countSt.textContent = (st.learning.sentencesCompleted || 0) + '/' + CURRICULUM.sentences.length;
      progressEl.appendChild(countSt);
    }

    return progressEl;
  },

  closePopup: function() {
    // 세션 카운터 리셋
    this._sessionActivities = 0;
    this._justPlayedMinigame = false;

    // Cancel pending timers to prevent stale state mutations
    if (this._rewardTimer) { clearTimeout(this._rewardTimer); this._rewardTimer = null; }
    if (this._recapTimer) { clearTimeout(this._recapTimer); this._recapTimer = null; }

    // Notify active activity to cleanup (timers, listeners)
    if (this._activeActivity && typeof this._activeActivity._cleanup === 'function') {
      this._activeActivity._cleanup();
      this._activeActivity = null;
    }

    // Clear DOM content to prevent memory leaks (closures over st)
    if (this.popupEl) {
      this.popupEl.innerHTML = '';
    }
    if (this.overlayEl) {
      this.overlayEl.classList.remove('active');
    }
    var currentSt = typeof refreshState === 'function' ? refreshState() : (typeof getState === 'function' ? getState() : null);
    if (currentSt && typeof updateHome === 'function') {
      updateHome(currentSt);
    }
    if (typeof currentScreen !== 'undefined' && currentScreen === 'learning') {
      if (typeof showScreen === 'function') showScreen('home');
      if (typeof PetRenderer !== 'undefined') {
        if (PetRenderer.container) PetRenderer.container.visible = true;
        if (PetRenderer.walkOnScreen) PetRenderer.walkOnScreen('left');
      }
    }
  },

  // Main entry: start a learning session
  startLearning: function(st) {
    this._syncStage(st);
    this._sessionCount++;
    // 새 세션 시작 시 활동 카운터 리셋 (연장 시에는 리셋하지 않음)
    if (this._sessionActivities === 0) {
      this._lastPicks = [];
      this._justPlayedMinigame = false;
    }

    // DEBUG: 학습 상태 추적
    console.log('[Learning] stage=' + st.learning.stage +
      ' intIdx=' + (st.learning.interleavedIndex || 0) +
      ' newSinceReview=' + (st.learning.newSinceReview || 0) +
      ' sessionAct=' + this._sessionActivities +
      ' lastPicks=' + JSON.stringify(this._lastPicks));

    // Initialize practiceLog and newSinceReview counter if missing
    if (!st.learning.practiceLog) st.learning.practiceLog = {};
    if (typeof st.learning.newSinceReview !== 'number') st.learning.newSinceReview = 0;

    var target = this.getCurrentTarget(st);
    var reviewableCount = this._countReviewableItems(st);

    if (!target && reviewableCount === 0) return;

    // No more new content → review only
    if (!target) {
      this._startReview(st);
      return;
    }

    // Smart interleaving: learn N new items, then review, repeat
    // This prevents "always same thing" boredom by mixing new + review
    if (reviewableCount >= 2 && st.learning.newSinceReview >= this._NEW_BEFORE_REVIEW) {
      st.learning.newSinceReview = 0;
      saveState(st);
      console.log('[Learning] → REVIEW (reviewable=' + reviewableCount + ')');
      this._startReview(st);
      return;
    }

    // Dispatch new content
    console.log('[Learning] → NEW target=' + target.type + ':' + (target.data.letter || target.data.word || target.data.syllable || ''));
    this._dispatchActivity(st, target);
  },

  _countReviewableItems: function(st) {
    var letters = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    var words = st.learning.completedWords || [];
    return letters.length + words.length;
  },

  _hasReviewableItems: function(st) {
    return this._countReviewableItems(st) >= 1;
  },

  // Dispatch to stage-appropriate activity
  _dispatchActivity: function(st, target) {
    var stage = st.learning.stage || 0;

    // Stage 0: Sound matching
    if (stage === 0) {
      if (typeof SoundMatchActivity !== 'undefined') {
        this._activeActivity = SoundMatchActivity;
        SoundMatchActivity.start(st, target);
      } else {
        // Temporary fallback: auto-complete wholeWord and advance
        this._fallbackWholeWord(st, target);
      }
      return;
    }

    // Stage 1: Letter hunt (자음+모음 인터리브)
    if (stage === 1) {
      if (typeof LetterHuntActivity !== 'undefined') {
        this._activeActivity = LetterHuntActivity;
        LetterHuntActivity.start(st, target);
      } else if (typeof LetterActivity !== 'undefined') {
        LetterActivity.start(st, target);
      }
      return;
    }

    // Stage 3: Syllable factory
    if (stage === 3) {
      if (typeof SyllableFactoryActivity !== 'undefined') {
        this._activeActivity = SyllableFactoryActivity;
        SyllableFactoryActivity.start(st, target);
      } else {
        // Temporary fallback: auto-complete syllable
        this._fallbackSyllable(st, target);
      }
      return;
    }

    // Stage 4: Word games
    if (stage === 4) {
      if (typeof WordGamesActivity !== 'undefined') {
        this._activeActivity = WordGamesActivity;
        WordGamesActivity.start(st, target);
      } else if (typeof PuzzleActivity !== 'undefined') {
        PuzzleActivity.start(st, target.data);
      }
      return;
    }

    // Stage 5: Sentence builder
    if (stage === 5) {
      if (typeof SentenceBuilderActivity !== 'undefined') {
        this._activeActivity = SentenceBuilderActivity;
        SentenceBuilderActivity.start(st, target);
      } else {
        // Temporary fallback: auto-complete sentence
        this._fallbackSentence(st, target);
      }
      return;
    }
  },

  // Temporary fallbacks for stages without Activity files yet (Phase 2)
  _fallbackWholeWord: function(st, target) {
    var self = this;
    var word = target.data.word;
    if (!st.learning.wholeWordsMatched) st.learning.wholeWordsMatched = [];
    if (st.learning.wholeWordsMatched.indexOf(word) === -1) {
      st.learning.wholeWordsMatched.push(word);
    }
    saveState(st);
    var praises = ['잘했어!', '멋져!'];
    this._showReward(st, word, praises[Math.floor(Math.random() * praises.length)],
      'correct', word, 'star', 10, 5);
  },

  _fallbackSyllable: function(st, target) {
    st.learning.syllablesCompleted = (st.learning.syllablesCompleted || 0) + 1;
    saveState(st);
    var syl = target.data.syllable;
    this._showReward(st, syl, '음절을 만들었어!', 'correct', syl, 'star', 10, 8);
  },

  _fallbackSentence: function(st, target) {
    st.learning.sentencesCompleted = (st.learning.sentencesCompleted || 0) + 1;
    saveState(st);
    this._showReward(st, target.data.text, '문장 완성!', 'correct', target.data.text, 'note', 15, 10);
  },

  // Smart review — mix recently learned + overdue items to prevent boredom
  _startReview: function(st) {
    if (!st.learning.practiceLog) st.learning.practiceLog = {};
    var pl = st.learning.practiceLog;
    var now = Date.now();
    var DAY_MS = 86400000;
    var RECENT_MS = 10 * 60 * 1000; // 10분 이내 = "방금 배운 것"

    var allLetters = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    var allWords = st.learning.completedWords || [];
    var recentItems = [];  // 최근 배운 것 (복습 우선)
    var olderItems = [];   // 오래된 것 (가끔 섞기)

    var i, key, entry, daysSince, timeSince;

    // Categorize items into recent vs older
    for (i = 0; i < allLetters.length; i++) {
      key = allLetters[i];
      entry = pl[key] || { count: 0, lastPracticed: 0, interval: 0 };
      timeSince = now - (entry.lastPracticed || 0);
      daysSince = timeSince / DAY_MS;
      var item = {
        key: key,
        type: 'letter',
        overdue: daysSince - (entry.interval || 0),
        count: entry.count || 0,
        timeSince: timeSince
      };
      if (entry.count <= 2 || timeSince < RECENT_MS) {
        recentItems.push(item);
      } else {
        olderItems.push(item);
      }
    }
    for (i = 0; i < allWords.length; i++) {
      key = allWords[i];
      entry = pl[key] || { count: 0, lastPracticed: 0, interval: 0 };
      timeSince = now - (entry.lastPracticed || 0);
      daysSince = timeSince / DAY_MS;
      var wItem = {
        key: key,
        type: 'word',
        overdue: daysSince - (entry.interval || 0),
        count: entry.count || 0,
        timeSince: timeSince
      };
      if (entry.count <= 2 || timeSince < RECENT_MS) {
        recentItems.push(wItem);
      } else {
        olderItems.push(wItem);
      }
    }

    // 직전 복습 항목 제외 (연속 반복 방지)
    var lastPicks = this._lastPicks || [];
    if (lastPicks.length > 0) {
      recentItems = recentItems.filter(function(it) { return lastPicks.indexOf(it.key) === -1; });
      olderItems = olderItems.filter(function(it) { return lastPicks.indexOf(it.key) === -1; });
    }

    // 필터 후 복습 대상 없으면 새 학습으로 폴백
    if (recentItems.length === 0 && olderItems.length === 0) {
      var target = this.getCurrentTarget(st);
      if (target) this._dispatchActivity(st, target);
      return;
    }

    // Sort recent: least practiced first (reinforce new learning)
    recentItems.sort(function(a, b) {
      var countD = a.count - b.count;
      if (countD !== 0) return countD;
      return b.timeSince - a.timeSince; // 더 오래된 것 우선 (잊힐 가능성 높은 것부터)
    });

    // Sort older: most overdue first (spaced repetition)
    olderItems.sort(function(a, b) {
      var overdueD = b.overdue - a.overdue;
      if (Math.abs(overdueD) > 0.5) return overdueD;
      return a.count - b.count;
    });

    // Pick strategy: 75% recent, 25% older (prevents only reviewing old stuff)
    var pick;
    var useRecent = recentItems.length > 0 && (olderItems.length === 0 || Math.random() < 0.75);
    if (useRecent) {
      // Pick randomly from top half of recent items for variety
      var recentRange = Math.max(1, Math.ceil(recentItems.length / 2));
      pick = recentItems[Math.floor(Math.random() * recentRange)];
    } else {
      var olderRange = Math.max(1, Math.ceil(olderItems.length / 3));
      pick = olderItems[Math.floor(Math.random() * olderRange)];
    }

    // _lastPicks 갱신은 onLetterComplete/onWordComplete에서 일괄 처리
    console.log('[Review] pick=' + pick.key + ' type=' + pick.type + ' count=' + pick.count + ' excluded=' + JSON.stringify(lastPicks));

    // practiceLog는 활동 완료 시 onLetterComplete/onWordComplete에서 업데이트
    // (시작 시 count++ 하면 미완료도 카운트되는 문제 방지)

    if (pick.type === 'word') {
      var wordData = null;
      for (var wi = 0; wi < CURRICULUM.words.length; wi++) {
        if (CURRICULUM.words[wi].word === pick.key) { wordData = CURRICULUM.words[wi]; break; }
      }
      if (wordData) {
        if (typeof PuzzleActivity !== 'undefined') {
          PuzzleActivity.start(st, wordData);
        }
      }
    } else {
      var isConsonant = (st.learning.knownConsonants || []).indexOf(pick.key) !== -1;
      var pool = isConsonant ? CURRICULUM.consonants : CURRICULUM.vowels;
      // Also check bonus pools
      if (!pool) pool = [];
      var letterData = null;
      for (var li = 0; li < pool.length; li++) {
        if (pool[li].letter === pick.key) { letterData = pool[li]; break; }
      }
      if (!letterData) {
        var bonusPool = isConsonant ? CURRICULUM.bonusConsonants : CURRICULUM.bonusVowels;
        for (var bi = 0; bi < bonusPool.length; bi++) {
          if (bonusPool[bi].letter === pick.key) { letterData = bonusPool[bi]; break; }
        }
      }
      if (letterData) {
        var target = { type: isConsonant ? 'consonant' : 'vowel', data: letterData, index: 0, review: true, reviewLight: true };
        if (typeof LetterHuntActivity !== 'undefined') {
          this._activeActivity = LetterHuntActivity;
          LetterHuntActivity.start(st, target);
        } else if (typeof LetterActivity !== 'undefined') {
          LetterActivity.start(st, target);
        }
      }
    }
  },

  // Reward sequence → continue prompt (session-limited)
  _showReward: function(st, displayText, praise, soundType, speechText, particleType, hungerBonus, moodBonus) {
    var self = this;
    this._sessionActivities++;
    var prevStage = st.stage;
    this._checkEvolution(st);
    var didEvolve = st.stage > prevStage;

    saveState(st);
    if (typeof updateHome === 'function') updateHome(st);

    // Build reward UI with createElement (no innerHTML for safety + perf)
    var rewardEl = document.createElement('div');
    rewardEl.className = 'reward-container';

    var letterDiv = document.createElement('div');
    letterDiv.className = 'reward-letter';
    if (displayText.length > 4) letterDiv.classList.add('reward-letter--small');
    letterDiv.textContent = displayText;
    rewardEl.appendChild(letterDiv);

    var praiseDiv = document.createElement('div');
    praiseDiv.className = 'reward-praise';
    praiseDiv.textContent = praise;
    rewardEl.appendChild(praiseDiv);

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

    // After reward animation → re-read fresh state to avoid stale closure
    this._rewardTimer = setTimeout(function() {
      self._rewardTimer = null;
      if (typeof PetRenderer !== 'undefined') {
        if (PetRenderer.celebrate) PetRenderer.celebrate();
        if (PetRenderer.emitParticles) PetRenderer.emitParticles(particleType, 5);
        if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('잘했어!', 120);
      }
      // Sync module st from localStorage to get latest learning progress
      var fresh = (typeof refreshState === 'function') ? refreshState() : st;
      fresh.hunger = Math.min(100, fresh.hunger + hungerBonus);
      fresh.mood = Math.min(100, fresh.mood + moodBonus);
      fresh.daily.activitiesDone++;
      saveState(fresh);

      self._showContinuePrompt(fresh);
    }, 1500);
  },

  // Session-limited: minigame check -> continue prompt
  _showContinuePrompt: function(st) {
    var self = this;

    // 미니게임 삽입: 짝수 번째 활동 후 + 배운 글자 2개 이상 + 직전에 미니게임 안 했으면
    var knownCount = ((st.learning.knownConsonants || []).length + (st.learning.knownVowels || []).length);
    var shouldPlayMinigame = (
      this._sessionActivities > 0 &&
      this._sessionActivities % 2 === 0 &&
      !this._justPlayedMinigame &&
      typeof LetterRainGame !== 'undefined' &&
      knownCount >= 2
    );

    if (shouldPlayMinigame) {
      this._justPlayedMinigame = true;
      LetterRainGame.start(st, function(stars) {
        st.stars = (st.stars || 0) + stars;
        saveState(st);
        self._showContinuePromptUI(st);
      });
      return;
    }

    this._justPlayedMinigame = false;
    this._showContinuePromptUI(st);
  },

  // Session-limited: "더 놀래?" or session-end prompt
  _showContinuePromptUI: function(st) {
    var self = this;
    if (!this.popupEl) {
      this.closePopup();
      return;
    }

    this.popupEl.innerHTML = '';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.onclick = function() { self._sessionActivities = 0; self.closePopup(); };
    this.popupEl.appendChild(closeBtn);

    var container = document.createElement('div');
    container.className = 'continue-container';

    var reachedLimit = this._sessionActivities >= this._SESSION_LIMIT;

    var petFace = document.createElement('div');
    petFace.className = 'continue-face';
    petFace.textContent = reachedLimit ? '^o^' : '^_^';
    container.appendChild(petFace);

    var msg = document.createElement('div');
    msg.className = 'continue-msg';
    msg.textContent = reachedLimit ? '오늘 많이 배웠어!' : '더 놀래?';
    container.appendChild(msg);

    if (reachedLimit) {
      var subMsg = document.createElement('div');
      subMsg.className = 'continue-sub-msg';
      subMsg.textContent = '잠시 쉬고 다시 오자~';
      container.appendChild(subMsg);
    }

    var btnContainer = document.createElement('div');
    btnContainer.className = 'continue-buttons';

    if (reachedLimit) {
      // 세션 종료: 쉬기(기본) + 조금 더(연장)
      var btnRest = document.createElement('button');
      btnRest.className = 'continue-btn continue-btn--primary';
      btnRest.innerHTML = '<span class="continue-btn-icon">\u2302</span><span class="continue-btn-label">\uC26C\uAE30</span>';
      btnRest.onclick = function() {
        self._sessionActivities = 0;
        self.closePopup();
        if (typeof updateHome === 'function') updateHome(st);
      };
      btnContainer.appendChild(btnRest);

      var btnMore = document.createElement('button');
      btnMore.className = 'continue-btn continue-btn--secondary';
      btnMore.innerHTML = '<span class="continue-btn-icon">\u25B6</span><span class="continue-btn-label">\uC870\uAE08 \uB354</span>';
      btnMore.onclick = function() {
        // 연장: 카운터를 절반으로 리셋 (2회 더 가능)
        self._sessionActivities = Math.floor(self._SESSION_LIMIT / 2);
        var latest = (typeof refreshState === 'function') ? refreshState() : st;
        self.startLearning(latest);
      };
      btnContainer.appendChild(btnMore);
    } else {
      // 일반: 더 배우기(기본) + 쉬기
      var btnContinue = document.createElement('button');
      btnContinue.className = 'continue-btn continue-btn--primary';
      btnContinue.innerHTML = '<span class="continue-btn-icon">\u25B6</span><span class="continue-btn-label">\uB354 \uBC30\uC6B0\uAE30</span>';
      btnContinue.onclick = function() {
        var latest = (typeof refreshState === 'function') ? refreshState() : st;
        self.startLearning(latest);
      };
      btnContainer.appendChild(btnContinue);

      var btnRest2 = document.createElement('button');
      btnRest2.className = 'continue-btn continue-btn--secondary';
      btnRest2.innerHTML = '<span class="continue-btn-icon">\u2302</span><span class="continue-btn-label">\uC26C\uAE30</span>';
      btnRest2.onclick = function() {
        self._sessionActivities = 0;
        self.closePopup();
        if (typeof updateHome === 'function') updateHome(st);
      };
      btnContainer.appendChild(btnRest2);
    }

    container.appendChild(btnContainer);
    this.popupEl.appendChild(container);

    if (typeof speakText === 'function') {
      speakText(reachedLimit ? '오늘 많이 배웠어!' : '더 놀래?');
    }
  },

  // Called when a letter is learned
  onLetterComplete: function(st, target) {
    var letter = target.data.letter;
    var isNew = false;
    if (target.type === 'consonant') {
      if (st.learning.knownConsonants.indexOf(letter) === -1) {
        st.learning.knownConsonants.push(letter);
      }
      if (!target.review) { st.learning.consonantIndex++; st.learning.interleavedIndex = (st.learning.interleavedIndex || 0) + 1; isNew = true; }
    } else {
      if (st.learning.knownVowels.indexOf(letter) === -1) {
        st.learning.knownVowels.push(letter);
      }
      if (!target.review) { st.learning.vowelIndex++; st.learning.interleavedIndex = (st.learning.interleavedIndex || 0) + 1; isNew = true; }
    }
    // Track new items learned since last review
    if (isNew) {
      st.learning.newSinceReview = (st.learning.newSinceReview || 0) + 1;
    }

    // 방금 배운/복습한 글자를 _lastPicks에 추가 (복습 시 연속 반복 방지)
    if (!this._lastPicks) this._lastPicks = [];
    this._lastPicks.push(letter);
    if (this._lastPicks.length > 2) this._lastPicks.shift();

    // 복습 완료 시 practiceLog 업데이트 (완료 시점에서만 count 증가)
    if (!st.learning.practiceLog) st.learning.practiceLog = {};
    var pl = st.learning.practiceLog;
    var logEntry = pl[letter] || { count: 0, lastPracticed: 0, interval: 0 };
    logEntry.count = (logEntry.count || 0) + 1;
    logEntry.lastPracticed = Date.now();
    var intervals = [0, 1, 3, 7, 14];
    var nextIdx = Math.min(logEntry.count, intervals.length - 1);
    logEntry.interval = intervals[nextIdx];
    pl[letter] = logEntry;

    if (typeof World !== 'undefined') World.addLetterFlower(letter, true);

    // Stage complete -> show recap (인터리브 전체 완료 시)
    if (!target.review && (st.learning.interleavedIndex || 0) >= CURRICULUM.interleaved.length) {
      saveState(st);
      this._showStageRecap(st, 'interleaved');
      return;
    }

    // 마이크로 마일스톤: 중간 성취감 제공
    var milestone = this._checkMicroMilestone(st, target.type);
    var praises = ['잘했어!', '멋져!', '최고야!', '대단해!'];
    var praise = milestone ? milestone : praises[Math.floor(Math.random() * praises.length)];
    var sound = milestone ? 'evolve' : 'correct';
    this._showReward(st, letter, praise, sound, target.data.sound, 'star', 15, 10);
  },

  // interleavedIndex 기반 마일스톤 메시지 반환
  _checkMicroMilestone: function(st, type) {
    var intIdx = st.learning.interleavedIndex || 0;
    // 첫 음절 완성 (자음 1개 + 모음 1개 = intIdx 2)
    if (intIdx === 2) return '첫 음절 완성! "가"를 만들 수 있어!';
    // 5개 완료
    if (intIdx === 5) return '벌써 5개! 펫이 옹알이 시작!';
    // 10개 완료
    if (intIdx === 10) return '10개 달성! 거의 다 왔어!';
    return null;
  },

  // Show recap grid when all letters in a stage are learned
  _showStageRecap: function(st, type) {
    var self = this;
    var letters = type === 'interleaved'
      ? (st.learning.knownConsonants || []).concat(st.learning.knownVowels || [])
      : type === 'consonant' ? st.learning.knownConsonants : st.learning.knownVowels;

    var container = document.createElement('div');
    container.className = 'letter-activity';

    var title = document.createElement('div');
    title.className = 'recap-title';
    title.textContent = type === 'interleaved' ? '글자 완료!' : type === 'consonant' ? '자음 완료!' : '모음 완료!';
    container.appendChild(title);

    var subtitle = document.createElement('div');
    subtitle.className = 'recap-subtitle';
    subtitle.textContent = '배운 글자를 눌러보세요';
    container.appendChild(subtitle);

    // Use event delegation on the grid instead of per-cell handlers
    var grid = document.createElement('div');
    grid.className = 'recap-grid';
    grid.onclick = function(e) {
      var cell = e.target.closest('.distinguish-choice');
      if (!cell) return;
      var ltr = cell.textContent;
      var allPool = CURRICULUM.consonants
        .concat(CURRICULUM.bonusConsonants || [])
        .concat(CURRICULUM.vowels)
        .concat(CURRICULUM.bonusVowels || []);
      for (var pi = 0; pi < allPool.length; pi++) {
        if (allPool[pi].letter === ltr) { speakText(allPool[pi].sound, 0.7); break; }
      }
    };

    for (var i = 0; i < letters.length; i++) {
      var cell = document.createElement('div');
      cell.className = 'distinguish-choice choice-correct';
      cell.textContent = letters[i];
      cell.style.animationDelay = (i * 0.1) + 's';
      grid.appendChild(cell);
    }
    container.appendChild(grid);

    self.popupEl.innerHTML = '';
    self.popupEl.appendChild(container);

    if (typeof showCelebration === 'function') {
      showCelebration(window.innerWidth / 2, window.innerHeight / 2);
    }
    playSound('evolve');

    // Store timer for cleanup on early close
    this._recapTimer = setTimeout(function() {
      self._recapTimer = null;
      // Re-read fresh state
      var fresh = (typeof refreshState === 'function') ? refreshState() : st;
      if (!fresh) fresh = st;

      fresh.learning.stage = 3;
      fresh.learning.syllablesCompleted = fresh.learning.syllablesCompleted || 0;
      if (typeof PetRenderer !== 'undefined' && PetRenderer.celebrate) {
        PetRenderer.celebrate();
      }
      fresh.hunger = Math.min(100, fresh.hunger + 15);
      fresh.mood = Math.min(100, fresh.mood + 10);
      saveState(fresh);

      self._showContinuePrompt(fresh);
    }, 3500);
  },

  // Called when a word is completed
  onWordComplete: function(st, wordData) {
    var isNew = st.learning.completedWords.indexOf(wordData.word) === -1;
    if (isNew) {
      st.learning.completedWords.push(wordData.word);
      st.learning.newSinceReview = (st.learning.newSinceReview || 0) + 1;
    }
    st.learning.wordIndex++;

    // 방금 완료한 단어를 _lastPicks에 추가 (복습 시 연속 반복 방지)
    if (!this._lastPicks) this._lastPicks = [];
    this._lastPicks.push(wordData.word);
    if (this._lastPicks.length > 2) this._lastPicks.shift();

    // practiceLog 업데이트 (완료 시점)
    if (!st.learning.practiceLog) st.learning.practiceLog = {};
    var pl = st.learning.practiceLog;
    var wLog = pl[wordData.word] || { count: 0, lastPracticed: 0, interval: 0 };
    wLog.count = (wLog.count || 0) + 1;
    wLog.lastPracticed = Date.now();
    var intervals = [0, 1, 3, 7, 14];
    wLog.interval = intervals[Math.min(wLog.count, intervals.length - 1)];
    pl[wordData.word] = wLog;

    if (typeof World !== 'undefined') World.addWordFlower(wordData.word);

    var wordPraises = ['새로운 말을 배웠어!', '또 하나 배웠다!', '점점 잘하고 있어!', '너무 잘해!'];
    var wPraise = wordPraises[Math.floor(Math.random() * wordPraises.length)];
    this._showReward(st, wordData.word, wPraise, 'correct', wordData.word, 'note', 20, 15);
  },

  // Called when a syllable combination is completed (Stage 3)
  onSyllableComplete: function(st, syllableData) {
    st.learning.syllablesCompleted = (st.learning.syllablesCompleted || 0) + 1;
    st.learning.newSinceReview = (st.learning.newSinceReview || 0) + 1;
    saveState(st);

    var praises = ['음절을 만들었어!', '조합 성공!', '잘 만들었어!'];
    var praise = praises[Math.floor(Math.random() * praises.length)];
    this._showReward(st, syllableData.syllable, praise, 'correct', syllableData.syllable, 'star', 12, 8);
  },

  // Called when a sentence is completed (Stage 5)
  onSentenceComplete: function(st, sentenceData) {
    st.learning.sentencesCompleted = (st.learning.sentencesCompleted || 0) + 1;
    st.learning.newSinceReview = (st.learning.newSinceReview || 0) + 1;
    saveState(st);

    this._showReward(st, sentenceData.text, '문장 완성!', 'correct', sentenceData.text, 'note', 15, 12);
  },

  // Called when a whole word is matched (Stage 0)
  onWholeWordComplete: function(st, wordData) {
    if (!st.learning.wholeWordsMatched) st.learning.wholeWordsMatched = [];
    var isNew = st.learning.wholeWordsMatched.indexOf(wordData.word) === -1;
    if (isNew) {
      st.learning.wholeWordsMatched.push(wordData.word);
      st.learning.newSinceReview = (st.learning.newSinceReview || 0) + 1;
    }
    saveState(st);

    var praises = ['맞았어!', '잘했어!', '그래, 그거야!'];
    var praise = praises[Math.floor(Math.random() * praises.length)];
    this._showReward(st, wordData.word, praise, 'correct', wordData.word, 'star', 10, 8);
  },

  _checkEvolution: function(st) {
    // Defensive null guards for potentially undefined arrays
    var consCount = (st.learning.knownConsonants || []).length;
    var vowCount = (st.learning.knownVowels || []).length;
    var wordCount = (st.learning.completedWords || []).length;

    var th = typeof EVO_THRESHOLDS !== 'undefined' ? EVO_THRESHOLDS : { consonants: 9, vowels: 6, words4: 10, words5: 15 };
    var newStage = st.stage;
    if (wordCount >= th.words5) newStage = 5;
    else if (wordCount >= th.words4) newStage = 4;
    else if (vowCount >= th.vowels) newStage = 3;
    else if (consCount >= th.consonants) newStage = 2;
    else if (st.stage >= 1) newStage = st.stage;

    if (newStage > st.stage) {
      st.stage = newStage;

      if (typeof PetRenderer !== 'undefined' && PetRenderer.playEvolution) {
        PetRenderer.playEvolution(newStage);
      } else {
        playSound('evolve');
        if (typeof PetRenderer !== 'undefined') {
          PetRenderer.buildPet(newStage);
        }
      }

      this._showEvolutionName(newStage);
    }
  },

  // Show floating stage name after evolution animation (separated for cleanup)
  _showEvolutionName: function(newStage) {
    var self = this;

    // Cancel any previous evolution ticker to prevent overlap
    if (this._evoTicker && typeof PetRenderer !== 'undefined' && PetRenderer._app) {
      PetRenderer._app.ticker.remove(this._evoTicker);
      this._evoTicker = null;
    }

    setTimeout(function() {
      if (typeof PetRenderer === 'undefined' || !PetRenderer._app || !PetRenderer.container || typeof PET_STAGES === 'undefined') return;

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

      self._evoTicker = function() {
        nameText.y -= 0.4;
        nameText._life--;
        if (nameText._life < 30) nameText.alpha -= 0.033;
        if (nameText._life <= 0) {
          PetRenderer._app.stage.removeChild(nameText);
          PetRenderer._app.ticker.remove(self._evoTicker);
          self._evoTicker = null;
          // Destroy both Text and TextStyle to prevent memory leak
          nameText.destroy(true);
          nameStyle.destroy();
        }
      };
      PetRenderer._app.ticker.add(self._evoTicker);
    }, 3500);
  }
};
