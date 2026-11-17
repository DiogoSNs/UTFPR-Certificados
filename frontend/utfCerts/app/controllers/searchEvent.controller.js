const Event = require('../models/Event.model');
const downloadFiles = require('../modules/downloadFiles');
const mountParcial = require('../modules/mountParcial');
const {
	isValidObjectId,
	sanitizeCertCodes,
	escapeHtml,
	escapeJsArg,
} = require('../modules/validators');

const listCampus = [
	'CT', 'AP', 'CM', 'DV', 'FB', 'GP', 'LD',
	'MD', 'PB', 'PG', 'SH', 'TD', 'CP',
];

module.exports = {
	get: (req, res) => {
		res.render('searchEvent');
	},
	getEventSearch: async (req, res) => {
		try {
			let eventName = decodeURIComponent(req.params.eventName || '')
				.toUpperCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.trim();

			if (!eventName) {
				return res.end('');
			}

			eventName = eventName.replace(
				/\.|\^|\$|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\\|\||\—|\//g,
				(x) => '\\' + x
			);

			const events = await Event.find({ name_search: { $regex: eventName } })
				.select('name year campus')
				.sort({ year: -1 })
				.limit(50)
				.lean();

			let eventLi = '';
			for (const oneEvent of events) {
				const safeId = escapeJsArg(oneEvent._id.toString());
				const safeJsName = escapeJsArg(oneEvent.name);
				const safeYear = escapeHtml(oneEvent.year || '');
				const safeHtmlName = escapeHtml(oneEvent.name);
				eventLi += `<li><a href="javascript:getEventData('${safeId}', '${safeJsName}');"><div class="row"><div class="col-3 col-sm-2">| ${safeYear} |</div><div class="col-9 col-sm-10">${safeHtmlName}</div></div></a></li>`;
			}

			res.end(eventLi);
		} catch (err) {
			console.error('getEventSearch error:', err);
			res.status(500).end('');
		}
	},
	getEventData: async (req, res) => {
		try {
			const eventId = String(req.params.eventId || '');
			if (!isValidObjectId(eventId)) {
				return res.status(400).json({ err: true, message: 'ID inválido.' });
			}

			const oneEvent = await Event.findById(eventId).lean();
			if (!oneEvent) {
				return res.status(404).json({ err: true, message: 'Evento não encontrado.' });
			}

			const certs = Array.isArray(oneEvent.certs) ? oneEvent.certs : [];
			certs.sort((a, b) => (a.owner > b.owner ? 1 : -1));

			res.end(
				JSON.stringify({
					tableBody: mountParcial.createTableEvent(certs),
					qty: oneEvent.qty_certs,
					year: oneEvent.year,
					campus:
						listCampus[parseInt(oneEvent.campus?.code, 10) - 1] ||
						oneEvent.campus?.name ||
						'',
				})
			);
		} catch (err) {
			console.error('getEventData error:', err);
			res.status(500).json({ err: true });
		}
	},
	getEventDownload: async (req, res) => {
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
			console.error('getEventDownload error:', err);
			res.status(500).end('{"err": true}');
		}
	},
};
