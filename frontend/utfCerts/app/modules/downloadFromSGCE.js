const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 20_000;

function fetchToFile(url, destPath, redirectsLeft = 5) {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https://') ? https : http;
		const req = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
			if (
				res.statusCode >= 300 &&
				res.statusCode < 400 &&
				res.headers.location &&
				redirectsLeft > 0
			) {
				res.resume();
				const nextUrl = new URL(res.headers.location, url).toString();
				return resolve(fetchToFile(nextUrl, destPath, redirectsLeft - 1));
			}

			if (res.statusCode !== 200) {
				res.resume();
				return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
			}

			const fileStream = fs.createWriteStream(destPath);
			res.pipe(fileStream);

			fileStream.on('finish', () => {
				fileStream.close();
				resolve();
			});

			fileStream.on('error', (err) => {
				fileStream.close();
				fs.unlink(destPath, () => {});
				reject(err);
			});
		});

		req.on('timeout', () => {
			req.destroy(new Error(`Timeout fetching ${url}`));
		});
		req.on('error', reject);
	});
}

module.exports = async (arrayCodes, pathToDir) => {
	const urlBase = 'https://apl.utfpr.edu.br/extensao/emitir/';
	const queue = [...arrayCodes];

	async function worker() {
		while (queue.length > 0) {
			const code = queue.shift();
			await fetchToFile(urlBase + code, path.join(pathToDir, code + '.pdf'));
		}
	}

	const workers = Array.from(
		{ length: Math.min(CONCURRENCY, arrayCodes.length) },
		() => worker()
	);
	await Promise.all(workers);
	return { success: true };
};
