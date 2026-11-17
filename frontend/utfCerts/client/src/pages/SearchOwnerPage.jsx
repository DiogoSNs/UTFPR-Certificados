import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	FiSearch,
	FiX,
	FiDownload,
	FiExternalLink,
	FiFileText,
	FiFilter,
} from 'react-icons/fi';
import {
	fetchOwnerById,
	normalizeText,
	requestBatchDownload,
	searchOwnersApi,
} from '../lib/api';
import { DownloadModal } from '../components/DownloadModal';

const MAX_BATCH_CERTS = 30;

export function SearchOwnerPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(searchParams.get('q') || '');
	const [suggestions, setSuggestions] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [searching, setSearching] = useState(false);

	const [owner, setOwner] = useState(null);
	const [loadingOwner, setLoadingOwner] = useState(false);

	// Filters
	const [selectedYear, setSelectedYear] = useState('all');
	const [selectedCampus, setSelectedCampus] = useState('all');
	const [eventFilter, setEventFilter] = useState('');
	const [sortBy, setSortBy] = useState('year-desc');

	// Selection
	const [selectedCodes, setSelectedCodes] = useState(new Set());
	const [modal, setModal] = useState({
		open: false,
		loading: false,
		title: '',
		message: '',
	});

	useEffect(() => {
		const id = searchParams.get('id');
		if (!id) return;
		setLoadingOwner(true);
		fetchOwnerById(id)
			.then((data) => {
				setOwner(data);
				setQuery(data.name);
				setSelectedYear('all');
				setSelectedCampus('all');
				setEventFilter('');
				setSelectedCodes(new Set());
				setShowDropdown(false);
			})
			.catch(() => {})
			.finally(() => setLoadingOwner(false));
	}, [searchParams]);

	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed.length < 2 || (owner && trimmed === owner.name)) {
			setSuggestions([]);
			setShowDropdown(false);
			return;
		}

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setSearching(true);
			try {
				const data = await searchOwnersApi(trimmed, controller.signal);
				setSuggestions(data.owners);
				setShowDropdown(true);
			} catch (err) {
				if (err.name !== 'AbortError') setSuggestions([]);
			} finally {
				setSearching(false);
			}
		}, 220);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query, owner]);

	function selectOwner(id) {
		setShowDropdown(false);
		setSearchParams({ id });
	}

	const filteredCerts = useMemo(() => {
		if (!owner) return [];
		const textNorm = normalizeText(eventFilter);
		const list = owner.certs.filter((c) => {
			if (selectedYear !== 'all' && c.year !== selectedYear) return false;
			if (selectedCampus !== 'all' && c.campus !== selectedCampus) return false;
			if (textNorm && !normalizeText(c.event_name).includes(textNorm)) return false;
			return true;
		});

		if (sortBy === 'year-asc') {
			return [...list].sort((a, b) => a.year.localeCompare(b.year));
		}
		if (sortBy === 'name-asc') {
			return [...list].sort((a, b) => a.event_name.localeCompare(b.event_name));
		}
		return [...list].sort((a, b) => b.year.localeCompare(a.year));
	}, [owner, selectedYear, selectedCampus, eventFilter, sortBy]);

	const visibleCodes = useMemo(
		() => filteredCerts.map((c) => c.code),
		[filteredCerts]
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

	async function handleBatchDownload(onlySelected) {
		const codes = onlySelected
			? visibleCodes.filter((c) => selectedCodes.has(c))
			: visibleCodes;

		if (codes.length === 0) {
			setModal({
				open: true,
				loading: false,
				title: 'Nenhum certificado selecionado',
				message:
					'Selecione pelo menos um certificado na lista ou clique em "Baixar todos".',
			});
			return;
		}

		if (codes.length > MAX_BATCH_CERTS) {
			setModal({
				open: true,
				loading: false,
				title: 'Limite por lote excedido',
				message: `Para manter o serviço gratuito e rápido para todos, o download em ZIP aceita até ${MAX_BATCH_CERTS} certificados por vez. Use os filtros de ano/câmpus ou baixe individualmente pelo botão PDF.`,
			});
			return;
		}

		setModal({
			open: true,
			loading: true,
			title: 'Preparando download',
			message: `Baixando e compactando ${codes.length} certificado(s) em ZIP...`,
		});

		try {
			const userId = await requestBatchDownload(codes);
			setModal((m) => ({ ...m, open: false }));
			window.location.href = `/download/${userId}`;
		} catch (err) {
			setModal({
				open: true,
				loading: false,
				title: 'Erro ao gerar ZIP',
				message: err.message,
			});
		}
	}

	function clearFilters() {
		setSelectedYear('all');
		setSelectedCampus('all');
		setEventFilter('');
		setSortBy('year-desc');
	}

	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
			<div className="mb-5 sm:mb-6">
				<h1 className="text-xl font-bold tracking-tight text-[#18181a] sm:text-2xl">
					Buscar por Pessoa
				</h1>
				<p className="mt-1 text-sm text-[#52525e]">
					Consulte todos os certificados vinculados a um participante e filtre por câmpus, ano ou evento.
				</p>
			</div>

			{/* Search Box */}
			<div className="relative mb-5 sm:mb-6">
				<div className="relative flex items-center">
					<FiSearch className="pointer-events-none absolute left-4 h-4 w-4 text-[#8c8c98]" />
					<input
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							if (owner && e.target.value !== owner.name) {
								setShowDropdown(true);
							}
						}}
						onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
						onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
						placeholder="Digite pelo menos 2 letras do nome..."
						className="h-12 w-full rounded-xl border border-[#d4d4cf] bg-white pr-11 pl-11 text-[15px] text-[#18181a] shadow-2xs placeholder:text-[#8c8c98] focus:border-[#18181a] focus:outline-none"
						autoFocus
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery('');
								setSuggestions([]);
								setShowDropdown(false);
							}}
							className="absolute right-3 rounded-md p-2 text-[#8c8c98] hover:bg-[#f3f3f1] hover:text-[#18181a]"
							aria-label="Limpar busca"
						>
							<FiX className="h-4 w-4" />
						</button>
					)}
				</div>

				{showDropdown && (
					<div className="absolute right-0 left-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#d4d4cf] bg-white p-1.5 shadow-lg">
						{searching ? (
							<div className="px-3 py-4 text-center text-xs text-[#8c8c98]">
								Buscando participantes...
							</div>
						) : suggestions.length === 0 ? (
							<div className="px-3 py-4 text-center text-xs text-[#8c8c98]">
								Nenhuma pessoa encontrada com esse nome.
							</div>
						) : (
							<ul className="divide-y divide-[#f3f3f1]">
								{suggestions.map((item) => (
									<li key={item._id}>
										<button
											type="button"
											onMouseDown={() => selectOwner(item._id)}
											className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-[#f3f3f1]"
										>
											<span className="truncate font-medium text-[#18181a]">
												{item.name}
											</span>
											<span className="font-mono-code shrink-0 rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs text-[#52525e]">
												{item.certCount} cert{item.certCount === 1 ? '' : 's'}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>

			{loadingOwner && (
				<div className="flex items-center justify-center gap-3 rounded-xl border border-[#e5e5e2] bg-white py-14 text-sm text-[#52525e]">
					<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4d4cf] border-t-[#18181a]" />
					<span>Carregando certificados do participante...</span>
				</div>
			)}

			{!loadingOwner && owner && (
				<div className="overflow-hidden rounded-xl border border-[#e5e5e2] bg-white shadow-2xs">
					{/* Summary Header */}
					<div className="flex flex-col gap-3 border-b border-[#e5e5e2] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<div>
							<h2 className="text-base font-semibold text-[#18181a] sm:text-lg">
								{owner.name}
							</h2>
							<p className="text-xs text-[#52525e]">
								Exibindo {filteredCerts.length} de {owner.certs.length} certificado(s)
							</p>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
							<button
								type="button"
								onClick={() => handleBatchDownload(true)}
								disabled={selectedCodes.size === 0}
								className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#d4d4cf] bg-white px-3 text-xs font-semibold text-[#18181a] transition-colors hover:bg-[#f3f3f1] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:px-3.5"
							>
								<FiDownload className="h-3.5 w-3.5" />
								<span>Selecionados ({selectedCodes.size})</span>
							</button>
							<button
								type="button"
								onClick={() => handleBatchDownload(false)}
								disabled={filteredCerts.length === 0}
								className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#18181a] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#2d2d32] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:px-3.5"
							>
								<FiDownload className="h-3.5 w-3.5" />
								<span>Baixar todos ({filteredCerts.length})</span>
							</button>
						</div>
					</div>

					{/* Filter Toolbar */}
					<div className="grid grid-cols-1 gap-2 border-b border-[#e5e5e2] bg-[#f8f8f6] px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 sm:px-5">
						<div className="hidden items-center gap-1.5 text-xs font-semibold text-[#52525e] sm:flex">
							<FiFilter className="h-3.5 w-3.5" />
							<span>Filtros:</span>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
							<select
								value={selectedCampus}
								onChange={(e) => setSelectedCampus(e.target.value)}
								className="h-10 rounded-lg border border-[#d4d4cf] bg-white px-2.5 text-xs font-medium text-[#18181a] focus:border-[#18181a] focus:outline-none sm:h-9"
								aria-label="Filtrar por câmpus"
							>
								<option value="all">Câmpus ({owner.campuses.length})</option>
								{owner.campuses.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>

							<select
								value={selectedYear}
								onChange={(e) => setSelectedYear(e.target.value)}
								className="h-10 rounded-lg border border-[#d4d4cf] bg-white px-2.5 text-xs font-medium text-[#18181a] focus:border-[#18181a] focus:outline-none sm:h-9"
								aria-label="Filtrar por ano"
							>
								<option value="all">Anos ({owner.years.length})</option>
								{owner.years.map((y) => (
									<option key={y} value={y}>
										{y}
									</option>
								))}
							</select>
						</div>

						<div className="flex gap-2 sm:flex-1">
							<input
								type="text"
								value={eventFilter}
								onChange={(e) => setEventFilter(e.target.value)}
								placeholder="Filtrar pelo nome do evento..."
								className="h-10 min-w-0 flex-1 rounded-lg border border-[#d4d4cf] bg-white px-3 text-xs text-[#18181a] placeholder:text-[#8c8c98] focus:border-[#18181a] focus:outline-none sm:h-9"
							/>

							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className="h-10 rounded-lg border border-[#d4d4cf] bg-white px-2.5 text-xs font-medium text-[#18181a] focus:border-[#18181a] focus:outline-none sm:h-9"
								aria-label="Ordenar"
							>
								<option value="year-desc">Mais recentes</option>
								<option value="year-asc">Mais antigos</option>
								<option value="name-asc">Evento (A–Z)</option>
							</select>
						</div>

						{(selectedYear !== 'all' ||
							selectedCampus !== 'all' ||
							eventFilter !== '') && (
							<button
								type="button"
								onClick={clearFilters}
								className="h-10 rounded-lg border border-[#e5e5e2] bg-white px-3 text-xs font-medium text-[#52525e] hover:bg-[#f3f3f1] hover:text-[#18181a] sm:h-9"
							>
								Limpar filtros
							</button>
						)}
					</div>

					{/* Mobile Cards (< md) */}
					<div className="md:hidden">
						{filteredCerts.length > 0 && (
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
							{filteredCerts.length === 0 ? (
								<div className="px-4 py-10 text-center text-sm text-[#8c8c98]">
									Nenhum certificado corresponde aos filtros aplicados.
								</div>
							) : (
								filteredCerts.map((cert) => (
									<div key={cert.code} className="space-y-3 p-4">
										<div className="flex items-start gap-3">
											<input
												type="checkbox"
												checked={selectedCodes.has(cert.code)}
												onChange={() => toggleCode(cert.code)}
												className="mt-1 h-4 w-4 shrink-0 rounded accent-[#18181a]"
												aria-label={`Selecionar ${cert.event_name}`}
											/>
											<div className="min-w-0 flex-1">
												<div className="mb-1.5 flex flex-wrap items-center gap-1.5">
													<span className="font-mono-code rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-[11px] font-medium text-[#18181a]">
														{cert.year}
													</span>
													<span className="rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-[11px] font-medium text-[#52525e]">
														{cert.campus}
													</span>
												</div>
												<p className="text-sm font-medium leading-snug text-[#18181a]">
													{cert.event_name}
												</p>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2 pl-7">
											<a
												href={`https://apl.utfpr.edu.br/extensao/emitir/${cert.code}`}
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
									<th className="w-20 px-3 py-3">Ano</th>
									<th className="w-44 px-3 py-3">Câmpus</th>
									<th className="px-4 py-3">Evento</th>
									<th className="w-36 px-4 py-3 text-right">Ações</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f3f3f1]">
								{filteredCerts.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-4 py-10 text-center text-sm text-[#8c8c98]"
										>
											Nenhum certificado corresponde aos filtros aplicados.
										</td>
									</tr>
								) : (
									filteredCerts.map((cert) => (
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
													aria-label={`Selecionar ${cert.event_name}`}
												/>
											</td>
											<td className="font-mono-code px-3 py-3 text-xs font-medium text-[#52525e]">
												{cert.year}
											</td>
											<td className="px-3 py-3">
												<span className="inline-block rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs font-medium text-[#52525e]">
													{cert.campus}
												</span>
											</td>
											<td className="px-4 py-3 font-medium text-[#18181a]">
												{cert.event_name}
											</td>
											<td className="px-4 py-3 text-right">
												<div className="inline-flex items-center gap-2">
													<a
														href={`https://apl.utfpr.edu.br/extensao/emitir/${cert.code}`}
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
														title="Validar no SGCE"
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
			)}

			<DownloadModal
				state={modal}
				onClose={() => setModal((m) => ({ ...m, open: false }))}
			/>
		</div>
	);
}
