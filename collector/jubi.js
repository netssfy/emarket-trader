'use strict';

const api = require('../exchange-api/jubi');
const CronJob = require('node-cron').schedule;
const _ = require('lodash');
const eventManager = require('../events/event-manager');
const Sequelize = require('sequelize');

async function start() {
  //get all ticks for available coin names
  const allTicks = await api.getAllTicks();
  const coinNames = _.keys(allTicks);
  const tickEvent = eventManager.getTickEvent('jubi');
  const depthEvent = eventManager.getDepthEvent('jubi');
  const orderEvent = eventManager.getOrderEvent('jubi');

  const TickModel = Sequelize.models.JubiTick;
  //get all coin ticks every second
  const job1 = CronJob('0-59/5 * * * * *', async function() {
    console.log('collecting jubi ticks');
    const ticks = await api.getAllTicks();
    //{ coin1: {}, coin2: {}}
    const newTickRows = [];
    for (let coin in ticks) {
      let tick = ticks[coin];
      let row = _createRowFromJSON(coin, tick);
      newTickRows.push(row);
    }

    await TickModel.bulkCreate(newTickRows);
    tickEvent.emit(newTickRows);
  }, false);
  
  //get all coin depth every second
  const job2 = CronJob('0-59 * * * * *', async function() {
    console.log('collecting jubi depth');
    const awaitList = [];
    for (let name of coinNames) {
      awaitList.push(api.getDepth(name));
    }
    
    const depthList = await Promise.all(awaitList);
    const depth = _.zipObject(coinNames, depthList);

    depthEvent.emit(depth);
  }, false);
  
  //get all coin orders every second
  const job3 = CronJob('0-59 * * * * *', async function() {
    console.log('collecting jubi orders');
    const awaitList = [];
    for (let name of coinNames) {
      awaitList.push(api.getOrders(name));
    }
    
    const ordersList = await Promise.all(awaitList);
    const orders = _.zipObject(coinNames, ordersList);

    orderEvent.emit(orders);
  }, false);

  job1.start();
  //job2.start();
  //job3.start();
}

module.exports = {
  start
};

function _createRowFromJSON(coin, tick) {
  const row = {
    name: coin,
    timestamp: Date.now(),
    high: tick.high,
    low: tick.low,
    buy: tick.buy,
    sell: tick.sell,
    last: tick.last,
    amount: tick.vol,
    volume: tick.volume
  }

  return row;
}