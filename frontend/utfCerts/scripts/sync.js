require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Event = require('../app/models/Event.model');
const Owner = require('../app/models/Owner.model');

const URL_LISTA = 'https://apl.utfpr.edu.br/extensao/certificados/listaPublica';
const URL_SEARCH =
	'https://apl.utfpr.edu.br/extensao/certificados/listaCertificadosPublicos/';
const REQUEST_TIMEOUT_MS = 25_000;

const HTML_ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	aacute: 'á',
	Aacute: 'Á',
	agrave: 'à',
	Agrave: 'À',
	acirc: 'â',
	Acirc: 'Â',
	atilde: 'ã',
	Atilde: 'Ã',
	eacute: 'é',
	Eacute: 'É',
	ecirc: 'ê',
	Ecirc: 'Ê',
	iacute: 'í',
	Iacute: 'Í',
	oacute: 'ó',
	Oacute: 'Ó',
	ocirc: 'ô',
	Ocirc: 'Ô',
	otilde: 'õ',
	Otilde: 'Õ',
	uacute: 'ú',
	Uacute: 'Ú',
	uuml: 'ü',
	Uuml: 'Ü',
	ccedil: 'ç',
	Ccedil: 'Ç',
	ordm: 'º',
	ordf: 'ª',
};

function decodeHtml(str) {
	return String(str || '')
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
			String.fromCharCode(parseInt(hex, 16))
		)
		.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
		.replace(/&([a-zA-Z]+);/g, (m, name) => HTML_ENTITIES[name] ?? m);
}

function stripTags(str) {
	return decodeHtml(String(str || '').replace(/<[^>]*>/g, ''));
}

