// js/activities/syllable-factory.js
// Stage 3: Syllable combination game — combine consonant + vowel to make syllables
// Globals: CURRICULUM, Learning, speakText, playSound
// Shared: shuffleArray, buildChoices, createSoundButton, applyTimerMixin

var SyllableFactoryActivity = {
  _attempts: 0,
  _selectedCho: null,
  _selectedJung: null,

  start: function(st, target) {
    this._cleanup();
    this._selectedCho = null;
    this._selectedJung = null;
    this._attempts = 0;
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
    speakText('글자를 만들어봐!', 0.7);
    container.appendChild(label);

    // Sound button
    var soundBtn = createSoundButton(function() {
      speakText(targetSyllable, 0.7);
    });
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

    var conPool = [];
    for (var ci = 0; ci < CURRICULUM.consonants.length; ci++) {
      conPool.push(CURRICULUM.consonants[ci].letter);
    }
    var choChoices = buildChoices(syllableData.cho, conPool, 2);
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

    var vowPool = [];
    for (var vi = 0; vi < CURRICULUM.vowels.length; vi++) {
      vowPool.push(CURRICULUM.vowels[vi].letter);
    }
    var jungChoices = buildChoices(syllableData.jung, vowPool, 2);
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

applyTimerMixin(SyllableFactoryActivity);
