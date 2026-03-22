// js/storage.js
// localStorage 상태 관리

var STORAGE_KEY = 'tamagoji_state';

function createDefaultState() {
  return {
    name: '',
    stage: 0,
    birthTime: Date.now(),
    lastUpdate: Date.now(),
    hunger: 80,
    mood: 80,
    sleepy: 10,
    sleeping: false,
    learning: {
      stage: 1,
      consonantIndex: 0,
      vowelIndex: 0,
      wordIndex: 0,
      knownConsonants: [],
      knownVowels: [],
      completedWords: []
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

function saveState(st) {
  st.lastUpdate = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
}

function loadState() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
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
