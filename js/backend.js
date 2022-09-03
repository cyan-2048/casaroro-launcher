/*
 * Copyright (C) 2021 Affe Null <affenull2345@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function launchIAC(panel) {
	if (navigator.mozApps && "function" === typeof navigator.mozApps.getSelf) {
		var appRequest = navigator.mozApps.getSelf();
		appRequest.onsuccess = function () {
			let app = this.result;
			app.connect("launcher-panel")
				.then((conns) => {
					for (let conn of conns) {
						conn.postMessage({ target: panel });
					}
				})
				.catch((e) => {
					app.connect(panel).then((conns) => {
						for (let conn of conns) {
							conn.postMessage({});
						}
					});
				});
		};
	}
}

function getBackend() {
	// APPS
	let apps;
	let haveApps = navigator.mozApps && navigator.mozApps.mgmt && "function" === typeof navigator.mozApps.mgmt.getAll;
	if (haveApps) {
		apps = new Promise((resolve, reject) => {
			let req = navigator.mozApps.mgmt.getAll();
			req.onsuccess = function () {
				resolve(this.result);
			};
			req.onerror = function () {
				// Convert the DOMException to a human-readable error
				reject(new Error(this.error.name + " " + this.error.message));
			};
		}).catch((e) => alert("Cannot request application list: " + e));
	} else {
		alert("only works on a KaiOS 2.5 device!");
	}

	// BACKEND API
	class AppItem {
		icon(size) {
			// synchrous plus less ram usage
			let manifest = this.moz.manifest,
				origin = this.moz.origin;
			if ("icons" in manifest) {
				const { icons } = manifest;
				let keys = Object.keys(manifest.icons);
				if (keys.length == 0) return null;
				keys.sort((a, b) => b - a);
				let src = keys.find((a) => a <= size);
				if (!src) src = keys[keys.length - 1];
				// if icon is a link or data uri
				if (/^(?:http|https|data|app):/.test(icons[src])) return icons[src];
				else if (origin) {
					return origin + icons[src];
				}
				return null;
			} else return null;
			/*return new Promise((resolve, reject) => {
				if (this.moz._icon) resolve(this.moz._icon);
				else {
					navigator.mozApps.mgmt.getIcon(this.moz, size).then((obj) => {
						resolve(URL.createObjectURL(obj));
					});
				}
			});
			*/
		}
		uninstall() {
			return new Promise((res, err) => {
				// will have to confirm for ourselves because it will just freeze on pending
				if (!this.moz.removable) return err(new Error("this app is not removable please use something like wallace toolbox."));
				let a = navigator.mozApps.mgmt.uninstall(this.moz);
				a.onsuccess = res;
				a.onerror = err;
			});
		}
	}
	class MozAppItem extends AppItem {
		constructor(moz) {
			super();
			this.moz = moz;
		}

		launch() {
			this.moz.launch();
		}
		get id() {
			return this.moz.manifestURL;
		}
		get type() {
			return this.moz.type;
		}
		get name() {
			let lang = navigator.language,
				manifest = this.moz.manifest;
			if (manifest.locales && manifest.locales[lang] && manifest.locales[lang].name) return manifest.locales[lang].name;
			else if (manifest.display) return manifest.display;
			else return manifest.name;
		}
		get color() {
			return this.moz.manifest.theme_color;
		}
	}
	class MozAppEntryPoint extends AppItem {
		constructor(moz, id) {
			super();
			this.moz = moz;
			this.ep = moz.manifest.entry_points[id];
			this.epid = id;
		}
		launch() {
			this.moz.launch(this.epid);
		}
		get id() {
			return this.moz.manifestURL + "#" + this.epid;
		}
		get type() {
			return this.moz.type;
		}
		get name() {
			let lang = navigator.language,
				manifest = this.ep;
			if (manifest.locales && manifest.locales[lang] && manifest.locales[lang].name) return manifest.locales[lang].name;
			else if (manifest.display) return manifest.display;
			else return manifest.name;
		}
		get color() {
			return this.ep.theme_color;
		}
	}
	class BookmarkAppItem extends AppItem {
		constructor(bm) {
			super();
			for (let key in bm) {
				if (key == "icon") {
					this.icon = () => bm.icon;
				} else {
					this[key] = bm[key];
				}
			}
		}
		launch() {
			if (window.MozActivity) {
				return new MozActivity({
					name: "view",
					data: {
						type: "url",
						url: this.url,
					},
				});
			} else {
				open(this.url);
			}
		}
		uninstall() {
			new Promise((res, err) => {
				try {
					BookmarksDatabase.remove(this.url);
					res("success");
				} catch (e) {
					err(e);
				}
			});
		}
	}
	function filterApps(applist, showSystem) {
		let ret = [];
		for (let app of applist) {
			if (["system", "theme", "homescreen", "input"].includes(app.manifest.role) && app.manifestURL !== "app://homescreen.gaiamobile.org" && !showSystem) {
				continue;
			}
			if (app.manifest.entry_points) {
				for (let epid in app.manifest.entry_points) {
					ret.push(new MozAppEntryPoint(app, epid));
				}
			} else ret.push(new MozAppItem(app));
		}
		return ret;
	}
	return {
		getAppItems(showSystem) {
			return new Promise((res, err) => {
				let array = [],
					n = () => res(array);
				apps.then((applist) => {
					array = array.concat(filterApps(applist, showSystem));

					BookmarksDatabase.getAll()
						.then((obj) => {
							for (let a in obj) {
								array.push(new BookmarkAppItem(obj[a]));
							}
							n();
						})
						.catch(n);

					// TODO: sort
				}).catch((e) => console.error(e));
			});
		},
		launchApp(id) {
			// This can also open bookmarks
			apps.then((applist) => {
				for (let app of filterApps(applist, true)) {
					if (app.id === id) app.launch();
				}
			});
		},
		launchByName(name) {
			apps.then((applist) => {
				for (let app of filterApps(applist, true)) {
					if (app.name == name) app.launch();
				}
			});
		},
		findApp(query) {
			return new Promise((res, err) => {
				// find apps using vague query
				// will only be used for dev purposes
				apps.then((applist) => {
					let val = filterApps(applist, true).find((a) => (a.name + a.description + a.display).toLowerCase().includes(query.toLowerCase()));
					console.log(val);
					res(val);
				});
			});
		},
	};
}
