const path = require('path');
const fs = require('fs');
const deleteDir = require('../modules/deleteDir');
const { isValidUserId } = require('../modules/validators');

function resolveTempDir(userId) {
	if (!isValidUserId(userId)) {
		return null;
	}
	return path.join(process.cwd(), 'uploads', 'temp', userId);
}

module.exports = {
	getDownloadCerts: (req, res) => {
		const pathToDir = resolveTempDir(req.params.userId);
		if (!pathToDir) {
			return res.status(400).json({ err: true, message: 'ID inválido.' });
		}

		const zipPath = path.join(pathToDir, 'certs.zip');
		if (!fs.existsSync(zipPath)) {
			return res.status(404).json({ err: true, message: 'Arquivo não encontrado.' });
		}

		res.download(zipPath, (err) => {
			if (err) console.log('Err Down: ' + err);
			deleteDir(pathToDir);
		});
	},
	getDeleteDir: (req, res) => {
		const pathToDir = resolveTempDir(req.params.userId);
		if (!pathToDir) {
			return res.status(400).json({ err: true });
		}

		deleteDir(pathToDir);
		res.json({ success: true });
	},
};
