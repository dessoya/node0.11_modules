'use strict'

var Class				= require('class')

module.exports = {

	HTTPRequest: Class.inherit({

		onCreate: function(path, get_params, post) {
			this.method = post ? 'POST' : 'GET';
			this.post = post ? JSON.stringify(post) : '';
			this.info = { pathname: path, query: get_params };
		},

		on: function(name, callback) {
			switch(name) {
			case 'data': callback(this.post); break;
			case 'end': callback(); break;
			}
			return this;
		}

	}),

	HTTPResponse: Class.inherit({

		onCreate: function(finish) {
			this.finish = finish;
			this.headers = {};
			this.status = 200;
			this.content = '';
		},

		writeHead: function(status, headers) {
			this.status = status;
			for(var name in headers)
				this.headers[name] = headers[name];
		},

		end: function(text) {
			this.content += text;
			this.finish();
		}

	})
}
