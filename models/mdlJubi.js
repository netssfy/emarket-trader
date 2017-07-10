'use strict';

const Sequelize = require('sequelize');

module.exports = [
  {
    name: 'JubiTick',
    schema: {
      name: Sequelize.STRING,
      timestamp: Sequelize.BIGINT(13),
      high: Sequelize.DECIMAL(20, 10),
      buy: Sequelize.DECIMAL(20, 10),
      sell: Sequelize.DECIMAL(20, 10),
      last:  Sequelize.DECIMAL(20, 10),
      amount: Sequelize.DECIMAL(30, 10),
      volume: Sequelize.DECIMAL(20, 10)
    },
    indexes: [{
      unique: false,
      fields: ['name', 'timestamp']
    }]
  },
  {
    name: 'JubiDepth',
    schema: {
      name: Sequelize.STRING,
      timestamp: Sequelize.BIGINT(13),
      asks: Sequelize.TEXT,
      bids: Sequelize.TEXT
    }
  },
  {
    name: 'JubiOrders',
    schema: {
      name: { type: Sequelize.STRING, unique: 'name_tid' },
      tid: { type: Sequelize.STRING, unique: 'name_tid' },
      timestamp: Sequelize.BIGINT(13),
      price: Sequelize.DECIMAL(20, 10),
      amount: Sequelize.DECIMAL(30, 10),
      type: Sequelize.STRING
    }
  },
  {
    name: 'JubiMinuteBars',
    schema: {
      name: { type: Sequelize.STRING, unique: 'name_timestamp' },
      timestamp: { type: Sequelize.BIGINT(13), unique: 'name_timestamp' },
      open: Sequelize.DECIMAL(20, 10),
      close: Sequelize.DECIMAL(20, 10),
      high: Sequelize.DECIMAL(20, 10),
      low: Sequelize.DECIMAL(20, 10),
      volume: Sequelize.DECIMAL(20, 10),
      amount: Sequelize.DECIMAL(30, 10),
    }
  }
];