'use strict'

var fs			= require('fs')

var logpath;

var logers = {
}

function format2(n) {
	if(n < 10) return '0' + n;
	return n;
}

global.log = function(name, text) {
	return;

	if(! (name in logers) ) {
		var filename = logpath + '/' + name + '.log';
		logers[name] = { filename: filename, fd: fs.createWriteStream(filename, {flags:'a'}) }
		logers[name].fd.write("opened\n");
	}

	var d = new Date();

	var datestring = '' + d.getUTCFullYear() + '-' + format2(d.getUTCMonth()) + '-' + format2(d.getUTCDate()) + ' ' + format2(d.getUTCHours()) + ':' + format2(d.getUTCMinutes()) + ':' + format2(d.getUTCSeconds());

	logers[name].fd.write(datestring + ' [' + process.pid + '] ' + text + "\n");
}

module.exports = function(logpath_) {
	logpath = logpath_;
}