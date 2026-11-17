const downloadFromSGCE = require('./downloadFromSGCE');
const zipDirectory = require('./zipDirectory');
const path = require('path');
const fs = require('fs');
const deleteDir = require('./deleteDir');

module.exports = async (userId, arrayCodes) => {
	const pathToDir = path.join(process.cwd(), 'uploads', 'temp', userId);
	const pathToDirFiles = path.join(pathToDir, 'files');
	const pathToDirFilesMyCerts = path.join(pathToDirFiles, 'myCerts');

	if (fs.existsSync(pathToDir)) {
		deleteDir(pathToDir);
	}

	fs.mkdirSync(pathToDirFilesMyCerts, { recursive: true });

	try {
		console.log('##### -- Download Process Start');
		await downloadFromSGCE(arrayCodes, pathToDirFilesMyCerts);
		await zipDirectory(pathToDir);
	} catch (err) {
		deleteDir(pathToDir);
		throw err;
	}
};
