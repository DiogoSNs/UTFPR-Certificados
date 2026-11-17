export function normalizeText(str) {
	return String(str || '')
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

export async function fetchOverview(retries = 3) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch('/api/overview');
			if (!res.ok) throw new Error('Falha ao carregar visão geral');
			return await res.json();
		} catch (err) {
			if (attempt === retries) throw err;
			await new Promise((r) => setTimeout(r, 2000));
		}
	}
}

export async function searchOwnersApi(query, signal) {
	const res = await fetch(`/api/owners/search?q=${encodeURIComponent(query)}`, {
		signal,
	});
	if (!res.ok) throw new Error('Falha na busca de pessoas');
	return res.json();
}

export async function fetchOwnerById(id) {
	const res = await fetch(`/api/owners/${encodeURIComponent(id)}`);
	if (!res.ok) throw new Error('Pessoa não encontrada');
	return res.json();
}

export async function searchEventsApi({ q = '', campus = '', year = '' }, signal) {
	const params = new URLSearchParams();
	if (q) params.set('q', q);
	if (campus) params.set('campus', campus);
	if (year) params.set('year', year);
	const res = await fetch(`/api/events/search?${params.toString()}`, { signal });
	if (!res.ok) throw new Error('Falha na busca de eventos');
	return res.json();
}

export async function fetchEventById(id) {
	const res = await fetch(`/api/events/${encodeURIComponent(id)}`);
	if (!res.ok) throw new Error('Evento não encontrado');
	return res.json();
}

export function openSingleCertPdf(code) {
	window.open(
		`https://apl.utfpr.edu.br/extensao/emitir/${encodeURIComponent(code)}`,
		'_blank',
		'noopener,noreferrer'
	);
}
