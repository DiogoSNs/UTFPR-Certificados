const Owner = require('../models/Owner.model');
const downloadFiles = require('../modules/downloadFiles');
const mountParcial = require('../modules/mountParcial');
const {
	isValidObjectId,
	sanitizeCertCodes,
	escapeHtml,
	escapeJsArg,
} = require('../modules/validators');

module.exports = {
	get: (req, res) => {
		res.render('searchOwner');
	},
	getOwnerSearch: async (req, res) => {
		try {
			let ownerName = decodeURIComponent(req.params.ownerName || '')
				.toUpperCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.trim();

			if (!ownerName) {
				return res.end('');
			}

			ownerName = ownerName.replace(
				/\.|\^|\$|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\\|\||\—|\//g,
				(x) => '\\' + x
			);

			const owners = await Owner.find({ name: { $regex: ownerName } })
				.select('name')
				.sort({ name: 1 })
				.limit(50)
				.lean();

			let ownerLi = '';
			for (const oneOwner of owners) {
				const safeId = escapeJsArg(oneOwner._id.toString());
				const safeJsName = escapeJsArg(oneOwner.name);
				const safeHtmlName = escapeHtml(oneOwner.name);
				ownerLi += `<li><a href="javascript:getOwnerData('${safeId}', '${safeJsName}');">${safeHtmlName}</a></li>`;
			}

			res.end(ownerLi);
		} catch (err) {
			console.error('getOwnerSearch error:', err);
			res.status(500).end('');
		}
	},
	getOwnerData: async (req, res) => {
		try {
			const ownerId = String(req.params.ownerId || '');
			if (!isValidObjectId(ownerId)) {
				return res.status(400).json({ err: true, message: 'ID inválido.' });
			}

			const oneOwner = await Owner.findById(ownerId).lean();
			if (!oneOwner) {
				return res.status(404).json({ err: true, message: 'Pessoa não encontrada.' });
			}

			const certs = Array.isArray(oneOwner.certs) ? oneOwner.certs : [];
			certs.sort((a, b) => (a.year < b.year ? 1 : -1));

			let selectYear = `<option value="all" selected>Todos (${certs.length})</option>`;
			const uniqueYears = [...new Set(certs.map((item) => item.year).filter(Boolean))];
			for (const yr of uniqueYears) {
				const safeYr = escapeHtml(yr);
				selectYear += `<option value="${safeYr}">${safeYr}</option>`;
			}

			res.end(
				JSON.stringify({
					tableBody: mountParcial.createTableOwner(certs),
					selectYear,
				})
			);
		} catch (err) {
			console.error('getOwnerData error:', err);
			res.status(500).json({ err: true });
		}
	},
	getOwnerDownload: async (req, res) => {
		const arrayCodes = sanitizeCertCodes(req.params.arrayCodes, 99);
		if (!arrayCodes) {
			return res.status(400).end('{"err": true}');
		}

		try {
			const userId =
				'user_' + (Math.floor(Math.random() * 10000) + 1) + Date.now();
			await downloadFiles(userId, arrayCodes);
			res.end(JSON.stringify({ userId: userId.toString() }));
		} catch (err) {
			console.error('getOwnerDownload error:', err);
			res.status(500).end('{"err": true}');
		}
	},
};
