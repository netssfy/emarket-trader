'use strict';

const Event = require('events');

class ConfigEvent extends Event {
  constructor(market) {
    super();
    this.market = market;
  }

  emit(config, value) {
    super.emit(this.market + config, data);
  }

  on(config, cb) {
    super.on(this.market + config, cb);
  }

  fireActiveCoinChange(coin) {
    super.emit(this.market + 'active-coin-change', coin);
  }

  onActiveCoinChange(cb) {
    super.on(this.market + 'active-coin-change', cb);
  }
}

module.exports = ConfigEvent;