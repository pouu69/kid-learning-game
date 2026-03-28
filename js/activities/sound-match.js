// js/activities/sound-match.js
// Stage 0: Sound matching game — match sounds to pictures (egg hatching)
// Globals: CURRICULUM, Learning, speakText, playSound

var SoundMatchActivity = {
  _currentWord: null,
  _attempts: 0,
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

  start: function(st, target) {
    this._cleanup();
    this._currentWord = target.data;
    this._attempts = 0;
    this._showRound(st);
  },

  _showRound: function(st) {
    var self = this;
    var wordData = this._currentWord;

    var container = document.createElement('div');
    container.className = 'sound-match-activity';

    // Egg animation hint
    var eggHint = document.createElement('div');
    eggHint.className = 'sound-match-egg';
    eggHint.textContent = '?';
    container.appendChild(eggHint);

    // Sound play button
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() {
      speakText(wordData.sound, 0.7);
    };
    container.appendChild(soundBtn);

    // Instruction (voice-first)
    var instruction = document.createElement('div');
    instruction.className = 'sound-match-instruction';
    instruction.textContent = '어떤 그림일까?';
    container.appendChild(instruction);

    // Build choices: correct + distractor (2 choices for 5-7yo)
    var choices = this._buildChoices(wordData);
    var choiceContainer = document.createElement('div');
    choiceContainer.className = 'sound-match-choices';

    // Event delegation on container
    choiceContainer.onclick = function(e) {
      var btn = e.target.closest('.sound-match-choice');
      if (!btn || btn.classList.contains('choice-locked')) return;

      var selected = btn.getAttribute('data-word');
      self._handleChoice(st, selected, choiceContainer);
    };

    for (var i = 0; i < choices.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'sound-match-choice';
      btn.setAttribute('data-word', choices[i].word);

      var icon = document.createElement('div');
      icon.className = 'sound-match-icon';
      icon.textContent = this._getIllustrationEmoji(choices[i].illustration);
      btn.appendChild(icon);

      var label = document.createElement('div');
      label.className = 'sound-match-label';
      label.textContent = choices[i].word;
      btn.appendChild(label);

      choiceContainer.appendChild(btn);
    }
    container.appendChild(choiceContainer);

    Learning.openPopup(container);

    // Auto-play sound after popup opens
    this._setTimeout(function() { speakText(wordData.sound, 0.7); }, 500);
  },

  _buildChoices: function(wordData) {
    var correct = { word: wordData.word, illustration: wordData.illustration };
    var distractorWord = wordData.distractors[0];

    // Find distractor illustration from wholeWords
    var distractorIllustration = 'unknown';
    for (var i = 0; i < CURRICULUM.wholeWords.length; i++) {
      if (CURRICULUM.wholeWords[i].word === distractorWord) {
        distractorIllustration = CURRICULUM.wholeWords[i].illustration;
        break;
      }
    }
    var distractor = { word: distractorWord, illustration: distractorIllustration };

    // Randomize order
    return Math.random() < 0.5 ? [correct, distractor] : [distractor, correct];
  },

  _handleChoice: function(st, selected, choiceContainer) {
    var correct = this._currentWord.word;
    var buttons = choiceContainer.querySelectorAll('.sound-match-choice');

    // Lock all buttons
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.add('choice-locked');
    }

    if (selected === correct) {
      // Correct
      this._onCorrect(st, choiceContainer);
    } else {
      this._attempts++;
      this._onWrong(st, choiceContainer, selected);
    }
  },

  _onCorrect: function(st, choiceContainer) {
    var buttons = choiceContainer.querySelectorAll('.sound-match-choice');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-word') === this._currentWord.word) {
        buttons[i].classList.add('choice-correct');
      }
    }
    playSound('correct');

    var self = this;
    this._setTimeout(function() {
      Learning.onWholeWordComplete(st, self._currentWord);
    }, 800);
  },

  _onWrong: function(st, choiceContainer, selected) {
    var self = this;
    var buttons = choiceContainer.querySelectorAll('.sound-match-choice');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-word') === selected) {
        buttons[i].classList.add('choice-wrong');
      }
    }

    // After 2 attempts, highlight correct answer
    if (this._attempts >= 2) {
      this._setTimeout(function() {
        for (var i = 0; i < buttons.length; i++) {
          if (buttons[i].getAttribute('data-word') === self._currentWord.word) {
            buttons[i].classList.add('choice-correct');
          }
          buttons[i].classList.remove('choice-locked');
        }
      }, 600);
    } else {
      // Unlock for retry after brief delay
      this._setTimeout(function() {
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove('choice-locked', 'choice-wrong');
        }
        speakText(self._currentWord.sound, 0.7);
      }, 800);
    }
  },

  _getIllustrationEmoji: function(illustration) {
    var map = {
      child: '\u{1F9D2}',
      mother: '\u{1F469}',
      father: '\u{1F468}',
      water: '\u{1F4A7}',
      rice: '\u{1F35A}',
      tree: '\u{1F333}',
      unknown: '?'
    };
    return map[illustration] || '?';
  }
};
