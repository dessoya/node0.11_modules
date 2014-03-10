'use strict'

var Class		= require('class')
  , http		= require('http')
  , url			= require('url')
  , qs			= require('querystring')
  , fs			= require('fs')

var Request = Class.inherit({
	onCreate: function(req, res, info, opt) {
		this.opt = opt || {};
		this.req = req;
		this.res = res;
		this.info = info;
		if(!this.opt.hideRequestMessage) {
			this.time = process.hrtime();
		}
		this.onRequest();
	},

	writeHead: function(status, headers) {
		this.res.writeHead(status, headers);
	},

	end: function(text) {
		this.res.end(text);
		if(!this.opt.hideRequestMessage) {
			var diff = process.hrtime(this.time);
			console.log('request ' + ((diff[0] * 1e9 + diff[1])/1e9).toFixed(5) + ' ' + this.req.method + ' ' + this.info.pathname);
		}
	},

	onRequest: function() {
	},

	readPost: function() {
		this.postData = '';
		this.req.on('data', function(data) {
			this.postData += data;
		}.bind(this)).on('end', function() {			
			var json;
			try {
				json = JSON.parse(this.postData);
			}
			catch(e) {
				json = null;
			}
			this.onPostReaded(json);
		}.bind(this));
	},

	onPostReaded: function(data) {
	},

});

var StaticLoader = Class.inherit({
	onCreate: function() {
		this.files = {};
		this.interval = setInterval(this.onRefreshFiles.bind(this), 1500);
		process.on('SIGINT', this.stop.bind(this));
	},
	stop: function() {
		clearInterval(this.interval);
	},
	onRefreshFiles: function() {
		for(var filepath in this.files) {
			(function(filepath, self){
			fs.stat(filepath, function(err, stats) {
				if(err) {
					process.stderr.write(err);
				}
				else {
					// console.log('' + filepath + ', ' + stats.mtime.getTime());
					if(self.files[filepath].mtime == 0 || stats.mtime.getTime() > self.files[filepath].mtime) {
						console.log('reload ' + filepath);
						fs.readFile(filepath, function(err,data) {
							if(err) {
								process.stderr.write(err);
							}
							else {
								self.files[filepath].mtime = stats.mtime.getTime();
								self.files[filepath].data = data;
							}							
						}.bind(self));
					}
				}
			}.bind(self));
			})(filepath, this);
		}
	},
	register: function(filepath) {
		this.files[filepath] = {
			data: '',
			mtime: 0
		}
	},
	get: function(filepath) {
		if(filepath in this.files) return this.files[filepath].data;
		return '';
	}
});

// var staticLoader = StaticLoader.create();

var StaticRequest = Request.inherit({

	onRequest: function() {
		var data = staticLoader.get(this.filepath);
		this.writeHead(200, {'Content-Type': 'text/html','Content-Length': data.length});
		this.end(data);
	},

	factory: function(filepath) {
		staticLoader.register(filepath);
		return StaticRequest.inherit({
			filepath: filepath
		});
	}
});

var _404Request = Request.inherit({
	onRequest: function() {
		var message = '404';
		this.writeHead(404, {'Content-Type': 'text/html','Content-Length': message.length});
		this.end(message);
	}
});

var Phoenix = module.exports = Class.inherit({

	onCreate: function(config, routing) {

		this.sockets = []

		this.routing = routing;
		this.server = http.createServer();
		this.server.on('connection',	this.onConnection.bind(this));
		this.server.on('request',		this.onRequest.bind(this));

		this.server.listen(config.port, config.ip ? config.ip : null);

		process.on('SIGINT', this.stop.bind(this));

		this.requestOpt = { hideRequestMessage: config.hideRequestMessage ? config.hideRequestMessage : false };
	},

	onConnection: function(socket) {
		this.sockets.push(socket);
		socket.on('close', function () {
			this.sockets.splice(this.sockets.indexOf(socket), 1);
		}.bind(this));
	},
	
	onRequest: function(req, res) {
		var info = url.parse(req.url, true);	
		var requestClass = (info.pathname in this.routing) ? this.routing[info.pathname] : _404Request;
		requestClass.create(req, res, info, this.requestOpt);
	},

	onEnd: function() {
		var s = this.sockets, i = s.length; while(i--) 
			s[i].destroy();
		this.server.close();
	},
	stop: function() {
		this.onEnd();
		staticLoader.stop();
	},

	// requests
	on404: function(req, res, info) {
		var message = '404';
		res.writeHead(404, {'Content-Type': 'text/html','Content-Length': message.length});
		res.end(message);
	}
})

Phoenix.Request = Request
