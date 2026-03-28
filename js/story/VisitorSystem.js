// js/story/VisitorSystem.js
// Visitor FSM: ABSENT → APPROACHING → PRESENT → DEPARTING → ABSENT

var VisitorSystem = {
  update: function(st) {
    var v = st.story.visitor;
    v.t++;

    switch (v.s) {
      case VISITOR.ABSENT:
        if (v.t < v.d) return;
        var who = pickVisitor(st);
        if (!who) { v.t = 0; return; } // no eligible visitors yet
        v.x = who;
        fsmTransition(v, VISITOR.APPROACHING, 5);
        EventBus.emit('visitor:approaching', {
          type: 'visitor:approaching', data: who, st: st
        });
        break;

      case VISITOR.APPROACHING:
        if (v.t < v.d) return;
        fsmTransition(v, VISITOR.PRESENT, 120);
        EventBus.emit('visitor:arrived', {
          type: 'visitor:arrived', data: v.x, st: st
        });
        break;

      case VISITOR.PRESENT:
        if (v.t < v.d) return;
        fsmTransition(v, VISITOR.DEPARTING, 5);
        EventBus.emit('visitor:departing', {
          type: 'visitor:departing', data: v.x, st: st
        });
        break;

      case VISITOR.DEPARTING:
        if (v.t < v.d) return;
        v.x = null;
        fsmTransition(v, VISITOR.ABSENT, 300 + Math.floor(Math.random() * 600));
        EventBus.emit('visitor:departed', {
          type: 'visitor:departed', st: st
        });
        break;
    }
  }
};
