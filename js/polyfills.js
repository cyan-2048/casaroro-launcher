/*
 *	TRIGGER WARNING, if you are a hardcore ponyfill supporter
 *	you may not like to see these....
 *	very bad practices
 * this place also includes helpers
 */

const getId = (e) => document.getElementById(e),
	actEl = () => document.activeElement,
	qs = (e) => document.querySelector(e),
	qsa = (e) => document.querySelectorAll(e);

Element.prototype.qs = Element.prototype.querySelector;
Element.prototype.qsa = Element.prototype.querySelectorAll;

// make nodelist act more Array like
// is this safe? nop
NodeList.prototype.forEach = Array.prototype.forEach;
NodeList.prototype.indexOf = Array.prototype.indexOf;
NodeList.prototype.map = Array.prototype.map;
NodeList.prototype.includes = Array.prototype.includes;
NodeList.prototype.findIndex = Array.prototype.findIndex;

function bytesToSize(bytes) {
	var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes == 0) return "0 Byte";
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

// stolen from bankitube
// changes: one function, defaults to body
function inView(el, cn = document.body) {
	const b = {
		ct: cn.scrollTop,
		cb: cn.scrollTop + cn.clientHeight,
		et: el.offsetTop,
		eb: el.offsetTop + el.clientHeight,
	};
	return b.eb <= b.cb && b.et >= b.ct;
}

// temporary: synchrous confirms/alert are very finicky
// no styling support as well
function _confirm(obj) {
	if (confirm(obj.message)) obj.ok();
	else obj.cancel();
}
function _alert(obj) {
	alert(obj.message);
	obj.ok();
}
function _select(arr, options) {
	const select = document.createElement("select");
	arr.forEach((i) => {
		let option = document.createElement("option");
		option.text = i.text;
		select.add(option);
	});
	document.body.appendChild(select);
	select.onblur = function () {
		this.remove();
	};
	select.onchange = function () {
		arr[select.selectedIndex].ok();
	};
	select.focus();
}
function _option(arr) {
	return _select(arr);
}

// stolen from Wallace
function getSystemSetting(key, successCb, errorCb) {
	var e = navigator.mozSettings.createLock().get(key);
	e.onsuccess = function () {
		successCb(e.result[key]);
	};
	e.onerror = errorCb;
}
function setSystemSetting(key, value, successCb, errorCb) {
	var setting = {};
	setting[key] = value;
	var e = navigator.mozSettings.createLock().set(setting);
	e.onsuccess = successCb;
	e.onerror = errorCb;
}
function runCmd(cmd, successCb, errorCb) {
	if (!masterExt) return null;
	if (!successCb) successCb = function () {};
	if (!errorCb) errorCb = function () {};
	var executor = masterExt.startUniversalCommand(cmd, true);
	executor.onsuccess = successCb;
	executor.onerror = errorCb;
}

function repeatEvery(func, interval) {
	var now = new Date(),
		delay = interval - (now % interval);
	function start() {
		func();
		setInterval(func, interval);
	}
	setTimeout(start, delay);
}