function normalizeSearch(str) {
	return String(str || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase();
}

function normalizeOwnerName(raw) {
	return normalizeSearch(stripTags(raw))
		.replace(/^[*.\-'"\s\u00a0]+|[*.\-'"\s\u00a0]+$/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

async function fetchWithRetry(url, options = {}, retries = 3) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		try {
			const res = await fetch(url, {
				...options,
				signal: controller.signal,
				headers: {
					'User-Agent': 'UTFPR-Certificados-Sync/2.0',
					...(options.headers || {}),
				},
			});
			clearTimeout(timer);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return await res.text();
		} catch (err) {
			clearTimeout(timer);
			if (attempt === retries) throw err;
			await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
		}
	}
}

function parseSelectOptions(html, selectName) {
	const selectRe = new RegExp(
		`<select[^>]*name=["']${selectName}["'][^>]*>([\\s\\S]*?)</select>`,
		'i'
	);
	const m = html.match(selectRe);
	if (!m) return [];

	const opts = [];
	const optRe = /<option[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
	let match;
	while ((match = optRe.exec(m[1])) !== null) {
		const value = match[1].trim();
		const label = stripTags(match[2]).replace(/\s+/g, ' ').trim();
		if (value) opts.push({ value, label });
	}
	return opts;
}

async function fetchEventCerts(event) {
	let offset = 0;
	const certs = [];
	const ownersMap = new Map();

	while (true) {
		const body = new URLSearchParams({ txtEvento: event.code });
		const html = await fetchWithRetry(`${URL_SEARCH}${offset}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
		});

		const tableMatch = html.match(
			/<table[^>]*id=["']data_table["'][^>]*>([\s\S]*?)<\/table>/i
		);
		if (!tableMatch) break;

		const rowRe = /<tr[^>]*id=["'][^"']+["'][^>]*>([\s\S]*?)<\/tr>/gi;
		const rows = [];
		let rm;
		while ((rm = rowRe.exec(tableMatch[1])) !== null) {
			rows.push(rm[1]);
		}
		if (rows.length === 0) break;

		for (const rowHtml of rows) {
			const cols = [];
			const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
			let tm;
			while ((tm = tdRe.exec(rowHtml)) !== null) {
				cols.push(tm[1]);
			}
			if (cols.length < 3) continue;

			const ownerName = normalizeOwnerName(cols[0]);
			if (!ownerName) continue;

			const hrefMatch = cols[2].match(/href=["'][^"']*validar\/([^"'\s]+)["']/i);
			if (!hrefMatch) continue;
			const certCode = hrefMatch[1].trim();

			certs.push({ code: certCode, owner: ownerName });
			if (!ownersMap.has(ownerName)) ownersMap.set(ownerName, []);
			ownersMap.get(ownerName).push({
				code: certCode,
				year: event.year,
				event_code: event.code,
				event_name: event.name,
				campus: event.campus.name,
			});
		}

		if (rows.length < 15) break;
		offset += 15;
	}

	return {
		event: { ...event, certs, qty_certs: certs.length },
		ownersMap,
	};
}

async function saveEventAndOwners(event, ownersMap) {
	await Event.updateOne(
		{
			code: event.code,
			year: event.year,
			'campus.code': event.campus.code,
		},
		{ $set: event },
		{ upsert: true }
	);

	if (ownersMap.size === 0) return;

	const ownerNames = Array.from(ownersMap.keys());
	const existingDocs = await Owner.find(
		{ name: { $in: ownerNames } },
		{ name: 1, 'certs.code': 1 }
	).lean();

	const existingCodes = new Map();
	for (const doc of existingDocs) {
		existingCodes.set(
			doc.name,
			new Set((doc.certs || []).map((c) => c.code).filter(Boolean))
		);
	}

	const ops = [];
	for (const [ownerName, certList] of ownersMap.entries()) {
		const known = existingCodes.get(ownerName) || new Set();
		const newCerts = certList.filter((c) => !known.has(c.code));
		if (newCerts.length === 0) continue;

		ops.push({
			updateOne: {
				filter: { name: ownerName },
				update: {
					$setOnInsert: { name: ownerName },
					$push: { certs: { $each: newCerts } },
				},
				upsert: true,
			},
		});
	}

	if (ops.length > 0) {
		await Owner.bulkWrite(ops, { ordered: false });
	}
}

function parseArgs(argv) {
	const args = { mode: 'recent', campus: null, year: null, workers: 4 };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--mode' && argv[i + 1]) args.mode = argv[++i];
		else if (argv[i] === '--campus' && argv[i + 1]) args.campus = argv[++i];
		else if (argv[i] === '--year' && argv[i + 1]) args.year = argv[++i];
		else if (argv[i] === '--workers' && argv[i + 1])
			args.workers = Math.max(1, parseInt(argv[++i], 10) || 4);
	}
	return args;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const mongoUri = process.env.MONGO_URI || process.env.MONGODB_KEY;
	if (!mongoUri) {
		console.error('Erro: defina MONGODB_KEY no .env ou MONGO_URI no ambiente.');
		process.exit(1);
	}

	await mongoose.connect(mongoUri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		maxPoolSize: 10,
	});
	console.log('Conectado ao MongoDB.');

	const homeHtml = await fetchWithRetry(URL_LISTA);
	let campuses = parseSelectOptions(homeHtml, 'txtCampus').map((c) => ({
		code: c.value,
		name: c.label,
	}));
	const allYears = parseSelectOptions(homeHtml, 'txtAno').map((y) => y.value);

	if (args.campus) {
		campuses = campuses.filter((c) => c.code === args.campus);
	}

	const currentYear = new Date().getFullYear();
	let years;
	if (args.year) {
		years = allYears.filter((y) => y === args.year);
	} else if (args.mode === 'quick') {
		years = allYears.filter((y) => y === String(currentYear));
	} else if (args.mode === 'recent') {
		const recentSet = new Set([String(currentYear), String(currentYear - 1)]);
		years = allYears.filter((y) => recentSet.has(y));
	} else {
		years = allYears;
	}

	console.log(
		`Iniciando sync (mode=${args.mode}): ${campuses.length} campus(es), anos: ${years.join(', ')}`
	);

	let totalUpdated = 0;
	for (const campus of campuses) {
		for (const year of years) {
			let yearHtml;
			try {
				yearHtml = await fetchWithRetry(URL_LISTA, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({ txtCampus: campus.code, txtAno: year }),
				});
			} catch (err) {
				console.error(`[erro] ${campus.name} (${year}): ${err.message}`);
				continue;
			}

			const rawEvents = parseSelectOptions(yearHtml, 'txtEvento');
			if (rawEvents.length === 0) continue;

			const events = rawEvents.map((opt) => ({
				name: opt.label,
				name_search: normalizeSearch(opt.label),
				code: opt.value,
				year,
				campus,
				qty_certs: 0,
				certs: [],
			}));

			console.log(`[${campus.name} | ${year}] Coletando ${events.length} eventos...`);

			const queue = [...events];
			async function worker() {
				while (queue.length > 0) {
					const ev = queue.shift();
					try {
						const { event, ownersMap } = await fetchEventCerts(ev);
						await saveEventAndOwners(event, ownersMap);
						totalUpdated += 1;
					} catch (err) {
						console.error(`  [erro] Evento ${ev.code}: ${err.message}`);
					}
				}
			}

			await Promise.all(
				Array.from({ length: Math.min(args.workers, events.length) }, () => worker())
			);
		}
	}

	console.log(`Sync finalizado! Eventos processados/atualizados: ${totalUpdated}`);
	await mongoose.disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
