// js/activities/syllable-factory.js
// Stage 3: Syllable combination game — combine consonant + vowel to make syllables
// Globals: CURRICULUM, Learning, speakText, playSound

var SyllableFactoryActivity = {
  _attempts: 0,
  _selectedCho: null,
  _selectedJung: null,
  _timers: [],

  _cleanup: function() {
    for (var i = 0; i < this._timers.length; i++) {
      clearTimeout(this._timers[i]);
    }
    this._timers = [];
    this._selectedCho = null;
    this._selectedJung = null;
    this._attempts = 0;
  },

  _setTimeout: function(fn, ms) {
    var id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  },

  start: function(st, target) {
    this._cleanup();
    this._showRound(st, target.data);
  },

  _showRound: function(st, syllableData) {
    var self = this;
    var targetSyllable = syllableData.syllable;

    var container = document.createElement('div');
    container.className = 'syllable-factory-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '글자를 만들어봐!';
    container.appendChild(label);

    // Sound button
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() { speakText(targetSyllable, 0.7); };
    container.appendChild(soundBtn);

    // Combination slots
    var slotsRow = document.createElement('div');
    slotsRow.className = 'factory-slots';

    var choSlot = this._createSlot('factory-cho-slot');
    slotsRow.appendChild(choSlot);
    slotsRow.appendChild(this._createOperator('+'));
    var jungSlot = this._createSlot('factory-jung-slot');
    slotsRow.appendChild(jungSlot);
    slotsRow.appendChild(this._createOperator('='));
    var resultSlot = this._createSlot('factory-result-slot');
    resultSlot.classList.add('factory-slot--result');
    slotsRow.appendChild(resultSlot);
    container.appendChild(slotsRow);

    // Consonant choices
    var choLabel = document.createElement('div');
    choLabel.className = 'factory-section-label';
    choLabel.textContent = '자음';
    container.appendChild(choLabel);

    var choChoices = this._buildChoices(syllableData.cho, 'consonant');
    var choContainer = document.createElement('div');
    choContainer.className = 'factory-choices';
    choContainer.onclick = function(e) {
      var btn = e.target.closest('.factory-choice');
      if (!btn || btn.classList.contains('choice-locked')) return;
      self._selectPart('cho', btn.getAttribute('data-letter'), choContainer, choSlot, st, syllableData, container);
    };
    this._renderChoiceButtons(choChoices, choContainer);
    container.appendChild(choContainer);

    // Vowel choices
    var jungLabel = document.createElement('div');
    jungLabel.className = 'factory-section-label';
    jungLabel.textContent = '모음';
    container.appendChild(jungLabel);

    var jungChoices = this._buildChoices(syllableData.jung, 'vowel');
    var jungContainer = document.createElement('div');
    jungContainer.className = 'factory-choices';
    jungContainer.onclick = function(e) {
      var btn = e.target.closest('.factory-choice');
      if (!btn || btn.classList.contains('choice-locked')) return;
      self._selectPart('jung', btn.getAttribute('data-letter'), jungContainer, jungSlot, st, syllableData, container);
    };
    this._renderChoiceButtons(jungChoices, jungContainer);
    container.appendChild(jungContainer);

    Learning.openPopup(container);
    this._setTimeout(function() { speakText(targetSyllable, 0.7); }, 500);
  },

  _createSlot: function(id) {
    var slot = document.createElement('div');
    slot.className = 'factory-slot';
    slot.id = id;
    slot.textContent = '?';
    return slot;
  },

  _createOperator: function(text) {
    var op = document.createElement('div');
    op.className = 'factory-operator';
    op.textContent = text;
    return op;
  },

  _buildChoices: function(correct, type) {
    var pool = type === 'consonant' ? CURRICULUM.consonants : CURRICULUM.vowels;
    var others = [];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].letter !== correct) others.push(pool[i].letter);
    }
    // Fisher-Yates shuffle
    for (var j = others.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var temp = others[j]; others[j] = others[k]; others[k] = temp;
    }
    var choices = others.slice(0, 2);
    choices.push(correct);
    // Shuffle final
    for (var m = choices.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var t = choices[m]; choices[m] = choices[n]; choices[n] = t;
    }
    return choices;
  },

  _renderChoiceButtons: function(choices, container) {
    for (var i = 0; i < choices.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'factory-choice';
      btn.setAttribute('data-letter', choices[i]);
      btn.textContent = choices[i];
      container.appendChild(btn);
    }
  },

  // Unified selection handler for both cho and jung (eliminates duplication)
  _selectPart: function(type, letter, choiceContainer, slot, st, syllableData, mainContainer) {
    var correct = type === 'cho' ? syllableData.cho : syllableData.jung;
    var buttons = choiceContainer.querySelectorAll('.factory-choice');
    var self = this;

    if (letter === correct) {
      if (type === 'cho') { this._selectedCho = letter; }
      else { this._selectedJung = letter; }

      slot.textContent = letter;
      slot.classList.add('factory-slot--filled');

      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.add('choice-locked');
        if (buttons[i].getAttribute('data-letter') === letter) {
          buttons[i].classList.add('choice-correct');
        }
      }
      playSound('click');
      this._checkCombination(st, syllableData, mainContainer);
    } else {
      this._attempts++;
      for (var j = 0; j < buttons.length; j++) {
        if (buttons[j].getAttribute('data-letter') === letter) {
          buttons[j].classList.add('choice-wrong');
          break;
        }
      }
      this._setTimeout(function() {
        for (var k = 0; k < buttons.length; k++) {
          buttons[k].classList.remove('choice-wrong');
        }
      }, 500);
    }
  },

  _checkCombination: function(st, syllableData, mainContainer) {
    if (!this._selectedCho || !this._selectedJung) return;

    var resultSlot = mainContainer.querySelector('#factory-result-slot');
    if (resultSlot) {
      resultSlot.textContent = syllableData.syllable;
      resultSlot.classList.add('factory-slot--filled', 'factory-slot--complete');
    }

    playSound('correct');
    speakText(syllableData.syllable, 0.7);

    var self = this;
    this._setTimeout(function() {
      self._cleanup();
      Learning.onSyllableComplete(st, syllableData);
    }, 1000);
  }
};
