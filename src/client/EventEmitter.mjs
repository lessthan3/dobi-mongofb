export default class EventEmitter {
  constructor() {
    this.events = {};
  }

  emit(event, ...args) {
    if (!this.events[event]) { return; }
    for (const handler of this.events[event]) {
      handler(...args || []);
    }
  }

  on(event, handler) {
    if (this.events[event] == null) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  // handler=null will remove all events of that type
  off(event, handler = null) {
    if (this.events[event] == null) {
      this.events[event] = [];
    }
    this.events[event] = this.events[event].filter(fn => (
      handler !== null && fn !== handler
    ));
  }
}
