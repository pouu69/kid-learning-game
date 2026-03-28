// js/storage.js
// localStorage 상태 관리 (v2: 6단계 커리큘럼)

var STORAGE_KEY = 'tamagoji_state';
var STORAGE_BACKUP_KEY = 'tamagoji_state_v1_backup';
var STORAGE_VERSION = 2;

var BASIC_CONSONANTS = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ'];
var ASPIRATED_CONSONANTS = ['ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
var BASIC_VOWELS = ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ','ㅣ'];
var BONUS_VOWEL_LIST = ['ㅐ','ㅔ'];

function createDefaultState() {
  return {
    version: STORAGE_VERSION,
    name: '',
    stage: 0,
    birthTime: Date.now(),
    lastUpdate: Date.now(),
    hunger: 80,
    mood: 80,
    sleepy: 10,
    sleeping: false,
    learning: {
      stage: 0,
      consonantIndex: 0,
      vowelIndex: 0,
      wordIndex: 0,
      knownConsonants: [],
      knownVowels: [],
      bonusConsonants: [],
      bonusVowels: [],
      completedWords: [],
      wholeWordsMatched: [],
      syllablesCompleted: 0,
      sentencesCompleted: 0,
      practiceLog: {}
    },
    daily: {
      date: new Date().toISOString().slice(0, 10),
      sessionsToday: 0,
      minutesToday: 0,
      activitiesDone: 0,
      bonusUnlocked: false
    },
    reports: {
      totalDays: 0,
      totalMinutes: 0,
      weeklyLog: [],
      letterStats: {}
    }
  };
}

function migrateState(st) {
  if (!st.version || st.version < STORAGE_VERSION) {
    return migrateV1toV2(st);
  }
  return st;
}

function migrateV1toV2(st) {
  var migrated = JSON.parse(JSON.stringify(st));
  migrated.version = STORAGE_VERSION;

  // Ensure learning object exists
  if (!migrated.learning) {
    migrated.learning = createDefaultState().learning;
    return migrated;
  }

  var l = migrated.learning;

  // 1) learning.stage mapping (old 1~3 → new 0~5)
  var oldStage = l.stage || 1;
  if (oldStage === 1) {
    l.stage = 1;
    if ((l.consonantIndex || 0) >= 9) {
      l.consonantIndex = 9;
    }
  } else if (oldStage === 2) {
    l.stage = 2;
    l.consonantIndex = 9;
    if ((l.vowelIndex || 0) >= 6) {
      l.vowelIndex = 6;
    }
  } else if (oldStage === 3) {
    l.stage = 4;
    l.consonantIndex = 9;
    l.vowelIndex = 6;
    l.syllablesCompleted = 15;
  }

  // 2) Separate aspirated consonants into bonusConsonants
  var knownCons = l.knownConsonants || [];
  l.knownConsonants = knownCons.filter(function(c) {
    return BASIC_CONSONANTS.indexOf(c) !== -1;
  });
  l.bonusConsonants = knownCons.filter(function(c) {
    return ASPIRATED_CONSONANTS.indexOf(c) !== -1;
  });

  // 3) Separate ㅐ/ㅔ into bonusVowels
  var knownVow = l.knownVowels || [];
  l.knownVowels = knownVow.filter(function(v) {
    return BASIC_VOWELS.indexOf(v) !== -1;
  });
  l.bonusVowels = knownVow.filter(function(v) {
    return BONUS_VOWEL_LIST.indexOf(v) !== -1;
  });

  // 4) Convert practiceCount → practiceLog
  var now = Date.now();
  var oldPc = l.practiceCount || {};
  l.practiceLog = {};
  var keys = Object.keys(oldPc);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var count = oldPc[key] || 0;
    l.practiceLog[key] = {
      count: count,
      lastPracticed: now,
      interval: Math.min(count, 5)
    };
  }
  delete l.practiceCount;

  // 5) Initialize new fields
  if (!l.syllablesCompleted) l.syllablesCompleted = 0;
  if (!l.sentencesCompleted) l.sentencesCompleted = 0;
  if (!l.wholeWordsMatched) l.wholeWordsMatched = [];
  if (!l.completedWords) l.completedWords = [];

  return migrated;
}

function saveState(st) {
  st.lastUpdate = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
}

function loadState() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    var st = JSON.parse(raw);

    // Apply migration if needed
    if (!st.version || st.version < STORAGE_VERSION) {
      // Backup original state before migration
      localStorage.setItem(STORAGE_BACKUP_KEY, raw);
      st = migrateState(st);
      saveState(st);
    }

    return st;
  } catch (e) {
    return null;
  }
}

function updateDaily(st) {
  var today = new Date().toISOString().slice(0, 10);
  if (st.daily.date !== today) {
    if (st.daily.minutesToday > 0) {
      st.reports.weeklyLog.push({
        date: st.daily.date,
        minutes: st.daily.minutesToday,
        activities: st.daily.activitiesDone,
        newLetters: 0
      });
      if (st.reports.weeklyLog.length > 14) {
        st.reports.weeklyLog = st.reports.weeklyLog.slice(-14);
      }
    }
    st.daily = {
      date: today,
      sessionsToday: 0,
      minutesToday: 0,
      activitiesDone: 0,
      bonusUnlocked: false
    };
    st.reports.totalDays++;
  }
  st.daily.sessionsToday++;
}
