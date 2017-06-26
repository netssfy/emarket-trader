'use strict';

const config = require('config');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const eventManager = require('./events/event-manager');

async function main() {
  await initDB();
  await initCollector();
  await initSocketServer();
}

async function initDB() {
  const Sequelize = require('sequelize');

  const mysql = config.storage.mysql;
  const sequelize = new Sequelize(mysql.database, mysql.username, mysql.password, mysql.options);
  await sequelize.authenticate();
  const rootPath = './models';
  const files = fs.readdirSync(rootPath);
  for (let file of files) {
    let modelDefineList = require(path.resolve(rootPath, file));
    for (let modelDefine of modelDefineList) {
      let model = sequelize.define(modelDefine.name, modelDefine.schema, { indexes: modelDefine.indexes });
      await model.sync();

      _.set(Sequelize, `models.${modelDefine.name}`, model);
      console.log(`sync ${modelDefine.name} done`);
    }
  }
}

async function initCollector() {
  const rootPath = './collector';
  const modules = fs.readdirSync(rootPath);
  for (let moduleName of modules) {
    let collector = require(path.resolve(rootPath, moduleName));
    console.log(`start collector ${moduleName}`)
    collector.start();
  }
}

async function initSocketServer() {
  const appConfig = config.app;
  const server = require('http').createServer();
  const aggregator = require('./aggregator/jubi');
  const configEvent = eventManager.getConfigEvent('jubi');

  server.listen(appConfig.port);

  const io = require('socket.io')(server);
  io.on('connection', socket => {
    console.log('client connect in');

    const tickEvent = eventManager.getTickEvent('jubi');

    tickEvent.on(async function(data) {
      data = await aggregator('tick', data);
      socket.emit('ticks', data);
    });

    const depthEvent = eventManager.getDepthEvent('jubi');

    depthEvent.on(data => {
      socket.emit('depth', data);
    });

    //receive from client
    socket.on('active-coin-change', coin => {
      console.log(`active coin change to ${coin}`);
      configEvent.fireActiveCoinChange(coin);
    });

    //主动请求获取7日成交价格-成交量关系
    socket.on('order-amount-by-price', async function(coin) {
      const rows = await aggregator('order-amount-by-price', coin);
      socket.emit('order-amount-by-price', rows);
    })
  });
}

main();