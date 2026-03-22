// js/pet.js
// 펫 행동, 감정, 요청 로직

var Pet = {
  request: null,

  updateRequest: function(st) {
    if (st.sleeping) { this.request = null; return; }
    if (st.hunger < 30) this.request = 'hungry';
    else if (st.mood < 40) this.request = 'bored';
    else if (st.sleepy > 80) this.request = 'sleepy';
    else this.request = null;
  },

  getSpeechText: function(st) {
    if (st.sleeping) return 'zzz';
    if (st.stage === 0) return '...';

    var words = st.learning.completedWords;
    if (words.length === 0) return '...';

    if (this.request === 'hungry') {
      if (words.indexOf('맘마') !== -1) return '맘마...';
      if (words.indexOf('물') !== -1) return '물...';
      return '...';
    }
    if (this.request === 'sleepy') {
      if (words.indexOf('자다') !== -1) return '자...';
      return 'zzz';
    }
    if (this.request === 'bored') {
      if (words.indexOf('우리') !== -1) return '우리 놀자~';
      if (words.indexOf('나') !== -1) return '나!';
      return '...?';
    }
    if (words.length > 0) {
      return words[Math.floor(Math.random() * words.length)] + '!';
    }
    return '~';
  },

  getMood: function(st) {
    if (st.sleeping) return 'sleeping';
    var avg = (st.hunger + st.mood + (100 - st.sleepy)) / 3;
    if (avg >= 70) return 'happy';
    if (avg >= 40) return 'neutral';
    return 'sad';
  },

  getActionButton: function(st) {
    if (st.sleeping) return { label: '깨우기', action: 'wake' };
    if (st.stage === 0) return { label: '톡톡 두드리기', action: 'hatch' };
    if (this.request === 'hungry') return { label: '밥 주기', action: 'feed' };
    if (this.request === 'bored') return { label: '같이 놀기', action: 'play' };
    if (this.request === 'sleepy') return { label: '재우기', action: 'sleep' };
    return null;
  },

  checkEvolution: function(st) {
    var completed = st.learning.completedWords.length;
    for (var i = EVOLUTION.length - 1; i >= 0; i--) {
      if (completed >= EVOLUTION[i].wordsNeeded && st.stage < EVOLUTION[i].stage) {
        return EVOLUTION[i];
      }
    }
    return null;
  }
};
