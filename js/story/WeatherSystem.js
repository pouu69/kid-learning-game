// js/story/WeatherSystem.js
// Probabilistic weather transitions with season bias

var WEATHER_TRANSITIONS = [
  /* SUNNY   → */ [{ to:WEATHER.CLOUDY, w:0.25 }, { to:WEATHER.SUNNY, w:0.75 }],
  /* CLOUDY  → */ [{ to:WEATHER.RAINY, w:0.35 }, { to:WEATHER.SUNNY, w:0.30 }, { to:WEATHER.SNOWY, w:0.05 }, { to:WEATHER.CLOUDY, w:0.30 }],
  /* RAINY   → */ [{ to:WEATHER.THUNDER, w:0.2 }, { to:WEATHER.CLOUDY, w:0.5 }, { to:WEATHER.RAINBOW, w:0.3 }],
  /* SNOWY   → */ [{ to:WEATHER.CLOUDY, w:0.6 }, { to:WEATHER.SNOWY, w:0.4 }],
  /* THUNDER → */ [{ to:WEATHER.RAINBOW, w:0.7 }, { to:WEATHER.CLOUDY, w:0.3 }],
  /* RAINBOW → */ [{ to:WEATHER.SUNNY, w:1.0 }]
];

// Season bias — ES5 compatible (no computed properties)
var SEASON_WEATHER_BIAS = {};
SEASON_WEATHER_BIAS[SEASON.WINTER] = {};
SEASON_WEATHER_BIAS[SEASON.WINTER][WEATHER.SNOWY]   = 3.0;
SEASON_WEATHER_BIAS[SEASON.WINTER][WEATHER.SUNNY]   = 0.3;
SEASON_WEATHER_BIAS[SEASON.SUMMER] = {};
SEASON_WEATHER_BIAS[SEASON.SUMMER][WEATHER.THUNDER] = 2.0;
SEASON_WEATHER_BIAS[SEASON.SUMMER][WEATHER.SUNNY]   = 1.5;
SEASON_WEATHER_BIAS[SEASON.SPRING] = {};
SEASON_WEATHER_BIAS[SEASON.SPRING][WEATHER.RAINBOW] = 2.0;

var WeatherSystem = {
  update: function(st) {
    var w = st.story.weather;
    w.t++;
    if (w.t < w.d) return;  // not yet time to evaluate transition

    var row  = WEATHER_TRANSITIONS[w.s];
    var bias = SEASON_WEATHER_BIAS[st.story.season.s];
    var next = weightedPick(row, bias);
    var dur  = 180 + Math.floor(Math.random() * 240); // 3-7 min

    if (fsmTransition(w, next, dur)) {
      EventBus.emit('weather:changed', {
        type: 'weather:changed',
        prev: w.p,
        next: w.s,
        st: st
      });
    } else {
      // Same weather continues — reset timer
      w.t = 0;
      w.d = dur;
    }
  }
};
