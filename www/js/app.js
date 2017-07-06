angular
.module('app', ['toastr'])
.config(function(toastrConfig) {
  angular.extend(toastrConfig, {
    preventOpenDuplicates: true,
    tapToDismiss: true,
    timeOut: 60000,
    positionClass: 'toast-bottom-right'
  });
})
.controller('mainCtrl', function($scope, toastr) {
  $scope.toastr = toastr;
  $scope.data = [];
  $scope.ticks = {};
  $scope.historyTicks = {};
  $scope.hours1 = 2;
  $scope.hours2 = 2;
  $scope.hours3 = 2;
  $scope.percent = 10;
  $scope.displayChart1 = false;
  $scope.displayChart2 = false;
  $scope.displayChart3 = false;
  $scope.displayChart4 = false;
  $scope.activeCoin = null;

  initChart($scope);
  realdata($scope);
  // mockdata($scope);

  // setInterval(function() {
  //   mockdata($scope);
  //   $scope.$apply();
  // }, 1000);

  $scope.getReadableName = function(coin) {
    return COIN_NAME_MAPPING[coin];
  };

  $scope.gotoDetail = function(coin, $index) {
    if ($index > 0)
      $(`#tab-${coin}`).tab('show');
    else
      window.open('https://www.jubi.com/coin/' + coin);
  };

  $scope.clickTab = function(coin) {
    $scope.socket.emit('active-coin-change', coin);
    if (!$scope.displayChart3)
      $scope.displayChart3 = true;

    $scope.activeCoin = coin;
    drawHistoryVolume($scope.charts['chart3'], $scope.historyTicks[coin]);
  };

  $scope.requestOrderAmountByPrice = function(coin, hours) {
    $scope.socket.emit('order-amount-by-price', { coin, hours });
  };

  $scope.requestOrderBiggestAmount = function(coin, hours, percent) {
    $scope.socket.emit('order-biggest-amount-percent', { coin, hours, percent });
  };

  $scope.requestBarsWithHours = function(coin, hours) {
    $scope.socket.emit('bars-within-hours', { coin, hours });
  }
});

