// js/activities/care.js
// Mini-game interactions for feed, sleep, wake, wash actions
// Hangul elements integrated (non-blocking: Stage 1+, auto-advance 3s, bonus mood +5)
// Uses Learning popup overlay for display

var CareActivity = {
  _timers: [],

  _cleanup: function() {
    for (var i = 0; i < this._timers.length; i++) {
      clearTimeout(this._timers[i]);
    }
    this._timers = [];
  },

  _setTimeout: function(fn, ms) {
    var id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  },

  // Get a random known letter for hangul bonus challenge
  _getHangulChallenge: function(st) {
    var l = st.learning;
    if (!l || (l.stage || 0) < 1) return null;
    var known = (l.knownConsonants || []).concat(l.knownVowels || []);
    if (known.length < 2) return null;

    var correct = known[Math.floor(Math.random() * known.length)];
    var distractor;
    do {
      distractor = known[Math.floor(Math.random() * known.length)];
    } while (distractor === correct && known.length > 1);

    return { correct: correct, distractor: distractor };
  },

  // Render a hangul bonus mini-challenge inside a container
  // Returns: onComplete callback holder
  _renderHangulBonus: function(st, parentEl, onCorrect, onTimeout) {
    var self = this;
    var challenge = this._getHangulChallenge(st);
    if (!challenge) {
      onTimeout();
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'care-hangul-bonus';

    var prompt = document.createElement('div');
    prompt.className = 'care-hangul-prompt';
    prompt.textContent = '"' + challenge.correct + '" 를 찾아봐!';
    wrap.appendChild(prompt);

    var choices = Math.random() < 0.5
      ? [challenge.correct, challenge.distractor]
      : [challenge.distractor, challenge.correct];

    var choiceRow = document.createElement('div');
    choiceRow.className = 'care-hangul-choices';
    var answered = false;

    choiceRow.onclick = function(e) {
      var btn = e.target.closest('.care-hangul-btn');
      if (!btn || answered) return;
      answered = true;

      if (btn.getAttribute('data-letter') === challenge.correct) {
        btn.classList.add('choice-correct');
        st.mood = Math.min(100, st.mood + 5);
        playSound('click');
        onCorrect();
      } else {
        btn.classList.add('choice-wrong');
        // Show correct answer briefly, then proceed
        self._setTimeout(function() {
          var btns = choiceRow.querySelectorAll('.care-hangul-btn');
          for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-letter') === challenge.correct) {
              btns[i].classList.add('choice-correct');
            }
          }
          self._setTimeout(onTimeout, 800);
        }, 500);
      }
    };

    for (var i = 0; i < choices.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'care-hangul-btn';
      btn.setAttribute('data-letter', choices[i]);
      btn.textContent = choices[i];
      choiceRow.appendChild(btn);
    }
    wrap.appendChild(choiceRow);
    parentEl.appendChild(wrap);

    // Auto-advance after 3 seconds (non-blocking)
    this._setTimeout(function() {
      if (!answered) {
        answered = true;
        onTimeout();
      }
    }, 3000);

    speakText(challenge.correct, 0.7);
  },

  // === FEED: Pick food → hangul bonus → feed animation ===
  startFeed: function(st) {
    this._cleanup();
    var self = this;
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '뭘 먹을까?';
    container.appendChild(label);

    var foods = [
      { icon: '\uD83C\uDF5A', name: '밥', boost: 25 },
      { icon: '\uD83C\uDF5C', name: '국', boost: 20 },
      { icon: '\uD83C\uDF4E', name: '과일', boost: 15 }
    ];

    var foodGrid = document.createElement('div');
    foodGrid.className = 'care-food-grid';
    foodGrid.onclick = function(e) {
      var btn = e.target.closest('.care-food-btn');
      if (!btn || btn.disabled) return;
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      var btns = foodGrid.querySelectorAll('.care-food-btn');
      for (var b = 0; b < btns.length; b++) btns[b].disabled = true;
      btn.classList.add('care-food-selected');
      self._feedOnHomeScreen(st, foods[idx]);
    };

    for (var i = 0; i < foods.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'care-food-btn';
      btn.setAttribute('data-idx', i);
      var iconEl = document.createElement('span');
      iconEl.className = 'care-food-icon';
      iconEl.textContent = foods[i].icon;
      btn.appendChild(iconEl);
      var nameEl = document.createElement('span');
      nameEl.className = 'care-food-name';
      nameEl.textContent = foods[i].name;
      btn.appendChild(nameEl);
      foodGrid.appendChild(btn);
    }
    container.appendChild(foodGrid);

    Learning.openPopup(container, { showProgress: false, activity: CareActivity });
    speakText('뭘 먹을까?', 0.75);
  },

  // Close popup → play feed animation on home screen via PetRenderer
  _feedOnHomeScreen: function(st, food) {
    var self = this;

    // Close popup immediately → return to home
    Learning.closePopup();
    updateHome(st);

    // Trigger PixiJS feed animation with the selected food emoji
    self._setTimeout(function() {
      if (typeof PetRenderer !== 'undefined' && PetRenderer.feedAnim) {
        PetRenderer.feedAnim(food.icon);
      }
      playSound('click');
    }, 300);

    // After walk+eat animation (~2.5s), apply hunger boost + update HUD
    self._setTimeout(function() {
      st.hunger = Math.min(100, st.hunger + food.boost);
      st.mood = Math.min(100, st.mood + 8);
      saveState(st);
      updateHome(st);
      playSound('correct');
    }, 2500);
  },

  // === SLEEP: Tap stars (with hangul on stars for Stage 1+) ===
  startSleep: function(st) {
    this._cleanup();
    var self = this;
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '별을 눌러서 재워주자!';
    container.appendChild(label);

    var starField = document.createElement('div');
    starField.className = 'care-star-field';

    var tappedCount = 0;
    var totalStars = 5;
    var challenge = this._getHangulChallenge(st);

    // Event delegation on star field
    starField.onclick = function(e) {
      var starEl = e.target.closest('.care-star');
      if (!starEl || starEl.classList.contains('care-star-tapped')) return;

      starEl.classList.add('care-star-tapped');
      starEl.textContent = '\u2B50';
      playSound('click');
      tappedCount++;

      var ctx = getAudioCtx();
      if (ctx) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 400 + tappedCount * 80;
        osc.type = 'sine';
        gain.gain.value = 0.12;
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        osc.onended = function() { osc.disconnect(); gain.disconnect(); };
      }

      if (tappedCount >= totalStars) {
        self._setTimeout(function() {
          self._finishSleep(st, container);
        }, 500);
      }
    };

    for (var i = 0; i < totalStars; i++) {
      var star = document.createElement('div');
      star.className = 'care-star';
      // Show learned letters on stars (non-blocking visual)
      if (challenge && i < 2) {
        star.textContent = i === 0 ? challenge.correct : challenge.distractor;
        star.classList.add('care-star-letter');
      } else {
        star.textContent = '\u2606';
      }
      star.style.left = (10 + Math.random() * 70) + '%';
      star.style.top = (10 + Math.random() * 60) + '%';
      star.style.animationDelay = (i * 0.3) + 's';
      starField.appendChild(star);
    }
    container.appendChild(starField);

    var moon = document.createElement('div');
    moon.className = 'care-moon';
    moon.textContent = '\uD83C\uDF19';
    container.appendChild(moon);

    Learning.openPopup(container, { showProgress: false, activity: CareActivity });
    speakText('별을 눌러봐!', 0.75);
  },

  _finishSleep: function(st, container) {
    var self = this;
    container.innerHTML = '';
    var sleepEl = document.createElement('div');
    sleepEl.className = 'care-done';
    var icon = document.createElement('div');
    icon.className = 'care-done-icon';
    icon.textContent = '\uD83C\uDF19';
    sleepEl.appendChild(icon);
    var msg = document.createElement('div');
    msg.className = 'care-done-msg care-done-msg--purple';
    msg.textContent = '잘 자~';
    sleepEl.appendChild(msg);
    container.appendChild(sleepEl);

    speakText('잘 자', 0.7);
    st.sleeping = true;
    saveState(st);

    if (typeof PetRenderer !== 'undefined') {
      if (PetRenderer.sleepAnim) PetRenderer.sleepAnim();
      if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('zzz', 180);
    }

    this._setTimeout(function() {
      Learning.closePopup();
      updateHome(st);
    }, 1800);
  },

  // === WAKE: Tap suns (with hangul on suns for Stage 1+) ===
  startWake: function(st) {
    this._cleanup();
    var self = this;
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '해를 눌러서 깨워주자!';
    container.appendChild(label);

    var sunField = document.createElement('div');
    sunField.className = 'care-star-field';

    var tappedCount = 0;
    var totalSuns = 3;
    var challenge = this._getHangulChallenge(st);

    sunField.onclick = function(e) {
      var sunEl = e.target.closest('.care-star');
      if (!sunEl || sunEl.classList.contains('care-star-tapped')) return;

      sunEl.classList.add('care-star-tapped');
      sunEl.style.opacity = '1';
      sunEl.style.transform = 'scale(1.3)';
      playSound('click');
      tappedCount++;

      var overlay = document.querySelector('.learning-overlay');
      if (overlay) {
        var brightness = 0.4 - (tappedCount / totalSuns) * 0.3;
        overlay.style.background = 'rgba(0,0,0,' + brightness + ')';
      }

      if (tappedCount >= totalSuns) {
        self._setTimeout(function() {
          self._finishWake(st, container);
        }, 500);
      }
    };

    for (var i = 0; i < totalSuns; i++) {
      var sun = document.createElement('div');
      sun.className = 'care-star care-sun';
      if (challenge && i < 2) {
        sun.textContent = i === 0 ? challenge.correct : challenge.distractor;
        sun.classList.add('care-star-letter');
      } else {
        sun.textContent = '\u2600\uFE0F';
      }
      sun.style.left = (15 + i * 30) + '%';
      sun.style.top = (20 + Math.random() * 40) + '%';
      sun.style.animationDelay = (i * 0.4) + 's';
      sun.style.opacity = '0.4';
      sunField.appendChild(sun);
    }
    container.appendChild(sunField);

    Learning.openPopup(container, { showProgress: false, activity: CareActivity });
    speakText('해를 눌러봐!', 0.75);
  },

  _finishWake: function(st, container) {
    var self = this;
    container.innerHTML = '';
    var wakeEl = document.createElement('div');
    wakeEl.className = 'care-done';
    var icon = document.createElement('div');
    icon.className = 'care-done-icon';
    icon.textContent = '\u2600\uFE0F';
    wakeEl.appendChild(icon);
    var msg = document.createElement('div');
    msg.className = 'care-done-msg';
    msg.textContent = '좋은 아침!';
    wakeEl.appendChild(msg);
    container.appendChild(wakeEl);

    speakText('좋은 아침!', 0.75);
    st.sleeping = false;
    st.sleepy = Math.max(0, st.sleepy - 30);
    st.mood = Math.min(100, st.mood + 10);
    saveState(st);

    if (typeof PetRenderer !== 'undefined') {
      if (PetRenderer.wakeAnim) PetRenderer.wakeAnim();
      if (PetRenderer.celebrate) PetRenderer.celebrate();
      if (PetRenderer.emitParticles) PetRenderer.emitParticles('star', 5);
      if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('좋은 아침!', 150);
    }

    this._setTimeout(function() {
      Learning.closePopup();
      var ov = document.querySelector('.learning-overlay');
      if (ov) ov.style.background = '';
      updateHome(st);
    }, 1800);
  },

  // === WASH: Tap bubbles (with hangul on bubbles for Stage 1+) ===
  startWash: function(st) {
    this._cleanup();
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '거품을 눌러서 씻겨주자!';
    container.appendChild(label);

    var bubbleField = document.createElement('div');
    bubbleField.className = 'care-star-field';

    var tappedCount = 0;
    var totalBubbles = 6;
    var self = this;
    var challenge = this._getHangulChallenge(st);

    bubbleField.onclick = function(e) {
      var bubbleEl = e.target.closest('.care-star');
      if (!bubbleEl || bubbleEl.classList.contains('care-star-tapped')) return;

      bubbleEl.classList.add('care-star-tapped');
      bubbleEl.textContent = '\u2728';
      playSound('click');
      tappedCount++;

      if (tappedCount >= totalBubbles) {
        self._setTimeout(function() {
          self._finishWash(st, container);
        }, 500);
      }
    };

    for (var i = 0; i < totalBubbles; i++) {
      var bubble = document.createElement('div');
      bubble.className = 'care-star care-bubble';
      if (challenge && i < 2) {
        bubble.textContent = i === 0 ? challenge.correct : challenge.distractor;
        bubble.classList.add('care-star-letter');
      } else {
        bubble.textContent = '\uD83D\uDCA7';
      }
      bubble.style.left = (5 + Math.random() * 75) + '%';
      bubble.style.top = (5 + Math.random() * 65) + '%';
      bubble.style.animationDelay = (i * 0.25) + 's';
      bubbleField.appendChild(bubble);
    }
    container.appendChild(bubbleField);

    Learning.openPopup(container, { showProgress: false, activity: CareActivity });
    speakText('거품을 눌러봐!', 0.75);
  },

  _finishWash: function(st, container) {
    var self = this;
    container.innerHTML = '';
    var doneEl = document.createElement('div');
    doneEl.className = 'care-done';
    var icon = document.createElement('div');
    icon.className = 'care-done-icon';
    icon.textContent = '\u2728';
    doneEl.appendChild(icon);
    var msg = document.createElement('div');
    msg.className = 'care-done-msg care-done-msg--blue';
    msg.textContent = '깨끗해졌다!';
    doneEl.appendChild(msg);
    container.appendChild(doneEl);

    speakText('깨끗해졌다!', 0.75);
    st.mood = Math.min(100, st.mood + 15);
    saveState(st);

    if (typeof PetRenderer !== 'undefined') {
      if (PetRenderer.celebrate) PetRenderer.celebrate();
      if (PetRenderer.emitParticles) PetRenderer.emitParticles('star', 5);
      if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('깨끗!', 150);
    }

    playSound('correct');
    this._setTimeout(function() {
      Learning.closePopup();
      updateHome(st);
    }, 1800);
  }
};
