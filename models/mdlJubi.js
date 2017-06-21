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
      tiemstamp: Sequelize.BIGINT(13),
      asks: Sequelize.TEXT,
      bids: Sequelize.TEXT
    }
  },
  {
    name: 'JubiOrders',
    schema: {
      tid: { type: Sequelize.STRING, primaryKey: true },
      timestamp: Sequelize.BIGINT(13),
      price: Sequelize.DECIMAL(20, 10),
      amount: Sequelize.DECIMAL(30, 10),
      type: Sequelize.STRING
    }
  }
];