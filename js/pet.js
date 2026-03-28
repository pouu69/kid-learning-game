// js/pet.js
// 펫 행동, 감정, 요청 로직 — 학습 진도 연동 대사 시스템

var Pet = {
  request: null,

  updateRequest: function(st) {
    if (st.sleeping) { this.request = null; return; }
    if (st.sleepy > 80) this.request = 'sleepy';
    else if (st.hunger < 30) this.request = 'hungry';
    else if (st.mood < 40) this.request = 'bored';
    else this.request = null;
  },

  _speechTimer: 0,
  _lastSpeechText: null,

  // Learning-progress-driven speech system
  getSpeechText: function(st) {
    if (st.sleeping) return 'zzz';
    if (st.stage === 0) return null;

    // Need-based speech takes priority
    if (this.request === 'hungry') return '배고파...';
    if (this.request === 'sleepy') return '졸려...';
    if (this.request === 'bored') return '심심해~';

    return null;
  },

  // Get a greeting that reflects learning progress
  getGreeting: function(st) {
    var l = st.learning;
    var stage = l.stage || 0;

    // Stage 0: pre-verbal
    if (stage === 0) return '...!';

    // Stage 1: consonant sounds
    if (stage === 1) {
      var knownCons = l.knownConsonants || [];
      if (knownCons.length > 0) {
        var lastCon = knownCons[knownCons.length - 1];
        return lastCon + '...!';
      }
      return '응?';
    }

    // Stage 2: vowel sounds
    if (stage === 2) {
      var knownVow = l.knownVowels || [];
      if (knownVow.length > 0) {
        var vowSounds = ['아~', '어~', '오~', '우~', '으~', '이~'];
        return vowSounds[Math.floor(Math.random() * Math.min(knownVow.length, vowSounds.length))];
      }
      return '아!';
    }

    // Stage 3: syllables
    if (stage === 3) {
      var syllables = ['가!', '나!', '다!', '마!', '바!', '사!'];
      return syllables[Math.floor(Math.random() * syllables.length)];
    }

    // Stage 4-5: use learned words
    var words = l.completedWords || [];
    if (words.length > 0 && Math.random() > 0.3) {
      var word = words[Math.floor(Math.random() * words.length)];
      return word + '~';
    }

    var greetings = ['반가워!', '안녕~', '헤헤~'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  },

  // Get pet's learned letter collection for HUD display
  getLetterCollection: function(st) {
    var l = st.learning;
    var collection = [];
    var consonants = l.knownConsonants || [];
    var vowels = l.knownVowels || [];

    // Show consonants first, then vowels
    for (var i = 0; i < consonants.length; i++) {
      collection.push({ letter: consonants[i], type: 'consonant' });
    }
    for (var j = 0; j < vowels.length; j++) {
      collection.push({ letter: vowels[j], type: 'vowel' });
    }
    return collection;
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
  }
};
