// js/story/SeasonSystem.js
// Real date-based season FSM

var SeasonSystem = {
  update: function(st) {
    var m = new Date().getMonth(); // 0-11
    var next;
    if      (m >= 2 && m <= 4)  next = SEASON.SPRING;
    else if (m >= 5 && m <= 7)  next = SEASON.SUMMER;
    else if (m >= 8 && m <= 10) next = SEASON.FALL;
    else                         next = SEASON.WINTER;

    if (fsmTransition(st.story.season, next, -1)) {
      EventBus.emit('season:changed', {
        type: 'season:changed',
        prev: st.story.season.p,
        next: st.story.season.s,
        st: st
      });
    }
  }
};
