// js/activities/care.js
// Mini-game interactions for feed, sleep, wake actions
// Uses Learning popup overlay for display

var CareActivity = {

  // === FEED: Pick food → food falls into mouth → pet chews ===
  startFeed: function(st) {
    var self = this;
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '뭘 먹을까?';
    container.appendChild(label);

    // Food choices
    var foods = [
      { emoji: '\uD83C\uDF5A', name: '밥', boost: 25 },
      { emoji: '\uD83C\uDF5C', name: '국', boost: 20 },
      { emoji: '\uD83C\uDF4E', name: '과일', boost: 15 },
    ];

    var foodGrid = document.createElement('div');
    foodGrid.style.cssText = 'display:flex;gap:16px;justify-content:center;flex-wrap:wrap;';

    for (var i = 0; i < foods.length; i++) {
      (function(food) {
        var btn = document.createElement('button');
        btn.className = 'care-food-btn';
        btn.innerHTML = '<span class="care-food-emoji">' + food.emoji + '</span><span class="care-food-name">' + food.name + '</span>';
        btn.onclick = function() {
          // Disable all buttons
          var btns = foodGrid.querySelectorAll('button');
          for (var b = 0; b < btns.length; b++) btns[b].disabled = true;
          btn.classList.add('care-food-selected');

          // Show feeding animation
          self._feedAnimation(st, food, container);
        };
        foodGrid.appendChild(btn);
      })(foods[i]);
    }
    container.appendChild(foodGrid);

    Learning.openPopup(container);
    speakText('뭘 먹을까?', 0.75);
  },

  _feedAnimation: function(st, food, container) {
    // Replace content with feeding animation
    setTimeout(function() {
      container.innerHTML = '';

      // Big food falling
      var foodFall = document.createElement('div');
      foodFall.className = 'care-food-fall';
      foodFall.textContent = food.emoji;
      container.appendChild(foodFall);

      // Pet mouth
      var petMouth = document.createElement('div');
      petMouth.className = 'care-pet-mouth';
      petMouth.innerHTML = '<div class="care-mouth-open">O</div>';
      container.appendChild(petMouth);

      playSound('click');

      // After food lands
      setTimeout(function() {
        foodFall.style.display = 'none';
        petMouth.innerHTML = '<div class="care-chew">냠냠</div>';
        speakText('냠냠', 0.8);

        // Chew animation (3 cycles)
        var chews = 0;
        var chewEl = petMouth.querySelector('.care-chew');
        var chewInterval = setInterval(function() {
          chews++;
          chewEl.style.transform = chews % 2 === 0 ? 'scale(1.1)' : 'scale(0.9)';
          if (chews >= 6) {
            clearInterval(chewInterval);
            // Done eating!
            container.innerHTML = '';
            var doneEl = document.createElement('div');
            doneEl.style.cssText = 'text-align:center;';
            doneEl.innerHTML = '<div style="font-size:4rem;animation:popIn 0.4s ease">' + food.emoji + '</div>' +
              '<div style="font-size:1.5rem;color:#6a8a5a;margin-top:1rem;font-family:var(--font-display);animation:popIn 0.6s ease">맛있다!</div>';
            container.appendChild(doneEl);

            playSound('correct');
            // Small immediate boost as appetizer
            st.hunger = Math.min(100, st.hunger + 8);
            st.mood = Math.min(100, st.mood + 3);
            saveState(st);

            if (typeof PetRenderer !== 'undefined') {
              if (PetRenderer.feedAnim) PetRenderer.feedAnim();
              if (PetRenderer.emitParticles) PetRenderer.emitParticles('heart', 3);
              if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('맛있다!', 100);
            }

            // After feeding animation, start learning session
            // Full hunger recovery happens on learning completion
            setTimeout(function() {
              Learning.closePopup();
              updateHome(st);
              // Chain into learning after a brief pause
              setTimeout(function() {
                if (typeof Learning !== 'undefined') {
                  Learning.startLearning(st);
                }
              }, 600);
            }, 1500);
          }
        }, 250);
      }, 800);
    }, 300);
  },

  // === SLEEP: Tap stars to make lullaby → pet falls asleep ===
  startSleep: function(st) {
    var self = this;
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '별을 눌러서 재워주자!';
    container.appendChild(label);

    // Star field — tap 5 stars
    var starField = document.createElement('div');
    starField.className = 'care-star-field';

    var tappedCount = 0;
    var totalStars = 5;

    for (var i = 0; i < totalStars; i++) {
      var star = document.createElement('div');
      star.className = 'care-star';
      star.textContent = '\u2606'; // empty star
      star.style.left = (10 + Math.random() * 70) + '%';
      star.style.top = (10 + Math.random() * 60) + '%';
      star.style.animationDelay = (i * 0.3) + 's';

      (function(starEl, idx) {
        starEl.onclick = function() {
          if (starEl.classList.contains('care-star-tapped')) return;
          starEl.classList.add('care-star-tapped');
          starEl.textContent = '\u2B50'; // filled star
          playSound('click');
          tappedCount++;

          // Play a note at increasing pitch
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
            // All stars tapped — pet falls asleep
            setTimeout(function() {
              container.innerHTML = '';
              var sleepEl = document.createElement('div');
              sleepEl.style.cssText = 'text-align:center;';
              sleepEl.innerHTML = '<div style="font-size:4rem;animation:popIn 0.4s ease">\uD83C\uDF19</div>' +
                '<div style="font-size:1.5rem;color:#8a7ea0;margin-top:1rem;font-family:var(--font-display);animation:popIn 0.6s ease">잘 자~</div>';
              container.appendChild(sleepEl);

              speakText('잘 자', 0.7);
              st.sleeping = true;
              saveState(st);

              if (typeof PetRenderer !== 'undefined') {
                if (PetRenderer.sleepAnim) PetRenderer.sleepAnim();
                if (PetRenderer.showPixiBubble) PetRenderer.showPixiBubble('zzz', 180);
              }

              setTimeout(function() {
                Learning.closePopup();
                updateHome(st);
              }, 1800);
            }, 500);
          }
        };
      })(star, i);

      starField.appendChild(star);
    }
    container.appendChild(starField);

    // Moon at bottom
    var moon = document.createElement('div');
    moon.className = 'care-moon';
    moon.textContent = '\uD83C\uDF19';
    container.appendChild(moon);

    Learning.openPopup(container);
    speakText('별을 눌러봐!', 0.75);
  },

  // === WAKE: Tap suns to wake up → pet stretches ===
  startWake: function(st) {
    var self = this;
    var container = document.createElement('div');
    container.className = 'letter-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '해를 눌러서 깨워주자!';
    container.appendChild(label);

    // Sun rays — tap 3 suns
    var sunField = document.createElement('div');
    sunField.className = 'care-star-field';

    var tappedCount = 0;
    var totalSuns = 3;

    for (var i = 0; i < totalSuns; i++) {
      var sun = document.createElement('div');
      sun.className = 'care-star care-sun';
      sun.textContent = '\u2600\uFE0F';
      sun.style.left = (15 + i * 30) + '%';
      sun.style.top = (20 + Math.random() * 40) + '%';
      sun.style.animationDelay = (i * 0.4) + 's';
      sun.style.opacity = '0.4';

      (function(sunEl, idx) {
        sunEl.onclick = function() {
          if (sunEl.classList.contains('care-star-tapped')) return;
          sunEl.classList.add('care-star-tapped');
          sunEl.style.opacity = '1';
          sunEl.style.transform = 'scale(1.3)';
          playSound('click');
          tappedCount++;

          // Brightening effect on background
          var overlay = document.querySelector('.learning-overlay');
          if (overlay) {
            var brightness = 0.4 - (tappedCount / totalSuns) * 0.3;
            overlay.style.background = 'rgba(0,0,0,' + brightness + ')';
          }

          if (tappedCount >= totalSuns) {
            setTimeout(function() {
              container.innerHTML = '';
              var wakeEl = document.createElement('div');
              wakeEl.style.cssText = 'text-align:center;';
              wakeEl.innerHTML = '<div style="font-size:4rem;animation:popIn 0.4s ease">\u2600\uFE0F</div>' +
                '<div style="font-size:1.5rem;color:#d8a030;margin-top:1rem;font-family:var(--font-display);animation:popIn 0.6s ease">좋은 아침!</div>';
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

              setTimeout(function() {
                Learning.closePopup();
                // Reset overlay background
                var ov = document.querySelector('.learning-overlay');
                if (ov) ov.style.background = '';
                updateHome(st);
              }, 1800);
            }, 500);
          }
        };
      })(sun, i);

      sunField.appendChild(sun);
    }
    container.appendChild(sunField);

    Learning.openPopup(container);
    speakText('해를 눌러봐!', 0.75);
  },

  // === WASH: Tap bubbles to scrub pet clean ===
  startWash: function(st) {
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

    for (var i = 0; i < totalBubbles; i++) {
      var bubble = document.createElement('div');
      bubble.className = 'care-star care-bubble';
      bubble.textContent = '\uD83D\uDCA7'; // water drop
      bubble.style.left = (5 + Math.random() * 75) + '%';
      bubble.style.top = (5 + Math.random() * 65) + '%';
      bubble.style.animationDelay = (i * 0.25) + 's';

      (function(bubbleEl) {
        bubbleEl.onclick = function() {
          if (bubbleEl.classList.contains('care-star-tapped')) return;
          bubbleEl.classList.add('care-star-tapped');
          bubbleEl.textContent = '\u2728'; // sparkle
          playSound('click');
          tappedCount++;

          if (tappedCount >= totalBubbles) {
            setTimeout(function() {
              container.innerHTML = '';
              var doneEl = document.createElement('div');
              doneEl.style.cssText = 'text-align:center;';
              doneEl.innerHTML = '<div style="font-size:4rem;animation:popIn 0.4s ease">\u2728</div>' +
                '<div style="font-size:1.5rem;color:#88c8e8;margin-top:1rem;font-family:var(--font-display);animation:popIn 0.6s ease">깨끗해졌다!</div>';
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
              setTimeout(function() {
                Learning.closePopup();
                updateHome(st);
              }, 1800);
            }, 500);
          }
        };
      })(bubble);

      bubbleField.appendChild(bubble);
    }
    container.appendChild(bubbleField);

    Learning.openPopup(container);
    speakText('거품을 눌러봐!', 0.75);
  }
};
