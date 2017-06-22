'use strict';

const moment = require('moment');
const _ = require('lodash');

function aggregate(data) {
  const result = [];
  for (let row of data) {
    result.push(_proccess(row));
  }
  return result;
}

module.exports = aggregate;

function _proccess(row) {
  const result = _.pick(row, ['name', 'high', 'low', 'last', 'buy', 'sell']);
  result['时刻'] = moment(row.timestamp).format('hh:mm:ss');
  result['24H量'] = row.amount.toLocaleString();
  result['24H额'] = row.volume.toLocaleString();
  result['N价格位置%'] = _normalizeStandardError(row.high, row.low, row.last);
  result['N价格方差'] = _normalizeHighLowSquareError(result['N价格位置%']);
  return result;
}

//归一化价格位置%
function _normalizePricePosition(high, low, x) {
  const range = high - low;
  const pos = (x - low) / (high - low);
  return pos.toFixed(3);
}

function _normalizeHighLowSquareError(nPos) {
  return Math.pow(1 - nPos, 2) + Math.pow(nPos, 2);
}