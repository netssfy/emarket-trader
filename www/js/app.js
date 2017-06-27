angular
.module('app', [])
.controller('mainCtrl', function($scope) {
  $scope.data = [];
  $scope.ticks = {};
  $scope.days = 7;

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
  };

  $scope.requestOrderAmountByPrice = function(coin, days) {
    $scope.socket.emit('order-amount-by-price', { coin, days });
  };
});

function realdata($scope) {
  $scope.socket = io('http://localhost:1699');

  $scope.socket.on('ticks', function (data) {
    //是个数组，没一行一个coin的行情
    $scope.data = data;
    processTickData($scope, $scope.data);
    $scope.$apply();
  });

  $scope.socket.on('depth', function (data) {
    processDepthData($scope. data);
    $scope.$apply();
  });

  $scope.socket.on('order-amount-by-price', function(data) {
    var chart = $scope.charts['order-amount-by-price'];
    const y = [];
    const x = [];
    const avg = data.avg;
    for (var item of data.list) {
      y.push(item.price);
      x.push(item.amount);
    }

    chart.setOption({
      title: {
        text: '交易量 >= ' + avg.toFixed(3)
      },
      tooltip: {
        trigger: 'axis',
        axisPointer : {            // 坐标轴指示器，坐标轴触发有效
            type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
        }
      },
      legend: {
        data: ['交易量']
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
          name: '交易量',
          type: 'bar',
          stack: '交易量',
          label: {
            normal: {
              show: true
            }
          },
          data: x
        }
      ]
    });

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
  }

  for (var row of rows) {
    var tick = $scope.ticks[row.name];
    if (!tick) {
      $scope.ticks[row.name] = row;
    } else {
      for (var key in row) {
        var newVal = row[key];
        tick[key] = newVal;
      }
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
  $scope.charts['order-amount-by-price'] = echarts.init(document.getElementById('chart-order-amount-by-price'), 'vintage');
}

COIN_NAME_MAPPING = {ltc:'莱特币',skt:'鲨之信',vtc:'绿币',ifc:'无限币',tfc:'传送币',btc:'比特币',drk:'达世币',blk:'黑币',vrc:'维理币',jbc:'聚宝币',doge:'狗币',zcc:'招财币',xpm:'质数币',ppc:'点点币',wdc:'世界币',max:'最大币',zet:'泽塔币',eac:'地球币',fz:'冰河币',dnc:'暗网币',xrp:'瑞波币',nxt:'未来币',gooc:'谷壳币',plc:'保罗币',mtc:'猴宝币',qec:'企鹅链',lkc:'幸运币',met:'美通币',lsk:'LISK',ytc:'一号币',eth:'以太坊',etc:'以太经典',xas:'阿希币',hlb:'活力币',game:'游戏点',rss:'红贝壳',rio:'里约币',ktc:'肯特币',pgc:'乐园通',nhgh:'宁红柑红',ans:'小蚁股',peb:'普银',xsgs:'雪山古树',mryc:'美人鱼币',bts:'比特股'};