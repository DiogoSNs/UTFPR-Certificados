const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

module.exports = (pathToDir) => {
	const output = fs.createWriteStream(path.join(pathToDir, 'certs.zip'));
	const archive = archiver('zip');

	return new Promise((resolve, reject) => {
		output.on('close', () => {
			console.log('Size: ' + archive.pointer() / 1000 + ' kb');
			resolve({ success: true });
		});

		archive.on('error', (err) => {
			reject(err);
		});

		archive.pipe(output);
		archive.directory(path.join(pathToDir, 'files'), false);
		archive.finalize();
	});
};
