// js/story/Utils.js
// Pure helper functions for story systems

// Weighted random pick with optional bias multiplier
// transitions: [{ to: stateInt, w: weight }, ...]
// bias: { [stateInt]: multiplier } or undefined
function weightedPick(transitions, bias) {
  var total = 0;
  for (var i = 0; i < transitions.length; i++) {
    var t = transitions[i];
    var w = t.w;
    if (bias && bias[t.to] !== undefined) {
      w *= bias[t.to];
    }
    total += w;
  }
  var r = Math.random() * total;
  var acc = 0;
  for (var j = 0; j < transitions.length; j++) {
    var t2 = transitions[j];
    var w2 = t2.w;
    if (bias && bias[t2.to] !== undefined) {
      w2 *= bias[t2.to];
    }
    acc += w2;
    if (r < acc) return t2.to;
  }
  return transitions[transitions.length - 1].to;
}

// Visitor data — unlocked by learning progress
var VISITORS = [
  { id: 'bunny',  emoji: '\uD83D\uDC30', minCons: 3 },
  { id: 'bird',   emoji: '\uD83D\uDC26', minCons: 5 },
  { id: 'fox',    emoji: '\uD83E\uDD8A', minVow: 3 },
  { id: 'turtle', emoji: '\uD83D\uDC22', minWords: 2 }
];

// Pick a random visitor from the unlocked pool
// Returns visitor object or null if none available
function pickVisitor(st) {
  var pool = [];
  for (var i = 0; i < VISITORS.length; i++) {
    var v = VISITORS[i];
    if (v.minCons  && st.learning.knownConsonants.length < v.minCons) continue;
    if (v.minVow   && st.learning.knownVowels.length < v.minVow) continue;
    if (v.minWords && st.learning.completedWords.length < v.minWords) continue;
    pool.push(v);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
