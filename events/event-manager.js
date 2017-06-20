'use strict';

const TickEvent = require('./tick-event');
const DepthEvent = require('./depth-event');
const OrderEvent = require('./order-event');

const TICK_EVENT_KEY = 'TICK_EVENT_KEY';
const DEPTH_EVENT_KEY = 'DEPTH_EVENT_KEY';
const ORDER_EVENT_KEY = 'ORDER_EVENT_KEY';

class EventManager {
  constructor() {
    this.events = new Map();
  }

  getTickEvent(coin) {
    const key = `${TICK_EVENT_KEY}-${coin}`;
    let event = this.events.get(key);
    if (!event) {
      event = new TickEvent(coin);
      this.events.set(key, event);
    }

    return event;
  }

  getDepthEvent(coin) {
    const key = `${DEPTH_EVENT_KEY}-${coin}`;
    let event = this.events.get(key);
    if (!event) {
      event = new DepthEvent(coin);
      this.events.set(key, event);
    }

    return event;
  }

  getOrderEvent(coin) {
    const key = `${ORDER_EVENT_KEY}-${coin}`;
    let event = this.events.get(key);
    if (!event) {
      event = new OrderEvent(coin);
      this.events.set(key, event);
    }

    return event; 
  }
}

module.exports = new EventManager();