function realdata($scope) {
  $scope.socket = io(`${window.location.protocol}//${window.location.hostname}:1699`);

  $scope.socket.on('ticks', function (data) {
    //是个数组，没一行一个coin的行情
    $scope.data = data;
    processTickData($scope, $scope.data);

    if ($scope.displayChart3)
      drawHistoryVolume($scope.charts['chart3'], $scope.historyTicks[$scope.activeCoin]);
    
    $scope.$apply();
  });

  $scope.socket.on('depth', function (data) {
    processDepthData($scope. data);
    $scope.$apply();
  });

  $scope.socket.on('28BigOrders', function (data) {
    for (var coin in data) {
      var result = data[coin];
      if (result) {
        $scope.toastr.error(`${coin} 出现28订单现象`);
      }
    }
    $scope.$apply();
  });

  $scope.socket.on('54wave', function (data) {
    for (var row of data) {
      if (row.wave > 0)
        $scope.toastr.info(`${row.name} 5分钟内涨幅达到${((row.wave - 1) * 100).toFixed(2)}%`);
      else
        $scope.toastr.warning(`${row.name} 5分钟内跌幅达到${(-(row.wave + 1) * 100).toFixed(2)}%`);
    }
    $scope.$apply();
  });

  $scope.socket.on('order-amount-by-price', function(data) {
    const y = [];
    const buyX = [];
    const sellX = [];
    for (var item of data.list) {
      y.push(item.price);
      if (item.type == 'buy') {
        buyX.push(item.amount);
        sellX.push(null);
      } else {
        sellX.push(item.amount);
        buyX.push(null);
      }
    }

    var options = {
      title: {
        text: '交易量 >= ' + data.avg.toFixed(3)
      },
      tooltip: {
        trigger: 'axis',
        axisPointer : {            // 坐标轴指示器，坐标轴触发有效
            type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
        }
      },
      legend: {
        data: ['买入量', '卖出量']
      },
      xAxis: [
        {
          type: 'value'
        }
      ],
      yAxis: [
        {
          type: 'category',
          data: y
        }
      ],
      series: [
        {
          name: '买入量',
          type: 'bar',
          stack: '量',
          label: {
            normal: {
              show: true,
              position: 'right'
            }
          },
          data: buyX,
          itemStyle: {
            normal: {
              color: 'green'
            }
          }
        },
        {
          name: '卖出量',
          type: 'bar',
          stack: '量',
          label: {
            normal: {
              show: true,
              position: 'right'
            }
          },
          data: sellX,
          itemStyle: {
            normal: {
              color: 'red'
            }
          }
        }
      ]
    };

    if (!$scope.displayChart1)
      $scope.displayChart1 = true;

    $scope.charts['chart1'].setOption(options);

    $scope.$apply();
  });

  $scope.socket.on('order-biggest-amount-percent', function(data) {
    const y = [];
    const buyX = [];
    const sellX = [];
    for (var item of data) {
      y.push(item.price);
      if (item.type == 'buy') {
        buyX.push(item.amount);
        sellX.push(null);
      } else {
        sellX.push(item.amount);
        buyX.push(null);
      }
    }

    var options = {
      title: {
        text: '大成交量订单'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer : {            // 坐标轴指示器，坐标轴触发有效
            type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
        }
      },
      legend: {
        data: ['买入量', '卖出量']
      },
      xAxis: [
        {
          type: 'value'
        }
      ],
      yAxis: [
        {
          type: 'category',
          data: y
        }
      ],
      series: [
        {
          name: '买入量',
          type: 'bar',
          stack: '量',
          label: {
            normal: {
              show: true,
              position: 'right'
            }
          },
          data: buyX,
          itemStyle: {
            normal: {
              color: 'green'
            }
          }
        },
        {
          name: '卖出量',
          type: 'bar',
          stack: '量',
          label: {
            normal: {
              show: true,
              position: 'right'
            }
          },
          data: sellX,
          itemStyle: {
            normal: {
              color: 'red'
            }
          }
        }
      ]
    };

    if (!$scope.displayChart2)
      $scope.displayChart2 = true;

    $scope.charts['chart2'].setOption(options);

    $scope.$apply();
  });

  $scope.socket.on('bars-within-hours', function(data) {
    var x = data['5bars'].map(function(bar) {
      return bar.timestamp;
    });
    var y5p = data['5bars'].map(function (bar) {
      return bar.price;
    });
    var y5a = data['5bars'].map(function (bar) {
      return bar.amount;
    });

    var y10p = [];
    var y30p = []
    var bIndex10 = 0;
    var bIndex30 = 0;
    
    for (var tIndex = 0; tIndex < x.length; tIndex++) {
      var t = x[tIndex];
      var pushed10 = false;
      do {
        var bar10 = data['10bars'][bIndex10];
        if (!bar10) {
          break;
        }
        if (bar10.timestamp <= t && bar10.timestamp + 10 * 60 * 1000 > t) {
          y10p.push(bar10.price);
          pushed10 = true;
        } else {
          bIndex10++;
        }
      } while(!pushed10);

      var pushed30 = false;
      do {
        var bar30 = data['30bars'][bIndex30];
        if (!bar30) {
          break;
        }
        if (bar30.timestamp <= t && bar30.timestamp + 30 * 60 * 1000 > t) {
          y30p.push(bar30.price);
          pushed30 = true;
        } else {
          bIndex30++;
        }
      } while(!pushed30);
    }
    
    var options = {
      legend: {
        data: ['5分钟加权价格', '10分钟加权价格', '30分钟加权价格']
      },
      title: {
        text: '短周期加权价格走势图'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer : {            // 坐标轴指示器，坐标轴触发有效
          type : 'cross'        // 默认为直线，可选为：'line' | 'shadow'  
        }
      },
      xAxis: {
        data: x.map(function(t) {
          var d = new Date(t);
          return d.getHours() + ':' + d.getMinutes();
        })
      },
      yAxis:[
        {
          type: 'value',
          name: '加权价格',
          scale: true
        },
        {
          type: 'value',
          name: '成交量',
          scale: true
        }
      ],
      series: [
        {
          name: '5分钟加权价格',
          type: 'line',
          data: y5p
        }, {
          name: '10分钟加权价格',
          type: 'line',
          data: y10p
        }, {
          name: '30分钟加权价格',
          type: 'line',
          data: y30p
        }, {
          name: '成交量',
          type: 'bar',
          data: y5a,
          yAxisIndex: 1
        }
      ]
    };

    if (!$scope.displayChart4)
      $scope.displayChart4 = true;

    $scope.charts['chart4'].setOption(options);
    $scope.$apply();
  });
}

function mockdata($scope) {
  var data = [
    { name: 'coin1', high: 101, low: '1.20012', col1: 100, col2: 100, col3: 100, col4: 100, col5: 100, col6: 100, col7: 100, col8: 100, col9: 100, col10: 100 },
    { name: 'coin2', high: 102, low: '2001', col1: 100, col2: 100, col3: 100, col4: 100, col5: 100, col6: 100, col7: 100, col8: 100, col9: 100, col10: 100 },
    { name: 'coin3', high: 106, low: '2002', col1: 100, col2: 100, col3: 100, col4: 100, col5: 100, col6: 100, col7: 100, col8: 100, col9: 100, col10: 100 },
    { name: 'coin4', high: 103, low: '20055', col1: 100, col2: 100, col3: 100, col4: 100, col5: 100, col6: 100, col7: 100, col8: 100, col9: 100, col10: 100 },
    { name: 'coin5', high: 109, low: '1200', col1: 100, col2: 100, col3: 100, col4: 100, col5: 100, col6: 100, col7: 100, col8: 100, col9: 100, col10: 100 }
  ];

  if ($scope.data.length > 0) {
    $scope.data.splice(0, $scope.data.length);
  }

  Array.prototype.push.apply($scope.data, data);

  processTickData($scope, $scope.data);
}

