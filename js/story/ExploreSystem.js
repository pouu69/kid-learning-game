// js/story/ExploreSystem.js
// Location unlock FSM: LOCKED → PREVIEW (10 ticks) → UNLOCKED

var LOCATION_UNLOCK = {
  forest:   { check: function(st) { return st.learning.knownConsonants.length >= 5; } },
  beach:    { check: function(st) { return st.learning.knownConsonants.length >= 14; } },
  mountain: { check: function(st) { return st.learning.knownVowels.length >= 8; } },
  village:  { check: function(st) { return st.learning.completedWords.length >= 5; } }
};

var LOCATION_KEYS = ['forest', 'beach', 'mountain', 'village'];

var ExploreSystem = {
  update: function(st) {
    var locs = st.story.locs;

    for (var i = 0; i < LOCATION_KEYS.length; i++) {
      var k = LOCATION_KEYS[i];
      var loc = locs[k];

      // Check unlock condition for locked locations
      if (loc.s === LOC.LOCKED) {
        if (LOCATION_UNLOCK[k].check(st)) {
          fsmTransition(loc, LOC.PREVIEW, 10);
          EventBus.emit('location:preview', {
            type: 'location:preview', data: { id: k }, st: st
          });
        }
        continue;
      }

      // Auto-advance PREVIEW → UNLOCKED after duration
      if (loc.s === LOC.PREVIEW) {
        loc.t++;
        if (loc.t >= loc.d) {
          fsmTransition(loc, LOC.UNLOCKED, -1);
          EventBus.emit('location:unlocked', {
            type: 'location:unlocked', data: { id: k }, st: st
          });
        }
      }
    }
  }
};
