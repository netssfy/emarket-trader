'use strict';

const Event = require('events');

class NotificationEvent extends Event {
  constructor(market) {
    super();
    this.market = market;
  }

  emit(msg, data) {
    super.emit(this.market + msg, data);
  }

  on(msg, cb) {
    super.on(this.market + msg, cb);
  }
}

module.exports = NotificationEvent;