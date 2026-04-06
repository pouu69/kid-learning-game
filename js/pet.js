// js/pet.js
// 펫 행동, 감정, 요청 로직 — 학습 진도 연동 대사 시스템

// 한글 유니코드 조합용 룩업 테이블 (Jamo → 초성/중성 인덱스)
var CHO_MAP = {'ㄱ':0,'ㄲ':1,'ㄴ':2,'ㄷ':3,'ㄸ':4,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅃ':8,'ㅅ':9,'ㅆ':10,'ㅇ':11,'ㅈ':12,'ㅉ':13,'ㅊ':14,'ㅋ':15,'ㅌ':16,'ㅍ':17,'ㅎ':18};
var JUNG_MAP = {'ㅏ':0,'ㅐ':1,'ㅑ':2,'ㅒ':3,'ㅓ':4,'ㅔ':5,'ㅕ':6,'ㅖ':7,'ㅗ':8,'ㅘ':9,'ㅙ':10,'ㅚ':11,'ㅛ':12,'ㅜ':13,'ㅝ':14,'ㅞ':15,'ㅟ':16,'ㅠ':17,'ㅡ':18,'ㅢ':19,'ㅣ':20};

function composeSyllable(cho, jung) {
  var choIdx = CHO_MAP[cho];
  var jungIdx = JUNG_MAP[jung];
  if (choIdx === undefined || jungIdx === undefined) return null;
  return String.fromCharCode(choIdx * 588 + jungIdx * 28 + 0xAC00);
}

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

    var l = st.learning;
    var words = l.completedWords || [];

    // 배운 단어 기반 요청 (우선)
    if (this.request === 'hungry') {
      if (words.indexOf('밥') !== -1) return '밥!';
      if (words.indexOf('물') !== -1) return '물!';
      return null;
    }
    if (this.request === 'sleepy') {
      if (words.length >= 5) return '졸려...';
      return null;
    }
    if (this.request === 'bored') {
      if (words.length >= 5) return '심심해~';
      return null;
    }

    // 랜덤 혼잣말 (배운 글자 연습) - 30% 확률
    var cons = l.knownConsonants || [];
    var vows = l.knownVowels || [];
    if (cons.length > 0 && vows.length > 0 && Math.random() < 0.3) {
      var c = cons[Math.floor(Math.random() * cons.length)];
      var v = vows[Math.floor(Math.random() * vows.length)];
      var syl = composeSyllable(c, v);
      if (syl) {
        return syl + '...';
      }
    }

    return null;
  },

  // Get a greeting that reflects learning progress
  getGreeting: function(st) {
    var l = st.learning;
    var intIdx = l.interleavedIndex || 0;

    // Stage 0: pre-verbal
    if ((l.stage || 0) === 0) return '...!';

    // 인터리브 초반 (글자 1~2개)
    if (intIdx <= 2) {
      var knownCons = l.knownConsonants || [];
      if (knownCons.length > 0) {
        return knownCons[knownCons.length - 1] + '...!';
      }
      return '응?';
    }

    // 단어를 아는 경우 (Stage 4+)
    var words = l.completedWords || [];
    if (words.length > 0 && Math.random() > 0.3) {
      return words[Math.floor(Math.random() * words.length)] + '~';
    }

    // 인터리브 중반 — 배운 자음+모음으로 음절 만들어 인사
    var cons = l.knownConsonants || [];
    var vows = l.knownVowels || [];
    if (cons.length > 0 && vows.length > 0) {
      var syllables = [];
      for (var ci = 0; ci < cons.length; ci++) {
        for (var vi = 0; vi < Math.min(vows.length, 2); vi++) {
          var syl = composeSyllable(cons[ci], vows[vi]);
          if (syl) syllables.push(syl);
        }
      }
      if (syllables.length > 0) {
        var pick = syllables[Math.floor(Math.random() * syllables.length)];
        return pick + '!';
      }
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
