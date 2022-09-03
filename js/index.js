const backend = getBackend();
let apps,
	appOpen = false,
	battery = 0,
	masterExt;

const selfVisible = () => document.visibilityState === "visible";

fetch("manifest.webapp")
	.then((r) => r.json())
	.then((r) => {
		const p = r.permissions;
		if (p["engmode-extension"]) masterExt = navigator.engmodeExtension;
		else if (p.jrdextension) masterExt = nav.jrdExtension;
		else if (p.kaiosextension) masterExt = nav.kaiosExtension;
		else masterExt = null;
	});

function settings(item, value) {
	if (value !== undefined) {
		localStorage.setItem(item, JSON.stringify(value));
	}
	return JSON.parse(localStorage.getItem(item));
}

function init(a) {
	/* no longer needed because better icon grab
		qsa("img").forEach((i) => {
		// free up ram
		if (i.src.includes("blob")) URL.revokeObjectURL(i.src);
	});
	*/
	qs("#apps .content").innerHTML = "";
	apps = a;
	apps.sort((x, y) => x.name.localeCompare(y.name));
	let separators = [];
	apps.forEach((app, index) => {
		let symbols = "1234567890-={}'\"~!@#$%^&*()_+[]:;|`/?.,<>\\",
			char = app.name.charAt(0).toUpperCase();
		if (symbols.includes(char)) char = "#";
		const content = qs("#apps .content");
		if (!separators.includes(char)) {
			separators.push(char);
			let s = document.createElement("div");
			s.className = "separator";
			s.innerText = char;
			s.id = char;
			content.appendChild(s);
		}

		content.className = settings("menu_style") || "list" + " content";
		let y = document.createElement("div");
		y.tabIndex = 0;
		y.className = "app-item";
		if (!settings("noImg")) {
			let img = new Image();
			img.src = app.icon(50);
			y.appendChild(img);
		}
		if (!settings("noText")) {
			let t = document.createElement("div");
			t.innerText = app.name;
			t.className = "text";
			y.appendChild(t);
		}

		y.launch = () => {
			appOpen = true;
			app.launch();
		};
		y.style.color = app.color || settings("defaultColor") || "white";
		content.appendChild(y);
	});

	if (location.hash == "") location.hash = "main";
	wallpaper();
	console.log("apps loaded");
}
function reload() {
	backend.getAppItems().then(init);
}
reload();

let lastMenuIndex = 0;

window.onkeydown = (e) => {
	const key = e.key;
	if (e.key == "#") {
		new MozActivity({
			name: "configure",
			data: {
				target: "device",
				section: "homescreens",
			},
		});
	}
	const AppDpad = {
		list: () => {
			// handle 0 and last
			function if_0(current, nav, list) {
				return (current > 0 && nav == -1) || (current < list.length - 1 && nav == 1);
			}
			// handle normal scenario
			function if_1(current, nav, list) {
				return (current == 0 && nav == -1) || current == list.length - 1;
			}

			if (/Up|Down/.test(key)) {
				// scroll
				e.preventDefault();
				const list = qsa(".list.content .app-item:not(.hidden)"),
					nav = key == "ArrowUp" ? -1 : 1,
					current = list.indexOf(actEl()),
					focusEl = (indexu) => {
						const nextIndex = indexu,
							next = list[nextIndex];
						lastMenuIndex = nextIndex;
						next.focus();
						if (nextIndex == 0) next.scrollIntoView({ block: "end" });
						else if (!inView(next, next.parentElement)) next.scrollIntoView(nav != 1);
					};
				if (current == -1) {
					if (lastMenuIndex > -1 && lastMenuIndex < list.length) focusEl(lastMenuIndex);
					else focusEl(0);
				} else if (if_0(current, nav, list)) focusEl(current + nav);
				else if (if_1(current, nav, list)) focusEl(current == 0 ? list.length - 1 : 0);
			}
			if (/Left|Right/.test(key)) {
				const list = qsa(".list.content .separator[id]"),
					nav = key == "ArrowLeft" ? -1 : 1,
					letter = actEl().innerText.charAt(0).toUpperCase(),
					current = list.findIndex((a) => a.id == letter),
					focusLetter = (indexu) => {
						const next = list[indexu];
						qs(`.separator[id=${next.id}]~.app-item:not(.hidden)`).focus();
						next.scrollIntoView();
					};
				if (current == undefined) focusLetter(nav == -1 ? list.length - 1 : 1);
				else if (if_0(current, nav, list)) focusLetter(current + nav);
				else if (if_1(current, nav, list)) focusLetter(current == 0 ? list.length - 1 : 0);
			}
		},
	};
	switch (location.hash.replace("#", "")) {
		case "main":
			if (key == "Enter") {
				setTimeout(() => {
					qsa(".list.content .app-item:not(.hidden)")[lastMenuIndex].focus();
				}, 200);
				location.hash = "apps";
			}
			if (key == "SoftLeft") launchIAC("notice");
			break;
		case "apps":
			if (key == "Enter") actEl().launch();
			if (/Arrow/.test(key)) {
				const content = qs("#apps .content").classList;
				if (content.contains("list")) AppDpad.list();
			}
			if (key == "Backspace") {
				actEl().blur();
				location.hash = "main";
			}
			break;
	}
};

