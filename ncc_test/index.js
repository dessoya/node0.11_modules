'use strict'

var Class			= require('class')

var Client = Class.inherit({
	onCreate: function(queryMap) {
		this.queryMap = queryMap
	},

	execute: function(query, params, c, callback) {

		do {
			var index = query.indexOf('?')
			if(index !== -1) {
				query = query.substr(0, index) + params.shift() + query.substr(index + 1)
			}
		} while (index !== -1)

		process.nextTick(function() {
			if(query in this.queryMap) {
				callback(null, this.queryMap[query])
			}
			else {
				callback(new Error('query not found'))
			}
		}.bind(this))
	}

})

module.exports = {
	Client:		Client
}