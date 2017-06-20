'use strict';

module.exports = {
  storage: {
    mysql: {
      database: 'emarket-trader',
      username: null,
      password: null,
      options: {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        }
      }
    }
  },
  market: {
    jubi: {
      apiServer: 'https://www.jubi.com/api/v1/',
      key: null,
      secret: null,
    }
  }
}