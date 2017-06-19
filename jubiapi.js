'use strict';

const request = require('request-promise');
const config = require('config');
const qs = require('querystring');
const crypto = require('crypto');

const key = config.key;
const secret = config.secret;

function sign(params) {
  params.nonce = Date.now();
  params.key = key;

  const toSignStr = qs.stringify(params);
  params.signature = crypto.createHmac('sha256', secret).update(toSignStr).digest('hex');
  return params;
}

async function getTicker(coin) {
  const params = { coin };
  sign(params);

  const result = await request('https://www.jubi.com/api/v1/ticker/', { method: 'post', body: params, json: true });
  return result;
}

module.exports = {
  getTicker
};