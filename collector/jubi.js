'use strict';

const api = require('../exchange-api/jubi');
const CronJob = require('node-cron').schedule;
const _ = require('lodash');
const eventManager = require('../events/event-manager');
const Sequelize = require('sequelize');
const moment = require('moment');
const config = require('config');

const mysql = config.storage.mysql;
const dbConn = new Sequelize(mysql.database, mysql.username, mysql.password, mysql.options);
const OrderModel = Sequelize.models.JubiOrders;

async function start() {  
  //get all ticks for available coin names
  const allTicks = await api.getAllTicks();
  const coinNames = _.keys(allTicks);
  const tickEvent = eventManager.getTickEvent('jubi');
  const depthEvent = eventManager.getDepthEvent('jubi');
  const orderEvent = eventManager.getOrderEvent('jubi');
  const trendEvent = eventManager.getTrendEvent('jubi');
  const notificationEvent = eventManager.getNotificationEvent('jubi');

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
  const OrderModel = Sequelize.models.JubiOrders;
  let index2 = 0;
  const orderJob = CronJob('0-59/5 * * * * *', async function() {
    console.log(`collecting jubi ${COLLECT_NUM} orders`);
    const awaitList = [];
    const nameIndice = [];
    for (let i = 0; i < COLLECT_NUM; i++, index2++) {
      index2 = index2 % coinNames.length;
      let name = coinNames[index2];
      awaitList.push(api.getOrders(name).catch(err => null));
      nameIndice.push(index2);
    }

    const ordersList = await Promise.all(awaitList);
    const newRows = [];

    for (let i = 0; i < nameIndice.length; i++) {
      let nameIndex = nameIndice[i];
      let name = coinNames[nameIndex];
      let orders = ordersList[i];
      if (!orders) continue;

      for (let order of orders) {
        newRows.push({
          name: name,
          timestamp: +order.date * 1000,
          price: order.price,
          amount: order.amount,
          tid: order.tid,
          type: order.type
        });
      }
    }

    //don't wait;
    OrderModel.bulkCreate(newRows, { ignoreDuplicates: true });
  }, false);

  //get trends at 00:00:00
  const doTrendJob = async function() {
    console.log('collecting jubi trend');
    const trends = await api.getTrands();

    trendEvent.emit(trends);
    return trends;
  }

  const trendJob = CronJob('0 0 * * * *', trendEvent, false);

  const _28Job = CronJob('0-59/30 * * * * *', async function() {
    console.log('collecting 28 BigOrders');

    const awaitList = [];
    for (let coin of coinNames) {
      awaitList.push(_28principle(coin, 2));
    }

    const resultList = await Promise.all(awaitList);
    const result = _.zipObject(coinNames, resultList);

    notificationEvent.emit('28BigOrders', result);
  }, false);

  tickJob.start();
  trendJob.start();
  depthJob.start();
  activeDepthJob.start();
  orderJob.start();
  _28Job.start();
  let trends = null;
  do {
    trends = await doTrendJob();
  } while(_.isEmpty(trends));
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

//二八原则
async function _28principle(coin, hours) {
  const start = moment().subtract(hours, 'hours').valueOf();
  const end = moment().valueOf();

  let result = await dbConn.query(
    `select sum(amount) as amount,count(1) as count from ${OrderModel.getTableName()}
    where name = :name and timestamp < :end and timestamp > :start`, {
      replacements: {
        name: coin,
        start,
        end
      }
    }
  );

  const limit = parseInt(0.2 * result[0][0].count);
  const totalAmount = result[0][0].amount;

  result = await dbConn.query(
    `select sum(amount) as amount from (
      select amount from ${OrderModel.getTableName()} where name = :name and timestamp < :end and timestamp > :start order by amount desc limit :limit
    ) as t`, {
      replacements: {
        name: coin,
        start,
        end,
        limit
      }
    }
  );

  const _20Amount = result[0][0].amount;
  return _20Amount / totalAmount > 0.8;
}