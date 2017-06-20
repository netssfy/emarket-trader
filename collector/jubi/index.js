'use strict';

const api = require('../../exchange-api/jubi');
const CronJob = require('node-cron').schedule;
const _ = require('lodash');

async function start() {
  //get all ticks for available coin names
  const allTicks = await api.getAllTickers();
  const coinNames = _.keys(allTicks);

  //get all coin ticks every second
  const job1 = CronJob('0-59 * * * * *', async function() {
    console.log('job1');
  })
  job1.start();
  //get all coin depth every second
  const job2 = CronJob('0-59 * * * * *', async function() {
    console.log('job2');
  })
  job2.start();

  //get all coin orders every second
  const job3 = CronJob('0-59 * * * * *', async function() {
    console.log('job3');
  })
  job3.start();
}

module.exports = {
  start
};