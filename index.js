'use strict';

const jubiapi = require('./jubiapi');

async function test() {
  const result = await jubiapi.getTicker('btc');
  console.log(result);
}

test();