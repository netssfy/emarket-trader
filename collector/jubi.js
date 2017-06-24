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
  const trendEvent = eventManager.getTrendEvent('jubi');

  const TickModel = Sequelize.models.JubiTick;
  //get all coin ticks every second
  const tickJob = CronJob('0-59/5 * * * * *', async function() {
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
  
  const DepthModel = Sequelize.models.JubiDepth;
  let index = 0;
  const COLLECT_NUM = 10;
  //get depth 5 by 5
  const depthJob = CronJob('0-59/5 * * * * *', async function() {
    console.log(`collecting jubi ${COLLECT_NUM} depth`);
    const awaitList = [];
    const nameIndice = [];
    for (let i = 0; i < COLLECT_NUM; i++) {
      index = (index + i) % coinNames.length;
      let name = coinNames[index];
      awaitList.push(api.getDepthByWeb(name).catch(err => null));
      nameIndice.push(index);
    }

    const depthList = await Promise.all(awaitList);
    const newRows = [];

    for (let i = 0; i < nameIndice.length; i++) {
      let nameIndex = nameIndice[i];
      let name = coinNames[nameIndex];
      let depth = depthList[i];
      if (!depth) continue;

      newRows.push({
        name: name,
        timestamp: Date.now(),
        asks: JSON.stringify(depth.asks),
        bids: JSON.stringify(depth.bids)
      });
    }

    //don't wait;
    DepthModel.bulkCreate(newRows);
  }, false);

  const configEvent = eventManager.getConfigEvent('jubi');
  let activeCoin = null;

  configEvent.onActiveCoinChange(coin => activeCoin = coin);
  
  const activeDepthJob = CronJob('0-59/5 * * * * *', async function() {
    if (!activeCoin) return;

    console.log(`collecting jubi ${activeCoin} depth`);
    const depth = await api.getDepth(activeCoin).catch(err => null);
    if (!depth) return;

    depth.name = activeCoin;
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

  //get trends at 00:00:00
  const doTrendJob = async function() {
    console.log('collecting jubi trend');
    const trends = await api.getTrands();

    trendEvent.emit(trends);
  }

  const trendJob = CronJob('0-1 0 0 * * *', trendEvent, false);

  tickJob.start();
  trendJob.start();
  depthJob.start();
  activeDepthJob.start();
  //job3.start();
  await doTrendJob();
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