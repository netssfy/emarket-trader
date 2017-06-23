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

  server.listen(appConfig.port);

  const io = require('socket.io')(server);
  io.on('connection', socket => {
    console.log('client connect in');

    const tickEvent = eventManager.getTickEvent('jubi');

    tickEvent.on(data => {
      data = aggregator('tick', data);
      socket.emit('ticks', data);
    });
    
    const trendEvent = eventManager.getTrendEvent('jubi');
    
    trendEvent.on(data => {
      aggregator('trend', data);
    });
  });
}

main();