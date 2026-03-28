// js/story/EventBus.js
// Double-buffer deferred event bus
// Systems emit() during update, flush() delivers all at once after all systems ran
// Re-entrant safe: emit during flush goes to next flush cycle

var EventBus = (function() {
  var _listeners = {};
  var _queue = [];
  var _swap  = [];

  function _callSafe(fn, data) {
    try { fn(data); } catch(e) { /* isolate listener errors */ }
  }

  return {
    on: function(event, fn) {
      (_listeners[event] || (_listeners[event] = [])).push({ fn: fn, once: false });
    },

    once: function(event, fn) {
      (_listeners[event] || (_listeners[event] = [])).push({ fn: fn, once: true });
    },

    off: function(event, fn) {
      var ls = _listeners[event];
      if (!ls) return;
      for (var i = ls.length - 1; i >= 0; i--) {
        if (ls[i].fn === fn) ls.splice(i, 1);
      }
    },

    emit: function(event, data) {
      _queue.push({ event: event, data: data });
    },

    flush: function() {
      if (_queue.length === 0) return;
      var tmp = _swap;
      _swap = _queue;
      _queue = tmp;
      _queue.length = 0;

      for (var i = 0; i < _swap.length; i++) {
        var e  = _swap[i];
        var ls = _listeners[e.event];
        if (!ls || ls.length === 0) continue;
        var hasOnce = false;
        for (var j = 0; j < ls.length; j++) {
          _callSafe(ls[j].fn, e.data);
          if (ls[j].once) hasOnce = true;
        }
        if (hasOnce) {
          _listeners[e.event] = ls.filter(function(l) { return !l.once; });
        }
      }
    },

    _reset: function() {
      _listeners = {};
      _queue = [];
      _swap = [];
    }
  };
})();
