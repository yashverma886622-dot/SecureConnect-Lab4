const EventEmitter = require("events");

// A shared EventEmitter instance for application-wide custom events.
const eventBus = new EventEmitter();
eventBus.setMaxListeners(20);

module.exports = { eventBus };
