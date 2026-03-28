// js/story/TimeSystem.js
// Real clock-based time-of-day FSM
// States: DAWN(5-7), MORNING(7-12), NOON(12-17), DUSK(17-20), NIGHT(20-5)

var TimeSystem = {
  update: function(st) {
    var h = new Date().getHours();
    var next;
    if      (h >= 5  && h < 7)  next = TIME.DAWN;
    else if (h >= 7  && h < 12) next = TIME.MORNING;
    else if (h >= 12 && h < 17) next = TIME.NOON;
    else if (h >= 17 && h < 20) next = TIME.DUSK;
    else                         next = TIME.NIGHT;

    if (fsmTransition(st.story.time, next, -1)) {
      EventBus.emit('time:changed', {
        type: 'time:changed',
        prev: st.story.time.p,
        next: st.story.time.s,
        st: st
      });
    }
  }
};