function updateClock() {
	let timeOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
	function updateTime(lang = []) {
		qs("#clock #time").innerHTML = new Date().toLocaleTimeString(lang, timeOptions).replace(/AM|PM/, "").replace(":", "<span id=colon>:</span>");
	}
	getSystemSetting(
		"locale.hour12",
		(a) => {
			timeOptions.hour12 = a;
			updateTime();
		},
		(a) => {
			console.error("cannot get Time");
			updateTime(navigator.language);
		}
	);

	qs("#clock #date").innerText = new Date().toLocaleDateString([], {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}
setTimeout(updateClock, 1000);
repeatEvery(updateClock, 60000);

navigator.getBattery().then(function (obj) {
	function updateBat() {
		battery = (obj.level * 100).toFixed();
		qs("#items #battery").innerText = (obj.charging ? "⚡" : "") + battery + "%";
	}
	updateBat();
	obj.addEventListener("chargingchange", updateBat);
});

let backdropBlob = null;

// for cool blur effects, sailfish OS clone lel
function wallpaper() {
	const body = document.body;
	function decide() {
		if (settings("bgBlur") == null) return true;
		else if (!settings("bgBlur")) return false;
		return true;
	}
	function reset() {
		body.style.removeProperty("--backdrop");
	}
	if (decide()) {
		getSystemSetting("wallpaper.image", (e) => {
			if (body.style.getPropertyValue("--backdrop").includes("url")) {
				URL.revokeObjectURL(body.style.getPropertyValue("--backdrop").replace(/url\("|"\)|url\(|\)/g, ""));
				reset();
			}
			canvasBlur(
				{
					input: e,
					radius: settings("blurRadius") || 5,
					image: true,
					type: "image/jpeg",
				},
				(blob) => {
					console.log("backdrop-image size: " + bytesToSize(blob.size));
					backdropBlob = blob;
					body.style.setProperty("--backdrop", `url("${URL.createObjectURL(blob)}")`, "important");
				}
			);
		});
	} else reset();
}

navigator.mozSettings.addObserver("wallpaper.image", wallpaper);
navigator.mozSettings.addObserver("locale.hour12", updateClock);

document.onvisibilitychange = () => {
	if (selfVisible()) {
	} else {
	}
};

function detectSims() {
	var i,
		detectedSims = [],
		conns = navigator.mozMobileConnections,
		l = conns.length;
	for (i = 0; i < l; i++) {
		if (conns[i].voice.connected) detectedSims.push({ connId: i, network: conns[i].voice.network.shortName });
	}
	return detectedSims;
}
function selectSIM(cb) {
	var sims = detectSims(),
		l = sims.length;
	if (l) {
		if (l > 1) {
			var i,
				opts = [];
			for (i = 0; i < sims.length; i++)
				(function (idx, net, cid) {
					opts.push({
						text: "SIM " + (idx + 1) + " (" + net + ")",
						ok: function () {
							cb(cid);
						},
					});
				})(i, sims[i].network, sims[i].connId);
			_options(opts);
		} else cb(sims[0].connId);
	} else toast("No valid SIMs");
}
function doCall(selectedNumber) {
	selectSIM(function (simId) {
		if (simId > -1 && MozCaller.isSimActive(simId)) MozCaller.dial(selectedNumber, simId);
		else toast("Call failed, connection unavailable");
	});
}

function fullReload() {
	location.hash = "";
	location.reload();
}

navigator.mozApps.mgmt.onuninstall = reload;
navigator.mozApps.mgmt.oninstall = reload;