function processTickData($scope, rows) {
  $scope.indice = Object.keys(rows[0]);

  if (!$scope.coins) {
    $scope.coins = [];
    for (var row of rows) {
      $scope.coins.push(row.name);
    }
    $scope.coins = $scope.coins.sort();
  }

  for (var row of rows) {
    var tick = $scope.ticks[row.name];
    if (!tick) {
      $scope.ticks[row.name] = row;
      $scope.historyTicks[row.name] = [{
        last: row.last,
        buy: row.buy,
        sell: row.sell,
        timestamp: row['时刻'],
        volume: parseFloat(row['24H额'].replace(/,/g, '')),
        amount: parseFloat(row['24H量'].replace(/,/g, ''))
      }];
    } else {
      for (var key in row) {
        var newVal = row[key];
        tick[key] = newVal;
      }

      if ($scope.historyTicks[row.name].length == 100)
        $scope.historyTicks[row.name].shift();
      $scope.historyTicks[row.name].push({
        last: row.last,
        buy: row.buy,
        sell: row.sell,
        timestamp: row['时刻'],
        volume: parseFloat(row['24H额'].replace(/,/g, '')),
        amount: parseFloat(row['24H量'].replace(/,/g, ''))
      });
    }
  }
}

function processDepthData($scope, newDepthData) {
  if (!$scope.depthData) {
    $scope.depthData = newDepthData;
  } else {
    for (var coin in newDepthData) {
      $scope.depthData[coin] = newDepthData[coin];
    }
  }
}

function initChart($scope) {
  $scope.charts = {};
  $scope.charts['chart1'] = echarts.init(document.getElementById('chart1'), 'vintage');
  $scope.charts['chart2'] = echarts.init(document.getElementById('chart2'), 'vintage');
  $scope.charts['chart3'] = echarts.init(document.getElementById('chart3'), 'vintage');
  $scope.charts['chart4'] = echarts.init(document.getElementById('chart4'), 'vintage');
}

function drawHistoryVolume(chart, history) {
  const data = [];
  const y = [];
  const x = [];
  for (var row of history) {
    // data.push([row.timestamp, row.volume]);
    y.push(row.volume);
    x.push(row.timestamp);
  }

  var options = {
    title: {
      text: '动态交易额折线'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      data: x
    },
    yAxis: {
      type: 'value',
      splitLine: { show: false },
      scale: true
    },
    series: [{
        name: '交易量变化',
        type: 'line',
        showSymbol: false,
        hoverAnimation: false,
        data: y
    }]
  };
  
  chart.setOption(options);
}

function drawOrderAmountPriceChart(chart, title, list, avg, color) {
  const y = [];
  const x = [];
  for (var item of list) {
    y.push(item.price);
    x.push(item.amount);
  }

  var options = {
    title: {
      text: title + ' >= ' + avg.toFixed(3)
    },
    tooltip: {
      trigger: 'axis',
      axisPointer : {            // 坐标轴指示器，坐标轴触发有效
          type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
      }
    },
    legend: {
      data: [title]
    },
    xAxis: [
      {
        type: 'value'
      }
    ],
    yAxis: [
      {
        type: 'category',
        data: y
      }
    ],
    series: [
      {
        name: title,
        type: 'bar',
        stack: title,
        label: {
          normal: {
            show: true,
            position: 'right'
          }
        },
        data: x,
      }
    ]
  };

  if (color) {
    options.series[0].itemStyle = {
      normal: {
        color
      }
    };
  }

  chart.setOption(options);
}

COIN_NAME_MAPPING = {ltc:'莱特币',skt:'鲨之信',vtc:'绿币',ifc:'无限币',tfc:'传送币',btc:'比特币',drk:'达世币',blk:'黑币',vrc:'维理币',jbc:'聚宝币',doge:'狗币',zcc:'招财币',xpm:'质数币',ppc:'点点币',wdc:'世界币',max:'最大币',zet:'泽塔币',eac:'地球币',fz:'冰河币',dnc:'暗网币',xrp:'瑞波币',nxt:'未来币',gooc:'谷壳币',plc:'保罗币',mtc:'猴宝币',qec:'企鹅链',lkc:'幸运币',met:'美通币',lsk:'LISK',ytc:'一号币',eth:'以太坊',etc:'以太经典',xas:'阿希币',hlb:'活力币',game:'游戏点',rss:'红贝壳',rio:'里约币',ktc:'肯特币',pgc:'乐园通',nhgh:'宁红柑红',ans:'小蚁股',peb:'普银',xsgs:'雪山古树',mryc:'美人鱼币',bts:'比特股'};