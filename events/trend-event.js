'use strict';

const Event = require('events');

class TrendEvent extends Event {
  constructor(market) {
    super();
    this.market = market;
  }

  emit(data) {
    super.emit(this.market, data);
  }

  on(cb) {
    super.on(this.market, cb);
  }
}

module.exports = TrendEvent;