angular
.module('app', [])
.controller('mainCtrl', function($scope) {
  $scope.socket = io('http://localhost:1699');

  $scope.socket.on('ticks', function (data) {
    $scope.data = data;
    $scope.indice = Object.keys($scope.data[0]);
    $scope.$apply();
  });
});