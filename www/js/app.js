angular
.module('app', [])
.controller('mainCtrl', function($scope) {
  var socket = io('http://localhost:1699');
  socket.on('news', function (data) {
    console.log(data);
  });
  
  $scope.dataFrame = {
    test1: { data1: '1', data2: '2' },
    test2: { data1: '11', data3: '22' }
  };

  $scope.coins = Object.keys($scope.dataFrame);
  $scope.indice = Object.keys($scope.dataFrame[$scope.coins[0]]);
});