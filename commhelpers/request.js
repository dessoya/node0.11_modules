'use strict'

var http = require('http')

function request(host, port, uri, post, callback) {

	var message = post ? JSON.stringify(post) : null;
	var options = {
	    host:			host,
	    port:			port,
	    path:			uri,
	    method:			post ? 'POST' : 'GET',
		keepAlive:		true,
		keepAliveMsecs:	10000,
		headers:		{
			'content-length': Buffer.byteLength(message, 'utf8')
		}
	}

	var req = http.request(options, function(res) {
	    res.setEncoding('utf8');
		var answer = []
	    res.on('data', function(chunk){
	        answer.push(chunk)
    	});

		res.on('end', function() {
			answer = '' + Buffer.concat(answer)
			try {
				answer = JSON.parse(answer)
			}
			catch (e) {
				answer = null;
			}
			if(answer) {
				if(answer.status && answer.status === 'ok') {
					callback(null, answer.result)
				}
				else callback(new Error('bad status in answer'))
			}
			else callback(new Error('problem parse json answer'))
		})
	});

	req.on('error', function(e) {
	    console.log('problem with request: ' + e.message)
		callback(e)
	})

	if(post) req.write(message)
	req.end()
}

module.exports = request