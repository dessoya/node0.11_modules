'use strict'

var Class = function(){}

Class.prototype = {

	onCreate: function() {},
	inherit: function() {

		var child = arguments[0];
		var classes = Array.prototype.slice.call(arguments, 0);
		classes.push(this);

		var childContructor = function(){};
		var p = childContructor.prototype = {};

		p.parent = this.prototype;
		p.parents = [];

		var i = classes.length; while(i--) {
			var parent = classes[i];
			if('function' == typeof parent) {
				parent = parent.prototype;
				p.parents.push(parent);
			}
			for(var name in parent) {
				if('parent' == name || 'parents' == name) continue;
				p[name] = parent[name];
			}
		}

		childContructor.create = this.create;
		childContructor.inherit = this.inherit;
		childContructor.constructor = this.constructor;

        return childContructor;
	},	

	constructor: function(object) {
		return this.prototype.onCreate.bind(object);
	},

	create: function() {
		var object = new this;
		object.onCreate.apply(object, arguments);		
		return object;
	}
}

Class = Class.prototype.inherit({})

module.exports = Class
