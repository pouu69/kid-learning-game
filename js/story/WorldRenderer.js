// js/story/WorldRenderer.js
// EventBus subscriber — maps story events to visual/audio reactions
// All notifications use emoji + sound only (no text, for 5-7yo pre-readers)

var SEASON_EMOJI = ['\uD83C\uDF38', '\u2600\uFE0F', '\uD83C\uDF42', '\u2744\uFE0F'];
var SEASON_SOUND = ['sparkle', 'correct', 'wind', 'wind'];

var LOCATION_EMOJI = {
  forest:   '\uD83C\uDF32',
  beach:    '\uD83C\uDFD6\uFE0F',
  mountain: '\u26F0\uFE0F',
  village:  '\uD83C\uDFD8\uFE0F'
};

var WorldRenderer = {
  init: function() {
    EventBus.on('time:changed', function(e) {
      if (typeof World !== 'undefined') {
        World.updateTimeOfDay();
      }
    });

    EventBus.on('weather:changed', function(e) {
      if (typeof World === 'undefined') return;
      var prev = e.prev, next = e.next;

      if (prev === WEATHER.RAINY || prev === WEATHER.THUNDER) World._stopRain();
      if (prev === WEATHER.SNOWY && World._stopSnow) World._stopSnow();

      switch (next) {
        case WEATHER.RAINY:
          World._startRain();
          playSound('rain');
          break;
        case WEATHER.SNOWY:
          if (World._startSnow) World._startSnow();
          playSound('wind');
          break;
        case WEATHER.THUNDER:
          World._startRain();
          if (World._flashLightning) World._flashLightning();
          playSound('thunder');
          break;
        case WEATHER.RAINBOW:
          if (World._showRainbow) World._showRainbow();
          playSound('sparkle');
          break;
        case WEATHER.SUNNY:
          break;
      }

      WorldRenderer._petReact(next);
    });

    EventBus.on('season:changed', function(e) {
      if (typeof World !== 'undefined' && World._updateSeasonPalette) {
        World._updateSeasonPalette(e.next);
      }
      WorldRenderer._showNotification(SEASON_EMOJI[e.next], SEASON_SOUND[e.next]);
    });

    EventBus.on('visitor:approaching', function(e) {
      WorldRenderer._showVisitorSilhouette(e.data);
      playSound('click');
    });

    EventBus.on('visitor:arrived', function(e) {
      WorldRenderer._showVisitor(e.data);
      WorldRenderer._showNotification(e.data.emoji, 'correct');
    });

    EventBus.on('visitor:departing', function(e) {
      WorldRenderer._hideVisitor(e.data);
    });

    EventBus.on('location:preview', function(e) {
      WorldRenderer._showNotification(LOCATION_EMOJI[e.data.id], 'click');
    });

    EventBus.on('location:unlocked', function(e) {
      if (typeof PetRenderer !== 'undefined') {
        PetRenderer.celebrate();
        PetRenderer.emitParticles('star', 8);
      }
      playSound('evolve');
    });
  },

  _showNotification: function(emoji, soundType) {
    if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble) {
      PetRenderer.showPixiBubble(emoji, 180);
    }
    if (soundType) playSound(soundType);
  },

  _petReact: function(weather) {
    if (typeof PetRenderer === 'undefined') return;
    switch (weather) {
      case WEATHER.RAINY:
        PetRenderer.showPixiBubble('\u2602\uFE0F', 120);
        break;
      case WEATHER.SNOWY:
        PetRenderer.showPixiBubble('\u2744\uFE0F', 120);
        PetRenderer.emitParticles('star', 3);
        break;
      case WEATHER.THUNDER:
        PetRenderer.wiggle();
        PetRenderer.showPixiBubble('\uD83D\uDE28', 120);
        break;
      case WEATHER.RAINBOW:
        PetRenderer.celebrate();
        PetRenderer.showPixiBubble('\uD83C\uDF08', 180);
        break;
      case WEATHER.SUNNY:
        PetRenderer.showPixiBubble('\u2600\uFE0F', 90);
        break;
    }
  },

  _showVisitorSilhouette: function(visitor) {
    // TODO Phase 2: draw silhouette at screen edge
  },
  _showVisitor: function(visitor) {
    if (typeof PetRenderer !== 'undefined' && PetRenderer.showPixiBubble) {
      PetRenderer.showPixiBubble(visitor.emoji, 180);
    }
  },
  _hideVisitor: function(visitor) {
    // TODO Phase 2: walk-out animation
  }
};
