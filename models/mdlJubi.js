'use strict';

const Sequelize = require('sequelize');

module.exports = [
  {
    name: 'jubiTick',
    schema: {
      name: Sequelize.STRING,
      timestamp: Sequelize.INTEGER,
      high: Sequelize.DECIMAL(20, 10),
      buy: Sequelize.DECIMAL(20, 10),
      sell: Sequelize.DECIMAL(20, 10),
      last:  Sequelize.DECIMAL(20, 10),
      amount: Sequelize.DECIMAL(20, 10),
      volume: Sequelize.DECIMAL(20, 10)
    },
    indexes: [{
      unique: true,
      fields: ['name', 'timestamp']
    }]
  },
  {
    name: 'jubiDepth',
    schema: {
      name: Sequelize.STRING,
      tiemstamp: Sequelize.INTEGER,
      asks: Sequelize.TEXT,
      bids: Sequelize.TEXT
    }
  },
  {
    name: 'jubiOrders',
    schema: {
      tid: { type: Sequelize.STRING, primaryKey: true },
      timestamp: Sequelize.INTEGER,
      price: Sequelize.DECIMAL(20, 10),
      amount: Sequelize.DECIMAL(20, 10),
      type: Sequelize.STRING
    }
  }
];