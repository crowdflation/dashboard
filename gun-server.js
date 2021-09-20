var Gun = require('gun/gun');

var server = require('http').createServer().listen(8080);
var gun = Gun({web: server});