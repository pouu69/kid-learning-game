// js/learning.js
// 4단계 학습 사이클 엔진
// Globals: CURRICULUM, saveState (storage.js), showScreen, onLearningComplete (game.js)
// Depends on: MeetActivity, DiscoverActivity, PlayActivity, ReuniteActivity

var Learning = {
  currentActivity: null,

  startLearning: function(st) {
    if (!st.learning.currentWord) {
      st.learning.currentWord = {
        word: CURRICULUM[0].word,
        phase: 1,
        startedAt: Date.now()
      };
    }
    var wordData = null;
    for (var i = 0; i < CURRICULUM.length; i++) {
      if (CURRICULUM[i].word === st.learning.currentWord.word) {
        wordData = CURRICULUM[i];
        break;
      }
    }
    if (!wordData) return;

    var phase = st.learning.currentWord.phase;
    if (phase === 1) MeetActivity.start(st, wordData);
    else if (phase === 2) DiscoverActivity.start(st, wordData);
    else if (phase === 3) PlayActivity.start(st, wordData);
    else if (phase === 4) ReuniteActivity.start(st, wordData);
  },

  onPhaseComplete: function(st) {
    var cw = st.learning.currentWord;
    if (cw.phase < 4) {
      cw.phase++;
      saveState(st);
      showScreen('home');
    } else {
      this.completeWord(st);
    }
  },

  completeWord: function(st) {
    var cw = st.learning.currentWord;
    var wordData = null;
    for (var i = 0; i < CURRICULUM.length; i++) {
      if (CURRICULUM[i].word === cw.word) {
        wordData = CURRICULUM[i];
        break;
      }
    }

    if (wordData) {
      for (var j = 0; j < wordData.letters.length; j++) {
        var l = wordData.letters[j];
        if (st.learning.knownLetters.indexOf(l) === -1) {
          st.learning.knownLetters.push(l);
          st.reports.letterStats[l] = {
            firstSeen: new Date().toISOString().slice(0, 10),
            exposures: 1,
            lastSeen: new Date().toISOString().slice(0, 10)
          };
        }
      }
    }

    st.learning.completedWords.push(cw.word);
    st.learning.wordHistory.push({
      word: cw.word,
      completedAt: Date.now(),
      daysSpent: Math.ceil((Date.now() - cw.startedAt) / 86400000) || 1
    });

    var nextIndex = st.learning.completedWords.length;
    if (nextIndex < CURRICULUM.length) {
      st.learning.currentWord = {
        word: CURRICULUM[nextIndex].word,
        phase: 1,
        startedAt: Date.now()
      };
    } else {
      st.learning.currentWord = null;
    }

    saveState(st);
    onLearningComplete({
      fed: wordData && (wordData.petRequest === 'hungry' || wordData.petRequest === 'thirsty'),
      played: wordData && wordData.petRequest === 'bored',
      newWord: cw.word
    });
  }
};
