import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	FiSearch,
	FiX,
	FiDownload,
	FiExternalLink,
	FiFileText,
	FiArrowLeft,
	FiFilter,
} from 'react-icons/fi';
import {
	fetchEventById,
	fetchOverview,
	normalizeText,
	openSingleCertPdf,
	searchEventsApi,
} from '../lib/api';
import { DownloadModal } from '../components/DownloadModal';

export function SearchEventPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(searchParams.get('q') || '');
	const [campusFilter, setCampusFilter] = useState(searchParams.get('campus') || '');
	const [yearFilter, setYearFilter] = useState(searchParams.get('year') || '');

	const [campuses, setCampuses] = useState([]);
	const [years, setYears] = useState([]);

	const [eventsList, setEventsList] = useState([]);
	const [loadingList, setLoadingList] = useState(false);

	const [selectedEvent, setSelectedEvent] = useState(null);
	const [loadingEvent, setLoadingEvent] = useState(false);

	const [ownerFilter, setOwnerFilter] = useState('');
	const [selectedCodes, setSelectedCodes] = useState(new Set());
	const [modal, setModal] = useState({
		open: false,
		items: [],
		emptyMessage: '',
	});

	useEffect(() => {
		fetchOverview()
			.then((data) => {
				setCampuses(data.campuses || []);
				setYears(data.years || []);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		const id = searchParams.get('id');
		if (!id) {
			setSelectedEvent(null);
			return;
		}
		setLoadingEvent(true);
		fetchEventById(id)
			.then((data) => {
				setSelectedEvent(data);
				setOwnerFilter('');
				setSelectedCodes(new Set());
			})
			.catch(() => setSelectedEvent(null))
			.finally(() => setLoadingEvent(false));
	}, [searchParams]);

	useEffect(() => {
		const q = query.trim();
		if (!q && !campusFilter && !yearFilter) {
			setEventsList([]);
			return;
		}

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setLoadingList(true);
			try {
				const data = await searchEventsApi(
					{ q, campus: campusFilter, year: yearFilter },
					controller.signal
				);
				setEventsList(data.events || []);
			} catch (err) {
				if (err.name !== 'AbortError') setEventsList([]);
			} finally {
				setLoadingList(false);
			}
		}, 200);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query, campusFilter, yearFilter]);

	function openEvent(id) {
		const next = new URLSearchParams(searchParams);
		next.set('id', id);
		setSearchParams(next);
	}

	function backToList() {
		const next = new URLSearchParams(searchParams);
		next.delete('id');
		setSearchParams(next);
		setSelectedEvent(null);
	}

	const filteredParticipants = useMemo(() => {
		if (!selectedEvent) return [];
		const term = normalizeText(ownerFilter);
		if (!term) return selectedEvent.certs;
		return selectedEvent.certs.filter((c) => normalizeText(c.owner).includes(term));
	}, [selectedEvent, ownerFilter]);

	const visibleCodes = useMemo(
		() => filteredParticipants.map((c) => c.code),
		[filteredParticipants]
	);

	const allVisibleSelected =
		visibleCodes.length > 0 && visibleCodes.every((c) => selectedCodes.has(c));

	function toggleAllVisible() {
		setSelectedCodes((prev) => {
			const next = new Set(prev);
			if (allVisibleSelected) {
				visibleCodes.forEach((c) => next.delete(c));
			} else {
				visibleCodes.forEach((c) => next.add(c));
			}
			return next;
		});
	}

	function toggleCode(code) {
		setSelectedCodes((prev) => {
			const next = new Set(prev);
			if (next.has(code)) next.delete(code);
			else next.add(code);
			return next;
		});
	}

	function handleBatchDownload(onlySelected) {
		const targetCerts = onlySelected
			? filteredParticipants.filter((c) => selectedCodes.has(c.code))
			: filteredParticipants;

		if (targetCerts.length === 0) {
			setModal({
				open: true,
				items: [],
				emptyMessage:
					'Selecione pelo menos um participante ou clique em "Baixar todos".',
			});
			return;
		}

		if (targetCerts.length === 1) {
			openSingleCertPdf(targetCerts[0].code);
			return;
		}

		setModal({
			open: true,
			items: targetCerts.map((c) => ({
				code: c.code,
				title: c.owner,
				subtitle: `${selectedEvent?.year || ''} · ${selectedEvent?.campus || ''}`,
			})),
			emptyMessage: '',
		});
	}

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
			<div className="mb-5 sm:mb-6">
				<h1 className="text-xl font-bold tracking-tight text-[#18181a] sm:text-2xl">
					Buscar por Evento
				</h1>
				<p className="mt-1 text-sm text-[#52525e]">
					Filtre eventos por câmpus, ano ou nome para visualizar os participantes e emitir certificados.
				</p>
			</div>

			{/* Multi-Filter Bar */}
			<div className="mb-5 rounded-xl border border-[#e5e5e2] bg-white p-3.5 shadow-2xs sm:mb-6">
				<div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
					<div className="relative md:col-span-6">
						<FiSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8c8c98]" />
						<input
							type="text"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								if (selectedEvent) backToList();
							}}
							placeholder="Nome do evento, oficina, semana acadêmica..."
							className="h-11 w-full rounded-lg border border-[#d4d4cf] bg-[#f8f8f6] pr-9 pl-10 text-sm text-[#18181a] placeholder:text-[#8c8c98] focus:border-[#18181a] focus:bg-white focus:outline-none sm:h-10"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery('')}
								className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1.5 text-[#8c8c98] hover:bg-[#e5e5e2]"
								aria-label="Limpar"
							>
								<FiX className="h-3.5 w-3.5" />
							</button>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2.5 md:col-span-6 md:grid-cols-2">
						<select
							value={campusFilter}
							onChange={(e) => {
								setCampusFilter(e.target.value);
								if (selectedEvent) backToList();
							}}
							className="h-11 w-full rounded-lg border border-[#d4d4cf] bg-[#f8f8f6] px-3 text-sm text-[#18181a] focus:border-[#18181a] focus:bg-white focus:outline-none sm:h-10"
							aria-label="Filtrar por câmpus"
						>
							<option value="">Todos os câmpus</option>
							{campuses.map((c) => (
								<option key={c.name} value={c.name}>
									{c.name} ({c.count})
								</option>
							))}
						</select>

						<div className="flex gap-2">
							<select
								value={yearFilter}
								onChange={(e) => {
									setYearFilter(e.target.value);
									if (selectedEvent) backToList();
								}}
								className="h-11 min-w-0 flex-1 rounded-lg border border-[#d4d4cf] bg-[#f8f8f6] px-3 text-sm text-[#18181a] focus:border-[#18181a] focus:bg-white focus:outline-none sm:h-10"
								aria-label="Filtrar por ano"
							>
								<option value="">Todos os anos</option>
								{years.map((y) => (
									<option key={y} value={y}>
										{y}
									</option>
								))}
							</select>

							{(query || campusFilter || yearFilter) && (
								<button
									type="button"
									onClick={() => {
										setQuery('');
										setCampusFilter('');
										setYearFilter('');
										backToList();
									}}
									className="h-11 shrink-0 rounded-lg border border-[#e5e5e2] bg-white px-3 text-xs font-medium text-[#52525e] hover:bg-[#f3f3f1] hover:text-[#18181a] sm:h-10"
								>
									Limpar
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Detail View */}
			{loadingEvent ? (
				<div className="flex items-center justify-center gap-3 rounded-xl border border-[#e5e5e2] bg-white py-14 text-sm text-[#52525e]">
					<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4d4cf] border-t-[#18181a]" />
					<span>Carregando participantes do evento...</span>
				</div>
			) : selectedEvent ? (
				<div className="overflow-hidden rounded-xl border border-[#e5e5e2] bg-white shadow-2xs">
					<div className="flex flex-col gap-3 border-b border-[#e5e5e2] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
						<div>
							{eventsList.length > 0 && (
								<button
									type="button"
									onClick={backToList}
									className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#52525e] hover:text-[#18181a]"
								>
									<FiArrowLeft className="h-3.5 w-3.5" />
									<span>Voltar aos resultados</span>
								</button>
							)}
							<h2 className="text-base font-semibold text-[#18181a] sm:text-lg">
								{selectedEvent.name}
							</h2>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="font-mono-code rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs text-[#52525e]">
									{selectedEvent.year}
								</span>
								<span className="rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs font-medium text-[#52525e]">
									{selectedEvent.campus}
								</span>
								<span className="font-mono-code rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs text-[#52525e]">
									{selectedEvent.qty_certs} certificado(s)
								</span>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
							<button
								type="button"
								onClick={() => handleBatchDownload(true)}
								disabled={selectedCodes.size === 0}
								className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#d4d4cf] bg-white px-3 text-xs font-semibold text-[#18181a] hover:bg-[#f3f3f1] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:px-3.5"
							>
								<FiDownload className="h-3.5 w-3.5" />
								<span>Selecionados ({selectedCodes.size})</span>
							</button>
							<button
								type="button"
								onClick={() => handleBatchDownload(false)}
								disabled={filteredParticipants.length === 0}
								className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#18181a] px-3 text-xs font-semibold text-white hover:bg-[#2d2d32] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:px-3.5"
							>
								<FiDownload className="h-3.5 w-3.5" />
								<span>Baixar todos ({filteredParticipants.length})</span>
							</button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 border-b border-[#e5e5e2] bg-[#f8f8f6] px-4 py-3 sm:gap-2.5 sm:px-5">
						<div className="hidden items-center gap-1.5 text-xs font-semibold text-[#52525e] sm:flex">
							<FiFilter className="h-3.5 w-3.5" />
							<span>Participante:</span>
						</div>
						<input
							type="text"
							value={ownerFilter}
							onChange={(e) => setOwnerFilter(e.target.value)}
							placeholder="Filtrar participante na lista..."
							className="h-10 min-w-0 flex-1 rounded-lg border border-[#d4d4cf] bg-white px-3 text-xs text-[#18181a] placeholder:text-[#8c8c98] focus:border-[#18181a] focus:outline-none sm:h-9 sm:max-w-sm"
						/>
						{ownerFilter && (
							<button
								type="button"
								onClick={() => setOwnerFilter('')}
								className="h-10 rounded-lg border border-[#e5e5e2] bg-white px-3 text-xs font-medium text-[#52525e] hover:bg-[#f3f3f1] sm:h-9"
							>
								Limpar
							</button>
						)}
					</div>

					{/* Mobile Cards (< md) */}
					<div className="md:hidden">
						{filteredParticipants.length > 0 && (
							<div className="flex items-center justify-between border-b border-[#e5e5e2] bg-white px-4 py-2.5">
								<label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#52525e]">
									<input
										type="checkbox"
										checked={allVisibleSelected}
										onChange={toggleAllVisible}
										className="h-4 w-4 rounded accent-[#18181a]"
									/>
									<span>Selecionar todos visíveis</span>
								</label>
							</div>
						)}
						<div className="divide-y divide-[#e5e5e2]">
							{filteredParticipants.length === 0 ? (
								<div className="px-4 py-10 text-center text-sm text-[#8c8c98]">
									Nenhum participante encontrado neste evento.
								</div>
							) : (
								filteredParticipants.map((cert) => (
									<div key={cert.code} className="space-y-2.5 p-4">
										<label className="flex items-start gap-3">
											<input
												type="checkbox"
												checked={selectedCodes.has(cert.code)}
												onChange={() => toggleCode(cert.code)}
												className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#18181a]"
											/>
											<span className="text-sm font-medium text-[#18181a]">
												{cert.owner}
											</span>
										</label>
										<div className="grid grid-cols-2 gap-2 pl-7">
											<a
												href={`https://apl.utfpr.edu.br/extensao/emitir/${encodeURIComponent(cert.code)}`}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e2] bg-[#f8f8f6] text-xs font-medium text-[#18181a]"
											>
												<FiFileText className="h-3.5 w-3.5" />
												<span>Baixar PDF</span>
											</a>
											<a
												href={`https://apl.utfpr.edu.br/extensao/certificados/validar/${cert.code}`}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e2] bg-white text-xs font-medium text-[#52525e]"
											>
												<FiExternalLink className="h-3.5 w-3.5" />
												<span>Validar</span>
											</a>
										</div>
									</div>
								))
							)}
						</div>
					</div>

					{/* Desktop Table (>= md) */}
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full border-collapse text-left text-sm">
							<thead>
								<tr className="border-b border-[#e5e5e2] bg-white text-[11.5px] font-semibold tracking-wider text-[#52525e] uppercase">
									<th className="w-11 px-4 py-3 text-center">
										<input
											type="checkbox"
											checked={allVisibleSelected}
											onChange={toggleAllVisible}
											className="h-4 w-4 cursor-pointer rounded accent-[#18181a]"
											aria-label="Selecionar todos visíveis"
										/>
									</th>
									<th className="px-4 py-3">Participante</th>
									<th className="w-36 px-4 py-3 text-right">Ações</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f3f3f1]">
								{filteredParticipants.length === 0 ? (
									<tr>
										<td
											colSpan={3}
											className="px-4 py-10 text-center text-sm text-[#8c8c98]"
										>
											Nenhum participante encontrado neste evento.
										</td>
									</tr>
								) : (
									filteredParticipants.map((cert) => (
										<tr
											key={cert.code}
											className="transition-colors hover:bg-[#f8f8f6]"
										>
											<td className="px-4 py-3 text-center">
												<input
													type="checkbox"
													checked={selectedCodes.has(cert.code)}
													onChange={() => toggleCode(cert.code)}
													className="h-4 w-4 cursor-pointer rounded accent-[#18181a]"
													aria-label={`Selecionar ${cert.owner}`}
												/>
											</td>
											<td className="px-4 py-3 font-medium text-[#18181a]">
												{cert.owner}
											</td>
											<td className="px-4 py-3 text-right">
												<div className="inline-flex items-center gap-2">
													<a
														href={`https://apl.utfpr.edu.br/extensao/emitir/${encodeURIComponent(cert.code)}`}
														target="_blank"
														rel="noopener noreferrer"
														title="Baixar PDF oficial"
														className="inline-flex items-center gap-1 rounded-md border border-[#e5e5e2] bg-white px-2.5 py-1 text-xs font-medium text-[#18181a] hover:bg-[#f3f3f1]"
													>
														<FiFileText className="h-3.5 w-3.5" />
														<span>PDF</span>
													</a>
													<a
														href={`https://apl.utfpr.edu.br/extensao/certificados/validar/${cert.code}`}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 rounded-md border border-[#e5e5e2] bg-white px-2.5 py-1 text-xs font-medium text-[#52525e] hover:bg-[#f3f3f1] hover:text-[#18181a]"
													>
														<FiExternalLink className="h-3.5 w-3.5" />
														<span>Validar</span>
													</a>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				/* Events Results List */
				<div>
					{loadingList ? (
						<div className="flex items-center justify-center gap-3 rounded-xl border border-[#e5e5e2] bg-white py-14 text-sm text-[#52525e]">
							<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4d4cf] border-t-[#18181a]" />
							<span>Buscando eventos...</span>
						</div>
					) : !query.trim() && !campusFilter && !yearFilter ? (
						<div className="rounded-xl border border-dashed border-[#d4d4cf] bg-white/60 px-6 py-12 text-center">
							<p className="text-sm font-medium text-[#52525e]">
								Selecione um câmpus, um ano ou digite o nome de um evento acima para listar os resultados.
							</p>
						</div>
					) : eventsList.length === 0 ? (
						<div className="rounded-xl border border-[#e5e5e2] bg-white px-6 py-12 text-center text-sm text-[#8c8c98]">
							Nenhum evento encontrado para os filtros informados.
						</div>
					) : (
						<div className="overflow-hidden rounded-xl border border-[#e5e5e2] bg-white shadow-2xs">
							<div className="flex items-center justify-between border-b border-[#e5e5e2] bg-[#f8f8f6] px-4 py-3 text-xs font-medium text-[#52525e] sm:px-5">
								<span>
									Mostrando {eventsList.length} evento(s)
									{eventsList.length === 60 ? ' (limite de 60 — refine os filtros)' : ''}
								</span>
							</div>
							<div className="divide-y divide-[#f3f3f1]">
								{eventsList.map((ev) => (
									<button
										key={ev._id}
										type="button"
										onClick={() => openEvent(ev._id)}
										className="flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-[#f8f8f6] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-semibold text-[#18181a]">
												{ev.name}
											</p>
											<p className="mt-0.5 text-xs text-[#8c8c98]">
												{ev.campus}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-mono-code rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs text-[#52525e]">
												{ev.qty_certs} certs
											</span>
											<span className="font-mono-code rounded border border-[#e5e5e2] bg-white px-2 py-0.5 text-xs font-semibold text-[#18181a]">
												{ev.year}
											</span>
										</div>
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			<DownloadModal
				open={modal.open}
				items={modal.items}
				emptyMessage={modal.emptyMessage}
				onClose={() => setModal((m) => ({ ...m, open: false }))}
			/>
		</div>
	);
}
