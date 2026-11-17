const pathEventSearch = '/searchEvent/eventSearch/';
const pathEventData = '/searchEvent/eventData/';
const pathEventDownload = '/searchEvent/download/';

let searchTimer = null;
let searchAbort = null;

const inputEl = document.getElementById('inputSearchEvent');
const clearBtn = document.getElementById('btnClearEventSearch');
const divSearch = document.getElementById('divSearch');
const ulSearch = document.getElementById('ulSearch');

function normalizeText(str) {
	return str
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

inputEl.addEventListener('input', () => {
	const value = inputEl.value.trim();
	clearBtn.classList.toggle('d-none', value.length === 0);

	clearTimeout(searchTimer);
	if (value.length < 3) {
		divSearch.classList.add('d-none');
		return;
	}

	searchTimer = setTimeout(() => getEventSearch(value), 220);
});

inputEl.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		closeSearch();
	}
});

document.addEventListener('click', (e) => {
	const wrap = document.getElementById('searchBoxWrap');
	if (wrap && !wrap.contains(e.target)) {
		closeSearch();
	}
});

async function getEventSearch(query) {
	if (searchAbort) searchAbort.abort();
	searchAbort = new AbortController();

	try {
		const res = await fetch(pathEventSearch + encodeURIComponent(query), {
			signal: searchAbort.signal,
		});
		const html = await res.text();

		if (html.trim().length > 0) {
			ulSearch.innerHTML = html;
			divSearch.classList.remove('d-none');
		} else {
			ulSearch.innerHTML =
				'<li><a href="javascript:void(0)" style="color: var(--text-3); pointer-events: none;">Nenhum evento encontrado</a></li>';
			divSearch.classList.remove('d-none');
		}
	} catch (err) {
		if (err.name !== 'AbortError') console.error(err);
	}
}

async function getEventData(eventId, eventName) {
	closeSearch();
	inputEl.value = eventName;
	clearBtn.classList.remove('d-none');

	document.getElementById('divInfo').classList.add('d-none');
	document.getElementById('divLoadingContent').classList.remove('d-none');

	try {
		const res = await fetch(pathEventData + encodeURIComponent(eventId));
		const data = await res.json();

		document.getElementById('selectedEventTitle').textContent = eventName;
		document.getElementById('badgeEventYear').textContent = data.year || '-';
		document.getElementById('badgeEventCampus').textContent = data.campus || '-';
		document.getElementById('badgeEventQty').textContent =
			(data.qty || 0) + ' certificados';

		document.getElementById('tableBody').innerHTML = data.tableBody;
		document.getElementById('floatingInputOwner').value = '';
		document.getElementById('selectAllVisible').checked = false;

		document.getElementById('divLoadingContent').classList.add('d-none');
		document.getElementById('divInfo').classList.remove('d-none');
	} catch (err) {
		console.error(err);
		document.getElementById('divLoadingContent').classList.add('d-none');
	}
}

function filterOwners() {
	const ownerString = normalizeText(
		document.getElementById('floatingInputOwner').value
	);
	const allTrs = document.getElementById('tableBody').children;

	for (const oneTr of allTrs) {
		const link = oneTr.querySelector('a');
		const checkbox = oneTr.querySelector('input');
		if (!link || !checkbox) continue;

		if (normalizeText(link.textContent).includes(ownerString)) {
			oneTr.classList.remove('d-none');
			checkbox.classList.add('is-show');
		} else {
			oneTr.classList.add('d-none');
			checkbox.classList.remove('is-show');
		}
	}

	document.getElementById('selectAllVisible').checked = false;
}

function clearFilter() {
	document.getElementById('floatingInputOwner').value = '';
	filterOwners();
}

function clearEventSearch() {
	inputEl.value = '';
	clearBtn.classList.add('d-none');
	closeSearch();
	inputEl.focus();
}

function toggleSelectAll(checked) {
	const checkboxes = document.querySelectorAll(
		'#tableBody input.is-show[name="checkboxDownload"]'
	);
	checkboxes.forEach((cb) => {
		cb.checked = checked;
	});
}

function openDownloadModal(title, bodyHtml) {
	document.getElementById('modalDownloadTitle').textContent = title;
	document.getElementById('modalDownloadBody').innerHTML = bodyHtml;
	document.getElementById('modalDownload').classList.remove('d-none');
}

function closeDownloadModal() {
	document.getElementById('modalDownload').classList.add('d-none');
}

async function downloadFiles(isOnlySelected) {
	const tableBody = document.getElementById('tableBody');
	let queryStr = 'input.is-show[name="checkboxDownload"]';
	if (isOnlySelected) queryStr += ':checked';

	const arrayCodes = [...tableBody.querySelectorAll(queryStr)].map(
		(item) => item.id
	);

	if (arrayCodes.length === 0) {
		openDownloadModal(
			'Nenhum certificado selecionado',
			'<p>Selecione pelo menos um participante na tabela ou clique em <strong>Baixar todos</strong>.</p>'
		);
		return;
	}

	openDownloadModal(
		'Preparando download',
		'<div class="loading-state" style="padding: 12px 0;"><span class="spinner" aria-hidden="true"></span><span>Compactando ' +
			arrayCodes.length +
			' certificado(s) em ZIP...</span></div>'
	);

	try {
		const res = await fetch(
			pathEventDownload + encodeURIComponent(JSON.stringify(arrayCodes))
		);
		const data = await res.json();

		if (!data.err && data.userId) {
			window.location = '/download/' + data.userId;
			closeDownloadModal();
		} else {
			openDownloadModal(
				'Limite de download',
				'<p>Muitos certificados selecionados de uma só vez (máximo de 99 por lote) ou limite de requisições atingido. Selecione uma quantidade menor e tente novamente.</p>'
			);
		}
	} catch {
		openDownloadModal(
			'Erro no download',
			'<p>Não foi possível gerar o arquivo ZIP no momento. Tente novamente em alguns instantes.</p>'
		);
	}
}

function closeSearch() {
	divSearch.classList.add('d-none');
}
