'use strict';

const TickEvent = require('./tick-event');
const DepthEvent = require('./depth-event');
const OrderEvent = require('./order-event');
const TrendEvent = require('./trend-event');
const ConfigEvent = require('./config-event');
const NotificationEvent = require('./notification-event');

const TICK_EVENT_KEY = 'TICK_EVENT_KEY';
const DEPTH_EVENT_KEY = 'DEPTH_EVENT_KEY';
const ORDER_EVENT_KEY = 'ORDER_EVENT_KEY';
const TREND_EVENT_KEY = 'TREND_EVENT_KEY';
const CONFIG_EVENT_KEY = 'CONFIG_EVENT_KEY';
const NOTIFICATION_EVENT_KEY = 'NOTIFICAITON_EVENT_KEY';

class EventManager {
  constructor() {
    this.events = new Map();
  }

  getTickEvent(market) {
    const key = `${TICK_EVENT_KEY}-${market}`;
    let event = this.events.get(key);
    if (!event) {
      event = new TickEvent(market);
      this.events.set(key, event);
    }

    return event;
  }

  getDepthEvent(market) {
    const key = `${DEPTH_EVENT_KEY}-${market}`;
    let event = this.events.get(key);
    if (!event) {
      event = new DepthEvent(market);
      this.events.set(key, event);
    }

    return event;
  }

  getOrderEvent(market) {
    const key = `${ORDER_EVENT_KEY}-${market}`;
    let event = this.events.get(key);
    if (!event) {
      event = new OrderEvent(market);
      this.events.set(key, event);
    }

    return event; 
  }

  getTrendEvent(market) {
    const key = `${TREND_EVENT_KEY}-${market}`;
    let event = this.events.get(key);
    if (!event) {
      event = new TrendEvent(market);
      this.events.set(key, event);
    }

    return event; 
  }

  getConfigEvent(market) {
    const key = `${CONFIG_EVENT_KEY}-${market}`;
    let event = this.events.get(key);
    if (!event) {
      event = new ConfigEvent(market);
      this.events.set(key, event);
    }

    return event; 
  }

  getNotificationEvent(market) {
    const key = `${NOTIFICATION_EVENT_KEY}-${market}`;
    let event = this.events.get(key);
    if (!event) {
      event = new NotificationEvent(market);
      this.events.set(key, event);
    }

    return event; 
  }
}

module.exports = new EventManager();