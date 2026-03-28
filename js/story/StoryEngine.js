// js/story/StoryEngine.js
// Facade — single entry point for all story systems

var StoryEngine = (function() {
  var _systems = [];
  var _inited  = false;

  return {
    init: function(st) {
      if (_inited) return;
      migrateStory(st);
      _systems = [
        TimeSystem,
        WeatherSystem,
        SeasonSystem,
        VisitorSystem,
        ExploreSystem
      ];
      for (var i = 0; i < _systems.length; i++) {
        if (_systems[i].init) _systems[i].init(st);
      }
      WorldRenderer.init();
      _inited = true;
    },

    update: function(st) {
      if (!_inited) return;
      for (var i = 0; i < _systems.length; i++) {
        _systems[i].update(st);
      }
      EventBus.flush();
    },

    pause: function() {
      for (var i = 0; i < _systems.length; i++) {
        if (_systems[i].pause) _systems[i].pause();
      }
    }
  };
})();
