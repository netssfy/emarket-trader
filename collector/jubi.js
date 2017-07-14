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
const MinBarModel = Sequelize.models.JubiMinuteBars;

async function start() {  
  //get all ticks for available coin names
  const allTicks = await api.getAllTicks();
  const coinNames = _.keys(allTicks);
  const tickEvent = eventManager.getTickEvent('jubi');
  const depthEvent = eventManager.getDepthEvent('jubi');
  const orderEvent = eventManager.getOrderEvent('jubi');
  const trendEvent = eventManager.getTrendEvent('jubi');
  const notificationEvent = eventManager.getNotificationEvent('jubi');
  const barEvent = eventManager.getBarEvent('jubi');

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

    await OrderModel.bulkCreate(newRows, { ignoreDuplicates: true });
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

  const _waveJob = CronJob('0-59/5 * * * * *', async function() {
    console.log('collecting wave trend');

    const data = await wave(5);
    const result = _.filter(data, row => Math.abs(row.wave) >= 1.04);
    notificationEvent.emit('54wave', result);
  }, false);

  //分钟bar聚合
  async function doCreateMinBarJob() {
    //找出上一次处理的bar的时间, 如果不存在默认值就是0
    let result = await dbConn.query(
      `select max(timestamp) as timestamp from ${MinBarModel.getTableName()}`
    );

    let latestT = result[0][0].timestamp ? result[0][0].timestamp : 0;
    let nextT = latestT + 60000;
    //找最早那个未处理的时间点
    result = await dbConn.query(
      `select min(timestamp) as timestamp from ${OrderModel.getTableName()}
       where timestamp >= ${nextT}`
    );
    nextT = result[0][0].timestamp ? result[0][0].timestamp : nextT;

    const start = parseInt(nextT / 60000) * 60000;//对齐到分钟的开始
    const end = start + 60000;
    console.log(`create min bar at ${moment(start).format('YYYY-MM-DD HH:mm')}`);
    //一次只处理1分钟的数据
    const orders = await dbConn.query(
      `select * from ${OrderModel.getTableName()}
       where timestamp >= :start and timestamp < :end 
       order by timestamp asc`, {
        replacements: {
          start,
          end
        },
        model: OrderModel
      }
    );

    const newBars = [];
    if (!_.isEmpty(orders)) {
      let barDict = {};
      for (let order of orders) {
        let price = parseFloat(order.price);
        let amount = parseFloat(order.amount);
        //在这一分钟内
        let bar = barDict[order.name];
        if (!bar) {
          bar = barDict[order.name] = {};
          bar.open = price;
          bar.volume = 0;
          bar.amount = 0;
          bar.name = order.name;
          bar.timestamp = start;
          newBars.push(bar);
        }
        bar.high = _.max([bar.high, price]);
        bar.low = _.min([bar.low, price]);
        bar.close= price;
        bar.amount += amount;
        bar.volume += amount * price;
      }

      await MinBarModel.bulkCreate(newBars);
    }

    return newBars;
  }
  const _createMinBarJob = CronJob('0-59/5 * * * * *', doCreateMinBarJob, false);

  const _fetch8HoursMinBarJob = CronJob('0-59/30 * * * * *', async function() {
    console.log('fetch 8hours min bar');
    if (activeCoin) {
      const start = Date.now() - 8 * 3600 * 1000;
      const rows = await dbConn.query(
        `select * from ${MinBarModel.getTableName()}
        where timestamp >= :start and name = :name`, {
          model: MinBarModel,
          replacements: {
            start,
            name: activeCoin
          }
        }
      );

      barEvent.fireMinuteBars(rows);
    }
  }, false);

  let trends = null;
  do {
    trends = await doTrendJob();
  } while(_.isEmpty(trends));

  let bars = [];
  do {
    bars = await doCreateMinBarJob();
  } while(bars.length > 0)
  
  tickJob.start();
  trendJob.start();
  //depthJob.start();
  // activeDepthJob.start();
  orderJob.start();
  //_28Job.start();
  _waveJob.start();
  _createMinBarJob.start();
  _fetch8HoursMinBarJob.start();
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

//X时间内价格涨幅
async function wave(minAgo) {
  const start = moment().subtract(minAgo, 'minutes').valueOf();

  let rows = await dbConn.query(
    `select name, price, timestamp from ${OrderModel.getTableName()}
    where timestamp >= :start
    `, {
      model: OrderModel, 
      replacements: {
        start,
      }
    }
  );

  const dict = _.groupBy(rows, 'name');
  const result = [];
  for (let name in dict) {
    rows = dict[name];
    let max = 0;
    let min = Number.MAX_VALUE;
    let maxt = null;
    let mint = null;
    for (let row of rows) {
      if (row.price > max) {
        max = parseFloat(row.price);
        maxt = row.timestamp;
      }
      if (row.price < min) {
        min = parseFloat(row.price);
        mint = row.timestamp;
      }
    }

    result.push({ name, min, max, mint, maxt, wave: (max / min) * (maxt > mint ? 1 : -1) });
  }

  return result;
}