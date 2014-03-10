'use strict';

var Class		= require('class')
  , fs			= require('fs')
  , cp			= require('child_process')
  , path		= require('path')
  , spawn		= cp.spawn
  , posix		= require('liteposix')
//  , posix		= require('posix')
  , Phoenix		= require('phoenix')
  , http		= require('http')

var Loger = Class.inherit({

	onCreate: function(fn) {
		this.fn		= fn;
		this.log_fd = fs.createWriteStream(this.fn, {flags:'a'});
		this.pid	= process.pid;
		this.log	= this.log_.bind(this);
	},

	reopen: function() {
		this.log_fd.end('close\n');
		this.log_fd = fs.createWriteStream(this.fn, {flags:'a'});
	},

	format2: function(n) {
		if(n < 10) return '0' + n;
		return n;
	},

	log_: function(m, pid_) {

		var d = new Date();

		var datestring = '' + d.getUTCFullYear() + '-' + this.format2(d.getUTCMonth()) + '-' + this.format2(d.getUTCDate()) + ' ' + this.format2(d.getUTCHours()) + ':' + this.format2(d.getUTCMinutes()) + ':' + this.format2(d.getUTCSeconds());

		this.log_fd.write(datestring + ' [' + (pid_ ? pid_ : this.pid) + '] ' + m + "\n");
	}
});

var last_pong, startDate = Date.now(), restartCount = 0;
var optionCerberConfig = '-cerberConfig';

function loadConfig(path) {
	if(fs.existsSync(path)) {
		var data = fs.readFileSync(path);
		var json;
		try {
			json = JSON.parse(data);
		}
		catch(e) {
			console.log('Error: bad json format '+path);
			process.exit();
		}
		var failed = false, required = 'logs_dir,name,sub_process_communication_port'.split(',');
		for(var i in required) {
			var name = required[i];
			if(!(name in json)) {
				console.log('Error: absent config key '+name);
				failed = true;
			}
		}
		if(failed) {
			process.exit();
		}
		return json;
	}
	else {
		console.log('Error: file '+path+' absent');
		process.exit();
	}
}

var logs = {
	open: function(name, filepath) {
		this[name] = Loger.create(filepath);
	}
}

var cleanEndRE = new RegExp(/\s+$/);
function startService(config, configPath, onClose) {

	restartCount ++;
	var appPath = path.dirname(configPath);
	var service = spawn(appPath + '/' + config.name, [optionCerberConfig, configPath]);

	service.on('close', onClose);
	service.stdout.on('data', function(data) {
		data = (''+data).replace(cleanEndRE, '');
		var lines = data.split('\n');
		for(var i = 0; i < lines.length; i++)
			logs.service_stdout.log_(lines[i], service.pid);
	});

	service.stderr.on('data', function(data) {
		data = (''+data).replace(cleanEndRE,'');
		var lines = (''+data).split('\n');
		for(var i = 0; i < lines.length; i++)
			logs.service_stderr.log_(lines[i], service.pid);
	});

	return service;
}


function daemon(configPath, config, callback) {

	// stanem nezavisimim processom :) !
	posix.setsid();

	// ustanovim title processa
	process.title = config.name + ':cerber';

	// nastroem logi
	var logs_dir = config.logs_dir;
	logs.open('stdout', logs_dir + '/cerber.'+config.name+'.stdout.log');
	logs.open('stderr', logs_dir + '/cerber.'+config.name+'.stderr.log');

	var old_log = console.log;
	console.log = logs.stdout.log;

	process.on('uncaughtException', function(err) {
		logs.stderr.log_('Caught exception: ' + err.message);
		logs.stderr.log_(err.stack);
	});

	// zapustim servic kak docherniy process
	// var path = process.argv[1].replace(/cerber/,'');
	var appPath = path.dirname(configPath);

	logs.open('service_stdout', logs_dir + '/service.'+config.name+'.stdout.log');
	logs.open('service_stderr', logs_dir + '/service.'+config.name+'.stderr.log');

	var service, onClose;

	onClose = function (code, signal) {
		console.log('service closed with code '+code+' on signal '+signal);
		if(Date.now() - startDate < 2 * 60 * 1000 && restartCount > 7) {
			console.log('too many restart, stop');
			setTimeout(process.exit, 700);
		}
		else {
			service = startService(config, configPath, onClose);
		}
	};
	service = startService(config, configPath, onClose);

	var httpserver =  Phoenix.create({hideRequestMessage: true, port: config.sub_process_communication_port}, {
		'/restart' : Phoenix.Request.inherit({
			onRequest: function() {			
				var message = 'restarting...';
				this.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8','Content-Length': Buffer.byteLength(message, 'utf8')});
				this.end(message);
				last_pong = Date.now() + 1000 * 60 * 5;
				service.kill('SIGKILL');
			},
		}),
		'/pong' : Phoenix.Request.inherit({
			onRequest: function() {			
				var message = 'pong';
				this.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8','Content-Length': Buffer.byteLength(message, 'utf8')});
				this.end(message);
				last_pong = Date.now();
			},
		})
	});

	// skazhem starteru chto zapustilis
	old_log('starting '+config.name+'...');

	// zaglushka kotoraya dezhit eventloop v rabochem sostoyanii

	last_pong = Date.now();
	var i = setInterval(function() {
		var cur_time = Date.now();
		// console.log('interval delta '+(cur_time - last_pong));
		if(cur_time - last_pong > 1000 * 60 * 3) {
			console.log('restarting');
			last_pong = Date.now() + 1000 * 60 * 5;
			service.kill('SIGKILL');
			// svc = service = startService(config, service_stdout, service_stderr, onClose);
		}
	}, 1000);

	process.on('SIGUSR2', function() {
		console.log('Got SIGUSR2 signal.');
		for(var name in logs) {
			if('open' == name) continue;
			logs[name].reopen();
		}
	});
}

