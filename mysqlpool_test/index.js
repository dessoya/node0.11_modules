'use strict'

var Class			= require('class')
  , coroutine		= require('coroutine')

var Pool = Class.inherit({

	onCreate: function(moc_data) {
		this.moc_data = moc_data
	},

	query: function(query, callback) {
		process.nextTick(function() {
			if(query in this.moc_data) {
				callback(GE_END, this.moc_data[query])
			}
			else {
				callback(GE_ERROR, new Error('query not found'))
			}
		}.bind(this))
	}

})

module.exports = {
	Pool:		Pool
}