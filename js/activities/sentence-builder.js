// js/activities/sentence-builder.js
// Stage 5: Sentence building game — arrange word cards to form sentences
// Globals: CURRICULUM, Learning, speakText, playSound
// Shared: shuffleArray, createSoundButton, applyTimerMixin

var SentenceBuilderActivity = {

  start: function(st, target) {
    this._cleanup();
    var sentenceData = target.data || target;
    this._showRound(st, sentenceData);
  },

  _showRound: function(st, sentenceData) {
    var self = this;
    var slots = sentenceData.slots;
    var filledCount = 0;

    var container = document.createElement('div');
    container.className = 'sentence-builder-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '문장을 만들어봐!';
    speakText('문장을 만들어봐!', 0.7);
    container.appendChild(label);

    // Sound button — plays full sentence
    var soundBtn = createSoundButton(function() {
      speakText(sentenceData.text, 0.7);
    });
    container.appendChild(soundBtn);

    // Sentence slot area (blank cards to fill)
    var slotArea = document.createElement('div');
    slotArea.className = 'sentence-slots';
    var slotEls = [];

    for (var i = 0; i < slots.length; i++) {
      var slotEl = document.createElement('div');
      slotEl.className = 'sentence-slot';
      slotEl.setAttribute('data-index', i);
      slotEl.setAttribute('data-expected', slots[i]);
      slotEl.textContent = '___';
      slotArea.appendChild(slotEl);
      slotEls.push(slotEl);
    }
    container.appendChild(slotArea);

    // Scrambled word cards using shared shuffle
    var scrambled = shuffleArray(slots);

    var cardArea = document.createElement('div');
    cardArea.className = 'sentence-cards';

    // Event delegation on card area
    cardArea.onclick = function(e) {
      var card = e.target.closest('.sentence-card');
      if (!card || card.classList.contains('card-used')) return;
      self._handleCardTap(st, sentenceData, card, slotEls, cardArea, function() {
        filledCount++;
        if (filledCount >= slots.length) {
          self._onComplete(st, sentenceData, container);
        }
      });
    };

    for (var c = 0; c < scrambled.length; c++) {
      var card = document.createElement('button');
      card.className = 'sentence-card';
      card.setAttribute('data-word', scrambled[c]);
      card.textContent = scrambled[c];
      cardArea.appendChild(card);
    }
    container.appendChild(cardArea);

    Learning.openPopup(container);
    this._setTimeout(function() { speakText(sentenceData.text, 0.7); }, 500);
  },

  _handleCardTap: function(st, sentenceData, card, slotEls, cardArea, onFill) {
    var word = card.getAttribute('data-word');

    // Find next empty slot
    var nextSlot = null;
    for (var i = 0; i < slotEls.length; i++) {
      if (!slotEls[i].classList.contains('slot-filled')) {
        nextSlot = slotEls[i];
        break;
      }
    }
    if (!nextSlot) return;

    var expected = nextSlot.getAttribute('data-expected');

    if (word === expected) {
      // Correct — fill slot
      nextSlot.textContent = word;
      nextSlot.classList.add('slot-filled');
      card.classList.add('card-used');
      playSound('click');
      speakText(word, 0.8);
      onFill();
    } else {
      // Wrong — shake the card
      card.classList.add('choice-wrong');
      var self = this;
      this._setTimeout(function() {
        card.classList.remove('choice-wrong');
      }, 500);
    }
  },

  _onComplete: function(st, sentenceData, container) {
    var self = this;

    // Celebration
    if (typeof showCelebration === 'function') {
      showCelebration(window.innerWidth / 2, window.innerHeight / 2);
    }
    playSound('correct');
    speakText(sentenceData.text, 0.7);

    // Show praise
    var praise = document.createElement('div');
    praise.className = 'sentence-complete-praise';
    praise.textContent = '문장 완성!';
    speakText('문장 완성!', 0.7);
    container.appendChild(praise);

    this._setTimeout(function() {
      self._cleanup();
      Learning.onSentenceComplete(st, sentenceData);
    }, 1500);
  }
};

applyTimerMixin(SentenceBuilderActivity);
