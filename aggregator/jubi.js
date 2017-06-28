'use strict';

const moment = require('moment');
const _ = require('lodash');
const eventManager = require('../events/event-manager');
const config = require('config');
const Sequelize = require('sequelize');

let gTrends = null;

const trendEvent = eventManager.getTrendEvent('jubi');
trendEvent.on(data => {
  gTrends = data;
});

const mysql = config.storage.mysql;
const dbConn = new Sequelize(mysql.database, mysql.username, mysql.password, mysql.options);
const OrderModel = Sequelize.models.JubiOrders;

async function aggregate(type, data) {
  if (type == 'tick') {
    const result = [];
    for (let row of data) {
      result.push(_proccess(row));
    }
    return result;
  } else if (type == 'order-amount-by-price') {
    return await _getAmountByPrice(data); 
  }
}

_getAmountByPrice('mryc');

module.exports = aggregate;

function _proccess(row) {
  let result = _.pick(row, ['name', 'high', 'low', 'last', 'buy', 'sell']);
  result['时刻'] = moment(row.timestamp).format('hh:mm:ss');
  result['24H量'] = row.amount.toLocaleString();
  result['24H额'] = row.volume.toLocaleString();
  result['N价格位置'] = _normalizePricePosition(row.high, row.low, row.last);
  result['N价格方差'] = _normalizeHighLowSquareError(result['N价格位置']);
  result['买卖差%'] = _diffBetweenBuySell(row.buy, row.sell);

  const trend = _.get(gTrends, result.name);
  if (trend) {
    result['日涨跌%'] = ((result.last - trend.yprice) / trend.yprice * 100).toFixed(2);

    const thresholds = {
      '20%涨幅距今(天)': 1.2,
      '10%涨幅距今(天)': 1.1
    };

    let waveDate = _lastWaveSinceNow(trend, thresholds);

    for (let name in thresholds) {
      result[name] = waveDate[name];
    }

  }

  result = _.omit(result, ['high', 'low']);
  return result;
}

//归一化价格位置%,距离24H低位的位置
function _normalizePricePosition(high, low, x) {
  const range = high - low;
  const pos = (x - low) / (high - low);
  return pos.toFixed(3);
}
//归一化价格方差 [0.5, 1],越低越好
function _normalizeHighLowSquareError(nPos) {
  const val = Math.pow(1 - nPos, 2) + Math.pow(nPos, 2);
  return +val.toFixed(3);
}
//买一卖一价格差百分比
function _diffBetweenBuySell(buy, sell) {
  const val = (sell - buy) / buy * 100;
  return val.toFixed(3) + '%';
}

//最近一次日涨幅超过20%距今小时
function _lastWaveSinceNow(trend, thresholds) {
  const list = trend.data;
  let barList = [];
  let dayBar = null;
  let currDate = null;
  //将3小时bar聚合成日bar
  for (let trend of list) {
    let price = trend[1];
    let time = trend[0];
    let date = moment(time * 1000);
    if (!currDate || date.diff(currDate, 'days') >= 1) {
      if (dayBar) {
        barList.push(dayBar);
      }
      currDate = date;
      dayBar = {
        high: price,
        low: price,
        date: date
      };
    } else {
      if (price > dayBar.high)
        dayBar.high = price;
      if (price < dayBar.low)
        dayBar.low = price;
    }
  }

  if (dayBar) {
    barList.push(dayBar);
  }

  barList = _.sortBy(barList, { date: -1 });
  
  const result = {};
  for (let name in thresholds) {
    result[name] = '> 3';
    let threshold = thresholds[name];

    for (let bar of barList) {
      if (bar.high / bar.low >= threshold) {
        result[name] = ((Date.now() - bar.date.valueOf()) / 86400000).toFixed(1);
        break;
      }
    }
  }

  return result;
}

//获取7日成交价格-成交量关系
async function _getAmountByPrice(data) {
  const coin = data.coin;
  const hours = parseInt(data.hours) || 72;
  const sql = 
  `select name, price, sum(amount) as amount, count(1) as count, type from ${OrderModel.getTableName()} 
  where name = :name and timestamp < :end and timestamp > :start 
  group by price, type
  order by price desc`
  let rows = await dbConn.query(sql, { 
    model: OrderModel, 
    replacements: {
      name: coin,
      start: moment().subtract(hours, 'hours').valueOf(),
      end: moment().valueOf(),
    }
  });

  let sum = 0;
  let buySum = 0;
  let sellSum = 0;
  for (let row of rows) {
    row.amount = parseFloat(row.amount);
    row.price = parseFloat(row.price);
    sum += row.amount;
    if (row.type == 'buy')
      buySum += row.amount;
    else
      sellSum += row.amount;
  }

  const avg = sum / rows.length;
  const list = _.orderBy(_.filter(rows, r => r.amount >= avg), 'amount', 'asc');
  const buyList = _.filter(rows, r => r.type == 'buy');
  const buyAvg = buySum / buyList.length;
  const sellList = _.filter(rows, r => r.type == 'sell');
  const sellAvg = sellSum / sellList.length;
  return {
    list,
    avg,
    buyList: _.orderBy(_.filter(buyList, r => r.amount >= buyAvg), 'amount', 'asc'),
    buyAvg,
    sellList: _.orderBy(_.filter(sellList, r => r.amount >= sellAvg), 'amount', 'asc'),
    sellAvg
  }
}