// js/pet.js
// 펫 행동, 감정, 요청 로직

var Pet = {
  request: null,

  updateRequest: function(st) {
    if (st.sleeping) { this.request = null; return; }
    // Most urgent need wins — sleepy > hungry > bored
    if (st.sleepy > 80) this.request = 'sleepy';
    else if (st.hunger < 30) this.request = 'hungry';
    else if (st.mood < 40) this.request = 'bored';
    else this.request = null;
  },

  _speechTimer: 0,       // countdown to hide speech
  _lastSpeechText: null,  // prevent repeat

  getSpeechText: function(st) {
    // Only show speech for specific states — never random words
    if (st.sleeping) return 'zzz';
    if (st.stage === 0) return null;

    // Need-based speech only
    if (this.request === 'hungry') return '배고파...';
    if (this.request === 'sleepy') return '졸려...';
    if (this.request === 'bored') return '심심해~';

    // No need = no speech (quiet pet is a happy pet)
    return null;
  },

  // Get a greeting for when pet is just interacted with
  getGreeting: function(st) {
    var greetings = ['반가워!', '안녕~', '헤헤~'];
    var words = st.learning.completedWords;
    if (words.length > 0 && Math.random() > 0.5) {
      // Occasionally use a learned word as greeting
      return words[Math.floor(Math.random() * words.length)] + '~';
    }
    return greetings[Math.floor(Math.random() * greetings.length)];
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

};
