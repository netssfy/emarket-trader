'use strict';

const Event = require('events');

class BarEvent extends Event {
  constructor(market) {
    super();
    this.market = market;
  }

  emit(type, data) {
    super.emit(this.market + type, data);
  }

  on(type, cb) {
    super.on(this.market + type, cb);
  }

  fireMinuteBars(data) {
    this.emit('minute-bar', data);
  }

  onMintueBars(cb) {
    this.on('minute-bar', cb);
  }
}

module.exports = BarEvent;