function start(configPath, config, callback) {
	console.log('starting '+config.name);	

	// zapuskaem demona
	var daemon = spawn(process.argv[0], [process.argv[1], 'daemon', configPath]);

	// vivodim stderr stdout v faili chtobi znat esli tam problema
	var logs_dir = config.logs_dir;
	if(!fs.existsSync(logs_dir)) {
		fs.mkdirSync(logs_dir, 0x1ff);
	}
	var stdout = Loger.create(logs_dir + '/cerber.'+config.name+'.stdout.log');
	var stderr = Loger.create(logs_dir + '/cerber.'+config.name+'.stderr.log');

	// zhdem kluchevuu frazu govorashaya ob uspeshnom zapuske i vihodim
	daemon.stdout.on('data', function(data) { 
		data = (''+data).replace(cleanEndRE,'');
		stdout.log_(data); 
		// starting photo_daemon...
		var re = new RegExp('starting\\s'+config.name+'\\.\\.\\.');
		var a,lines = (''+data).split('\n');
		var i = lines.length; while(i--) {
			if(a = re.exec(lines[i])) {
				if(callback) callback(true);
				else {
					process.exit(0);
				}
			}
		}
	});
	daemon.stderr.on('data', function(data) { data = (''+data).replace(cleanEndRE,''); stderr.log_(data); });

	// esli v techenii 2.4 sec demon ne zapustilsa rugaemsa
	setTimeout(function(){
		console.log('can\'t execute daemon');
		if(callback) callback(false);
		else {
			process.exit(0);
		}
	}, 2400);
}

function getPids(config, listCallback) {
    var ps = spawn('ps', ['ax']), pid = [];

	// soberem pid vseh instansov servica
	ps.stdout.on('data', function (data) {
		// 3238 ?        Ssl    0:00 photo_daemon
		var re = new RegExp('(\\d+)\\s+\\S+\\s+\\S+\\s+\\S+\\s+'+config.name+'\\:');
		var a,lines = (''+data).split('\n');
		var i = lines.length; while(i--) {
			if(a = re.exec(lines[i]))
				pid.push(a[1]);
		}
	});

	ps.on('close', function (code) {
		listCallback(pid);
	});
}


function stop(configPath, config, callback) {
	console.log('stoping '+config.name);

	// logs.service_stdout.log_('stoping '+config.name);

	setTimeout(function() {
	getPids(config, function(pid) {		
		if(0 == pid.length) {
			if(callback) callback();
			else process.exit();
			return;
		}

		var k = [];
		var i = pid.length; while(i--) {
			var p = spawn('kill', ['-9', pid[i]]);
			k.push(p);
			p.on('close', function (code) {
				pid.shift();
				// kogda ubili vse processi vihodim sami
				if(pid.length == 0) {
					if(callback) callback();
					else process.exit();
				}
			});
		}
	});
	}, 123);
}

function restart(configPath, config, callback) {
	stop(configPath, config, function() {
		start(configPath, config);
	});
}

function initService() {

	for(var i = 0, l = process.argv.length; i < l; i++) {
		if(process.argv[i] === optionCerberConfig) {
			if(i + 1 < l) {
				console.log('use config '+process.argv[i + 1]);
				var config = JSON.parse(fs.readFileSync(process.argv[i + 1]));
				process.title = config.name + ':service';
				console.log('starting '+config.name+'...');
				if(config.service_user) {
					// todo: check for exists user
					var info = posix.getpwnam(config.service_user)
					posix.setuid(info[PASSWD_UID]);
				}
			}
		}
	}

	var interval = setInterval(function() {
		http.request({
		    host: '127.0.0.1',
	    	port: config.sub_process_communication_port,
		    path: '/pong',
		    method: 'GET'
		}).end();
	}, 30 * 1000);
	process.on('SIGINT', function() { clearInterval(interval); });

}

module.exports = {
	loadConfig:			loadConfig,
	daemon:				daemon,
	start:				start,
	stop:				stop,
	restart:			restart,
	initService:		initService,
}
