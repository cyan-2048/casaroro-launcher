//MozCaller - a library for easy phone call making on B2G
//(tested on KaiOS versions under 3.0 only)
//Created by Luxferre, BananaHackers group
//Released into public domain

(function (global, nav) {
	var tel = nav.mozTelephony,
		sanRegex = /[^0-9+\*#,]+/g,
		tonePause = 1600;

	function sendDTMF(toneString) {
		return tel.sendTones(toneString.trim());
	}

	function sendToneGroups(groups, conn, cb) {
		global.setTimeout(function () {
			sendDTMF(groups.shift()).then(
				function () {
					if (groups.length) sendToneGroups(groups, conn, cb);
					else cb(conn);
				},
				function () {
					cb(conn);
				}
			);
		}, tonePause);
	}

	global.MozCaller = {
		isSimActive: function (simId) {
			return nav.mozMobileConnections[simId].voice.connected;
		},
		adjustTonePause: function (val) {
			val = Number(val);
			if (isNaN(val) || val < 100) val = 1600;
			tonePause = val;
		},
		sendDTMF: sendDTMF,
		dial: function (number, simId, connectionCb) {
			console.log(simId);
			if (!connectionCb) connectionCb = function () {};
			var numberParts = number.trim().replace(sanRegex, "").split(","),
				baseNumber = numberParts.shift();
			var dCB = function (c) {
				if (c instanceof MMICall) {
					// stuff is happening in Ukraine, no cares to research how the ussd-message works
					// for now this is the only way to make USSD work
					if (getBackend) getBackend().launchApp("app://launcher.gaiamobile.org/manifest.webapp");

					//it was a USSD call, we can only return if it was successful or not
					c.result.then(function (r) {
						// this does not work for some reason, will be disabling it just for safety
						// connectionCb(r.success);
					});
				} else if (c instanceof TelephonyCall) {
					//on normal call connection, return the actual TelephonyCall object
					c.addEventListener("connected", function () {
						if (numberParts.length) {
							//proceed if there is anything else to send after pauses
							sendToneGroups(numberParts, c, connectionCb);
						} else connectionCb(c);
					});
				}
			};
			if (navigator.userAgent.includes("Nokia_8110")) {
				// sorry Luxferre, it is just slow to wait for it to fail....
				tel.dial(baseNumber, simId).then(dCB);
			} else {
				tel.dial(baseNumber, tel.CALL_TYPE_VOICE, 0, simId)
					.then(dCB)
					.catch(function (e) {
						//Nokia 8110 4G or older only accept 2 params
						tel.dial(baseNumber, simId).then(dCB);
					});
			}
		},
	};
})(window, navigator);
