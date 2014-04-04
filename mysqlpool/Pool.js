'use strict';

var mysql			= require('mysql')
  , coroutine		= require('coroutine')
  , util			= require('util')
  , errors			= require('errors')
  , Class			= require('class')

// mysql helpers 

var Query = Class.inherit({
	onCreate: function(query, callback, connection) {

		// console.log('connection '+connection.id+' query '+query);

		this.connection = connection;
		this.callback = callback;
		this.queryText = query;
		this.queryTimer = setTimeout(function() {

			this.timeouted = true;

			console.log('connection '+this.connection.id+' query timeout');
			// console.log('reconnecting...');

			this.connection.connected = false;
			this.connection.pool.removeConnection(this.connection.id);
			var q = 'kill '+this.connection.threadId;
			// console.log(q);
			this.connection.pool.controlConnection.connection.query(q, function(err, data) {
				// console.log(q+' '+JSON.stringify(err)+' '+JSON.stringify(data));
				if(!err) {
					// this.timeouted = false;
					if(this.callback) this.callback(GE_ERROR, {query:this.queryText,code:'QUERY_TIMEOUT'});
				}
			}.bind(this))

		}.bind(this), this.connection.config.queryTimeout)

		this.rows = [];
		this.portion = [];

		this.connection.connection.query(query)
			.on('error', function(err) {
				if(this.timeouted) return;
				this.error = true;
				if(this.callback) this.callback(GE_ERROR, err);
			}.bind(this))
			.on('result', function(row) {
				if(this.timeouted) return;
				this.rows.push(row);
				this.portion.push(row);
				if(this.portion.length > 9) {
					if(this.callback) this.callback(GE_PART, this.portion); 
					this.portion = [];
				}
			}.bind(this))
			.on('end', function() {
				// console.log('query end '+query+' '+this.timeouted);
				if(this.timeouted) return;		
				clearTimeout(this.queryTimer);
				if(this.error) return;
				if(this.portion.length) {
					if(this.callback) this.callback(GE_PART, this.portion); 
					this.portion = [];
				}
				if(this.callback) this.callback(GE_END, this.rows);
			}.bind(this))
	}
});

var conIterator = 1;
var Connection = Class.inherit({
	onCreate: function(pool, config) {

		this.id = conIterator ++;
		this.config = config;
		this.connected = false;
		this.pool = pool;

		this.connection = mysql.createConnection(config);
		this.binded_onConnectionError = this.onConnectionError.bind(this);
		this.connection.on('error', this.binded_onConnectionError);
	},

	query: function(query, callback) {
		Query.create(query, callback, this);
	},

	_connect: function(callback) {
		// console.log('c 1');
		this.connection.connect(function(err) {
			// callback(err ? new ErrorConnection(err) : null);
			callback(err);
		});
	},

	onConnectionError: function(err) {
		// console.log(util.inspect(err,{depth:null,showHidden:true}));
		if('PROTOCOL_CONNECTION_LOST' === err.code) {
			this.connected = false;
			console.log('connection '+this.id+' lost connection');
			console.log('reconnecting...');
			this.pool.removeConnection(this.id);
			this.connection = mysql.createConnection(this.config);
			this.connection.on('error', this.binded_onConnectionError);
			this.connect(this.pool.binded_onMakeConnection);
		}
		else throw err;
	},

	makeControlConnection: function*(connection, sv) {
		var result = { connection: connection };
		// try {
			yield connection._connect(sv.resume);
			var rows = yield connection.query('select connection_id() as id', sv.resume3end);
			connection.threadId = result.id = rows[0].id;
			console.log('connection '+connection.id+' threadId '+connection.threadId);
			connection.connected = true;
		//}
		//catch(err) {
			// console.log(util.inspect(e,{depth:null,showHidden:true}));
			//result.id = -1;
			// throw e;
			//result.err = err;
		//}
		return result;
	},

	connect: function(callback) {
		coroutine(this.makeControlConnection, this, callback);
	},

	end: function() {
		if(this.connected) this.connection.end();
	}

});

var Pool = Class.inherit({

	onCreate: function(config) {
		// get pool options
		var a = 'connectionCount'.split(',');
		for(var i in a) {			
			var name = a[i];
			if(config[name]) {
				this[name] = config[name];
				delete config[name];
			}
		}

		if(!config.connectTimeout) config.connectTimeout = 2000;
		this.connectionConfig = config;
		if(!('queryTimeout' in this.connectionConfig)) this.connectionConfig.queryTimeout = 3000;

		process.on('SIGINT', this.stop.bind(this));

		this.controlConnection = Connection.create(this, this.connectionConfig);
		this.controlConnection.connect(this.onMakeControlConnection.bind(this));
		
		this.connections = {};
		this.readyConnections = [];
		this.busyConnections = [];
		this.queryQueue = [];
		this.binded_onMakeConnection = this.onMakeConnection.bind(this);
		var l = this.connectionCount; while(l--) {
			var c = Connection.create(this, this.connectionConfig);
			this.connections[c.id] = c;
			c.connect(this.binded_onMakeConnection);
		}
	},

	onMakeControlConnection: function(event, data) {
		// console.log('event '+event+' data '+data);
		if(GE_ERROR === event || data.id === -1) {
/*
			if(data.code === 'ECONNREFUSED') {
				console.log('ECONNREFUSED');
			}
*/
			throw errors.Common.create(data, { pool: 'problem with control connection' });
		}
	},

	onMakeConnection: function(event, data) {
		// console.log(31);
		if(GE_ERROR === event || data.id === -1) {
/*
			if(data.code === 'ECONNREFUSED') {
				console.log('ECONNREFUSED');
			}
*/
			throw errors.Common.create(data, { pool: 'problem with connection' });
		}
		else {
			// console.log(3);
			this.readyConnections.push(data.connection.id);
			this.connections[data.connection.id] = data.connection;
			this.processQueue();
		}
	},

	stop: function() {
		for(var id in this.connections)
			this.connections[id].end();
		this.controlConnection.end();
	},

	removeConnection: function(id) {
		delete this.connections[id];
		var i = this.readyConnections.indexOf(id);
		if(i !== -1) this.readyConnections.splice(i, 1);
		i = this.busyConnections.indexOf(id);
		if(i !== -1) this.busyConnections.splice(i, 1);
	},

	query: function(query, callback) {
		if(this.readyConnections.length) {
			// console.log(1);
			var c = this.connections[this.readyConnections.shift()];
			this.busyConnections.push(c.id);
			c.query(query, function(event, data) {
				if(callback) callback(event, data);
				if(GE_END === event || GE_ERROR === event) {
					var i = this.busyConnections.indexOf(c.id);
					if(i !== -1) this.busyConnections.splice(i, 1);

					if(c.connected) this.readyConnections.push(c.id);

					this.processQueue();
				}
			}.bind(this));
		}
		else {
			// console.log(2);
			this.queryQueue.push([query, callback]);
		}
	},

	processQueue: function() {
		// console.log(11);
		if(this.queryQueue.length) {
			// console.log(12);
			var q = this.queryQueue.shift();
			this.query(q[0], q[1]);
		}
	}

})

module.exports = {
	Pool:				Pool,
}