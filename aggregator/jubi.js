'use strict';

const moment = require('moment');
const _ = require('lodash');

let gTrends = null;

function aggregate(type, data) {
  if (type == 'trend') {
    gTrends = data;
    return null;
  } else if (type == 'tick') {
    const result = [];
    for (let row of data) {
      result.push(_proccess(row));
    }
    return result;
  }
}

module.exports = aggregate;

function _proccess(row) {
  const result = _.pick(row, ['name', 'high', 'low', 'last', 'buy', 'sell']);
  result['时刻'] = moment(row.timestamp).format('hh:mm:ss');
  result['24H量'] = row.amount.toLocaleString();
  result['24H额'] = row.volume.toLocaleString
  result['N价格位置'] = _normalizePricePosition(row.high, row.low, row.last);
  result['N价格方差'] = _normalizeHighLowSquareError(result['N价格位置']);
  result['买卖差%'] = _diffBetweenBuySell(row.buy, row.sell);

  const trend = _.get(gTrends, result.name);
  if (trend) {
    result['日涨跌%'] = ((result.last - trend.yprice) / trend.yprice * 100).toFixed(2);
  }

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