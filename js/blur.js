function canvasBlur(obj = {}, callback = () => {}) {
	return new Promise((res, err) => {
		function handleErr(e) {
			callback(null, e);
			err(e);
		}
		function handleRes(e) {
			callback(e);
			res(e);
		}
		let img = new Image(),
			canvas = document.createElement("canvas"),
			{ input, radius, image, type, quality } = obj,
			objURL = false;
		if (!input) handleErr(new Error("no input provided"));
		else if ("string" === typeof input) img.src = input;
		else if (input instanceof Image) img.src = input.src;
		else if (input instanceof Blob) {
			img.src = URL.createObjectURL(input);
			objURL = true;
		} else handleErr(new Error("input provided is invalid please provide blob, image or url-string"));
		img.onload = function () {
			try {
				let context = canvas.getContext("2d");
				context.clearRect(0, 0, canvas.width, canvas.height);
				canvas.width = img.width;
				canvas.height = img.height;
				context.drawImage(img, 0, 0);

				let start = +new Date();
				let blur = radius;
				let ctx = canvas.getContext("2d");
				let sum = 0;
				let delta = 5;
				let alpha_left = 1 / (2 * Math.PI * delta * delta);
				let step = blur < 3 ? 1 : 2;
				for (let y = -blur; y <= blur; y += step) {
					for (let x = -blur; x <= blur; x += step) {
						let weight = alpha_left * Math.exp(-(x * x + y * y) / (2 * delta * delta));
						sum += weight;
					}
				}
				for (let y = -blur; y <= blur; y += step) {
					for (let x = -blur; x <= blur; x += step) {
						ctx.globalAlpha = ((alpha_left * Math.exp(-(x * x + y * y) / (2 * delta * delta))) / sum) * blur;
						ctx.drawImage(canvas, x, y);
					}
				}
				ctx.globalAlpha = 1;
				console.log("time: " + (+new Date() - start));
				if (objURL) URL.revokeObjectURL(img.src);
				if (image === true) {
					canvas.toBlob(handleRes, type, quality);
				} else {
					handleRes(canvas);
				}
			} catch (e) {
				handleErr(e);
			}
		};
		img.onerror = handleErr;
	});
}
