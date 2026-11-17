const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Event = require('../models/Event.model');
const Owner = require('../models/Owner.model');
const downloadFiles = require('../modules/downloadFiles');
const { isValidObjectId, sanitizeCertCodes } = require('../modules/validators');
const {
	MAX_BATCH_CERTS,
	canStartBatchDownload,
	enterZipSlot,
	leaveZipSlot,
	getQuotaStatus,
	createTtlCache,
} = require('../modules/quotaGuard');

let overviewCache = null;
let overviewCacheExpiresAt = 0;

const queryCache = createTtlCache({ maxEntries: 250, ttlMs: 5 * 60 * 1000 });

function escapeRegex(str) {
	return str.replace(
		/\.|\^|\$|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\\|\||\—|\//g,
		(x) => '\\' + x
	);
}

function normalizeQuery(str) {
	return String(str || '')
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

module.exports = {
	health: (req, res) => {
		const connected = mongoose.connection.readyState === 1;
		res.status(connected ? 200 : 503).json({
			ok: connected,
			db: connected ? 'connected' : 'disconnected',
			quota: getQuotaStatus(),
		});
	},

	getOverview: async (req, res) => {
		try {
			const now = Date.now();
			if (overviewCache && now < overviewCacheExpiresAt) {
				res.setHeader('Cache-Control', 'public, max-age=300');
				return res.json(overviewCache);
			}

			const [totalEvents, totalOwners, campusAgg, yearsRaw, recentEvents] =
				await Promise.all([
					Event.estimatedDocumentCount(),
					Owner.estimatedDocumentCount(),
					Event.aggregate([
						{ $match: { 'campus.name': { $exists: true, $ne: '' } } },
						{
							$group: {
								_id: '$campus.name',
								code: { $first: '$campus.code' },
								count: { $sum: 1 },
							},
						},
						{ $sort: { count: -1, _id: 1 } },
					]),
					Event.distinct('year'),
					Event.find({ qty_certs: { $gt: 0 } })
						.select('name year campus qty_certs')
						.sort({ year: -1, _id: -1 })
						.limit(5)
						.lean(),
				]);

			const years = yearsRaw
				.filter((y) => typeof y === 'string' && /^\d{4}$/.test(y))
				.sort((a, b) => b.localeCompare(a));

			const campuses = campusAgg.map((c) => ({
				name: c._id,
				code: c.code || '',
				count: c.count,
			}));

			overviewCache = {
				totalEvents,
				totalOwners,
				maxBatchCerts: MAX_BATCH_CERTS,
				campuses,
				years,
				recentEvents: recentEvents.map((ev) => ({
					_id: ev._id.toString(),
					name: ev.name,
					year: ev.year,
					campus: ev.campus?.name || '',
					qty_certs: ev.qty_certs || 0,
				})),
			};
			overviewCacheExpiresAt = now + 10 * 60 * 1000;

			res.setHeader('Cache-Control', 'public, max-age=300');
			res.json(overviewCache);
		} catch (err) {
			console.error('api.getOverview error:', err);
			res.status(500).json({ err: true });
		}
	},

	searchOwners: async (req, res) => {
		try {
			const q = normalizeQuery(req.query.q);
			if (q.length < 2) {
				return res.json({ owners: [] });
			}

			const cacheKey = `owners:${q}`;
			const cached = queryCache.get(cacheKey);
			if (cached) return res.json(cached);

			const regex = new RegExp(escapeRegex(q));
			const owners = await Owner.find({ name: { $regex: regex } })
				.select('name certs.code')
				.sort({ name: 1 })
				.limit(40)
				.lean();

			const payload = {
				owners: owners.map((o) => ({
					_id: o._id.toString(),
					name: o.name,
					certCount: Array.isArray(o.certs) ? o.certs.length : 0,
				})),
			};
			queryCache.set(cacheKey, payload);
			res.json(payload);
		} catch (err) {
			console.error('api.searchOwners error:', err);
			res.status(500).json({ err: true });
		}
	},

	getOwnerById: async (req, res) => {
		try {
			const ownerId = String(req.params.id || '');
			if (!isValidObjectId(ownerId)) {
				return res.status(400).json({ err: true, message: 'ID inválido.' });
			}

			const cacheKey = `owner:${ownerId}`;
			const cached = queryCache.get(cacheKey);
			if (cached) return res.json(cached);

			const owner = await Owner.findById(ownerId).lean();
			if (!owner) {
				return res.status(404).json({ err: true, message: 'Pessoa não encontrada.' });
			}

			const rawCerts = Array.isArray(owner.certs) ? owner.certs : [];

			const missingEventCodes = [
				...new Set(
					rawCerts
						.filter((c) => !c.campus && c.event_code)
						.map((c) => c.event_code)
				),
			];

			const campusByEventCode = new Map();
			if (missingEventCodes.length > 0) {
				const matchedEvents = await Event.find({
					code: { $in: missingEventCodes },
				})
					.select('code campus.name')
					.lean();
				for (const ev of matchedEvents) {
					if (ev.campus?.name) {
						campusByEventCode.set(ev.code, ev.campus.name);
					}
				}
			}

			const certs = rawCerts
				.map((c) => ({
					code: c.code,
					year: c.year || '',
					event_code: c.event_code || '',
					event_name: c.event_name || '',
					campus: c.campus || campusByEventCode.get(c.event_code) || 'Cornélio Procópio',
				}))
				.sort((a, b) => (a.year < b.year ? 1 : -1));

			const years = [...new Set(certs.map((c) => c.year).filter(Boolean))].sort((a, b) =>
				b.localeCompare(a)
			);
			const campuses = [...new Set(certs.map((c) => c.campus).filter(Boolean))].sort();

			const payload = {
				_id: owner._id.toString(),
				name: owner.name,
				certs,
				years,
				campuses,
			};
			queryCache.set(cacheKey, payload);
			res.json(payload);
		} catch (err) {
			console.error('api.getOwnerById error:', err);
			res.status(500).json({ err: true });
		}
	},

	searchEvents: async (req, res) => {
		try {
			const q = normalizeQuery(req.query.q);
			const campus = String(req.query.campus || '').trim();
			const year = String(req.query.year || '').trim();

			if (!q && !campus && !year) {
				return res.json({ events: [] });
			}

			const cacheKey = `events:${q}|${campus}|${year}`;
			const cached = queryCache.get(cacheKey);
			if (cached) return res.json(cached);

			const filter = {};
			if (q) {
				filter.name_search = { $regex: new RegExp(escapeRegex(q)) };
			}
			if (campus) {
				filter['campus.name'] = campus;
			}
			if (year && /^\d{4}$/.test(year)) {
				filter.year = year;
			}

			const events = await Event.find(filter)
				.select('name year campus qty_certs')
				.sort({ year: -1, name: 1 })
				.limit(60)
				.lean();

			const payload = {
				events: events.map((ev) => ({
					_id: ev._id.toString(),
					name: ev.name,
					year: ev.year || '',
					campus: ev.campus?.name || '',
					qty_certs: ev.qty_certs || 0,
				})),
			};
			queryCache.set(cacheKey, payload);
			res.json(payload);
		} catch (err) {
			console.error('api.searchEvents error:', err);
			res.status(500).json({ err: true });
		}
	},

	getEventById: async (req, res) => {
		try {
			const eventId = String(req.params.id || '');
			if (!isValidObjectId(eventId)) {
				return res.status(400).json({ err: true, message: 'ID inválido.' });
			}

			const cacheKey = `event:${eventId}`;
			const cached = queryCache.get(cacheKey);
			if (cached) return res.json(cached);

			const ev = await Event.findById(eventId).lean();
			if (!ev) {
				return res.status(404).json({ err: true, message: 'Evento não encontrado.' });
			}

			const certs = (Array.isArray(ev.certs) ? ev.certs : [])
				.map((c) => ({ code: c.code, owner: c.owner }))
				.sort((a, b) => a.owner.localeCompare(b.owner));

			const payload = {
				_id: ev._id.toString(),
				name: ev.name,
				year: ev.year || '',
				campus: ev.campus?.name || '',
				qty_certs: ev.qty_certs || certs.length,
				certs,
			};
			queryCache.set(cacheKey, payload);
			res.json(payload);
		} catch (err) {
			console.error('api.getEventById error:', err);
			res.status(500).json({ err: true });
		}
	},

	prepareDownload: async (req, res) => {
		const rawCodes = JSON.stringify(req.body?.codes || []);
		const arrayCodes = sanitizeCertCodes(rawCodes, MAX_BATCH_CERTS);
		if (!arrayCodes) {
			return res.status(400).json({
				err: true,
				message: `Selecione entre 1 e ${MAX_BATCH_CERTS} certificados válidos por lote.`,
			});
		}

		const gate = canStartBatchDownload();
		if (!gate.allowed) {
			return res.status(gate.status).json({
				err: true,
				message: gate.message,
			});
		}

		enterZipSlot();
		let zipSize = 0;
		try {
			const userId =
				'user_' + (Math.floor(Math.random() * 10000) + 1) + Date.now();
			await downloadFiles(userId, arrayCodes);

			const zipPath = path.join(process.cwd(), 'uploads', 'temp', userId, 'certs.zip');
			if (fs.existsSync(zipPath)) {
				zipSize = fs.statSync(zipPath).size;
			}
			res.json({ userId });
		} catch (err) {
			console.error('api.prepareDownload error:', err);
			res.status(500).json({
				err: true,
				message: 'Falha ao baixar certificados do servidor da UTFPR.',
			});
		} finally {
			leaveZipSlot(zipSize);
		}
	},
};
