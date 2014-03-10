'use strict';

var m		= require("./build/Release/module")

global.PASSWD_UID = 2;

module.exports = {
	setsid:		m.setsid,
	getpwnam:	m.getpwnam,
	setuid:		m.setuid
}