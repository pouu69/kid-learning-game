// js/story/Constants.js
// Integer enum constants — shared by all story systems
// O(1) switch-case, smaller serialization than strings

var TIME    = { DAWN:0, MORNING:1, NOON:2, DUSK:3, NIGHT:4 };
var WEATHER = { SUNNY:0, CLOUDY:1, RAINY:2, SNOWY:3, THUNDER:4, RAINBOW:5 };
var SEASON  = { SPRING:0, SUMMER:1, FALL:2, WINTER:3 };
var VISITOR = { ABSENT:0, APPROACHING:1, PRESENT:2, DEPARTING:3 };
var LOC     = { LOCKED:0, PREVIEW:1, UNLOCKED:2, VISITING:3 };

// FSM node record — every system uses same structure
// s=current state, p=prev (for transition anim), t=elapsed ticks,
// d=duration (-1=external trigger), f=dirty flag, x=extra data
function fsmNode(initialState, duration) {
  return { s: initialState, p: -1, t: 0, d: duration, f: true, x: null };
}

// FSM transition — intentional mutation + dirty flag (game loop pattern)
// Returns true if state changed, false if same state (no-op)
function fsmTransition(node, newState, duration) {
  if (node.s === newState) return false;
  node.p = node.s;
  node.s = newState;
  node.t = 0;
  node.d = duration;
  node.f = true;
  return true;
}

// Migration helper — ensures st.story exists for legacy saves
function migrateStory(st) {
  if (st.story) return;
  st.story = {
    time:    fsmNode(TIME.MORNING,  -1),
    weather: fsmNode(WEATHER.SUNNY, 300),
    season:  fsmNode(SEASON.SPRING,  -1),
    visitor: fsmNode(VISITOR.ABSENT, 600),
    locs: {
      forest:   fsmNode(LOC.LOCKED, -1),
      beach:    fsmNode(LOC.LOCKED, -1),
      mountain: fsmNode(LOC.LOCKED, -1),
      village:  fsmNode(LOC.LOCKED, -1)
    }
  };
}
