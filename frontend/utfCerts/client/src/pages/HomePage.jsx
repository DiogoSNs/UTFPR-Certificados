import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
	FiSearch,
	FiUser,
	FiCalendar,
	FiArrowRight,
	FiMapPin,
} from 'react-icons/fi';
import { fetchOverview, searchOwnersApi, searchEventsApi } from '../lib/api';

const MAIN_CAMPUSES = [
	'Curitiba',
	'Cornélio Procópio',
	'Pato Branco',
	'Apucarana',
	'Londrina',
	'Toledo',
	'Campo Mourão',
	'Medianeira',
	'Ponta Grossa',
	'Dois Vizinhos',
	'Francisco Beltrão',
	'Guarapuava',
	'Santa Helena',
];

export function HomePage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState('owner');
	const [query, setQuery] = useState('');
	const [suggestions, setSuggestions] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [overview, setOverview] = useState(null);

	useEffect(() => {
		fetchOverview()
			.then(setOverview)
			.catch(() => {});
	}, []);

	useEffect(() => {
		const q = query.trim();
		if (q.length < 3) {
			setSuggestions([]);
			setShowDropdown(false);
			return;
		}

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				if (mode === 'owner') {
					const data = await searchOwnersApi(q, controller.signal);
					setSuggestions(data.owners.slice(0, 6));
				} else {
					const data = await searchEventsApi({ q }, controller.signal);
					setSuggestions(data.events.slice(0, 6));
				}
				setShowDropdown(true);
			} catch (err) {
				if (err.name !== 'AbortError') setSuggestions([]);
			}
		}, 220);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query, mode]);

	function handleSubmit(e) {
		e.preventDefault();
		const q = query.trim();
		if (mode === 'owner') {
			navigate(q ? `/searchOwner?q=${encodeURIComponent(q)}` : '/searchOwner');
		} else {
			navigate(q ? `/searchEvent?q=${encodeURIComponent(q)}` : '/searchEvent');
		}
	}

	const campusCounts = new Map(
		(overview?.campuses || []).map((c) => [c.name, c.count])
	);

	return (
		<div className="bg-architectural-grid flex-1 border-b border-[#e5e5e2]">
			<div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-14">
				{/* Left Column */}
				<div className="lg:col-span-7 lg:pt-4">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e5e5e2] bg-white px-3 py-1 text-xs font-medium text-[#52525e] shadow-2xs">
						<span className="h-2 w-2 rounded-full bg-[#F2B705]" />
						<span>UTFPR · Consulta Pública SGCE</span>
					</div>

					<h1 className="mb-4 text-3xl font-bold tracking-tight text-[#18181a] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
						Encontre seus certificados acadêmicos em segundos.
					</h1>

					<p className="mb-8 max-w-xl text-[15.5px] leading-relaxed text-[#52525e]">
						Pesquise diretamente pelo seu nome ou filtre eventos por câmpus e ano em toda a base pública da UTFPR, com validação oficial e download em lote.
					</p>

					{/* Quick Search Box */}
					<div className="relative mb-8 rounded-xl border border-[#e5e5e2] bg-white p-3 shadow-sm">
						<div className="mb-2.5 flex items-center gap-1.5 border-b border-[#f3f3f1] pb-2.5">
							<button
								type="button"
								onClick={() => {
									setMode('owner');
									setSuggestions([]);
								}}
								className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
									mode === 'owner'
										? 'bg-[#18181a] text-white'
										: 'text-[#52525e] hover:bg-[#f3f3f1]'
								}`}
							>
								<FiUser className="h-3.5 w-3.5" />
								Buscar por Pessoa
							</button>
							<button
								type="button"
								onClick={() => {
									setMode('event');
									setSuggestions([]);
								}}
								className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
									mode === 'event'
										? 'bg-[#18181a] text-white'
										: 'text-[#52525e] hover:bg-[#f3f3f1]'
								}`}
							>
								<FiCalendar className="h-3.5 w-3.5" />
								Buscar por Evento
							</button>
						</div>

						<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
							<div className="relative flex-1">
								<FiSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8c8c98]" />
								<input
									type="text"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
									onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
									placeholder={
										mode === 'owner'
											? 'Digite seu nome completo ou parte dele...'
											: 'Digite o nome do evento, oficina ou semana...'
									}
									className="h-11 w-full rounded-lg border border-[#e5e5e2] bg-[#f8f8f6] pr-3 pl-10 text-sm text-[#18181a] placeholder:text-[#8c8c98] focus:border-[#18181a] focus:bg-white focus:outline-none"
								/>
							</div>
							<button
								type="submit"
								className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#18181a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2d2d32]"
							>
								<span>Pesquisar</span>
								<FiArrowRight className="h-4 w-4" />
							</button>
						</form>

						{showDropdown && suggestions.length > 0 && (
							<div className="absolute right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-[#d4d4cf] bg-white shadow-lg">
								<ul className="divide-y divide-[#f3f3f1] p-1.5">
									{suggestions.map((item) => (
										<li key={item._id}>
											<button
												type="button"
												onMouseDown={() =>
													navigate(
														mode === 'owner'
															? `/searchOwner?id=${item._id}`
															: `/searchEvent?id=${item._id}`
													)
												}
												className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#f3f3f1]"
											>
												<span className="truncate font-medium text-[#18181a]">
													{item.name}
												</span>
												<span className="font-mono-code shrink-0 rounded bg-[#f3f3f1] px-2 py-0.5 text-xs text-[#52525e]">
													{mode === 'owner'
														? `${item.certCount} cert${item.certCount === 1 ? '' : 's'}`
														: `${item.year} · ${item.campus}`}
												</span>
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>

					{/* Institutional stats */}
					<div className="grid grid-cols-3 gap-2.5 border-t border-[#e5e5e2] pt-6 sm:gap-4">
						<div>
							<div className="font-mono-code text-lg font-semibold text-[#18181a] sm:text-2xl">
								{overview ? overview.totalEvents.toLocaleString('pt-BR') : '13.901'}
							</div>
							<div className="text-[11px] text-[#52525e] sm:text-xs">Eventos indexados</div>
						</div>
						<div>
							<div className="font-mono-code text-lg font-semibold text-[#18181a] sm:text-2xl">
								{overview ? overview.totalOwners.toLocaleString('pt-BR') : '180.580'}
							</div>
							<div className="text-[11px] text-[#52525e] sm:text-xs">Participantes</div>
						</div>
						<div>
							<div className="font-mono-code text-lg font-semibold text-[#18181a] sm:text-2xl">
								2013–{new Date().getFullYear()}
							</div>
							<div className="text-[11px] text-[#52525e] sm:text-xs">Atualização diária</div>
						</div>
					</div>
				</div>

				{/* Right Column: Campus Explorer & Recent Events */}
				<div className="space-y-4 lg:col-span-5">
					<div className="rounded-xl border border-[#e5e5e2] bg-white p-5 shadow-sm">
						<div className="mb-3 flex items-center justify-between">
							<div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#52525e] uppercase">
								<FiMapPin className="h-3.5 w-3.5 text-[#ca8a04]" />
								<span>Explorar por Câmpus</span>
							</div>
							<Link
								to="/searchEvent"
								className="text-xs font-medium text-[#52525e] hover:text-[#18181a]"
							>
								Ver em todos →
							</Link>
						</div>

						<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
							{MAIN_CAMPUSES.map((campus) => {
								const count = campusCounts.get(campus);
								return (
									<button
										key={campus}
										type="button"
										onClick={() =>
											navigate(`/searchEvent?campus=${encodeURIComponent(campus)}`)
										}
										className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e5e2] bg-[#f8f8f6] px-2.5 py-2 text-left text-xs font-medium text-[#18181a] transition-colors hover:border-[#18181a] hover:bg-white"
									>
										<span className="truncate">{campus}</span>
										{count !== undefined && (
											<span className="font-mono-code shrink-0 text-[11px] text-[#8c8c98]">
												{count}
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>

					<div className="rounded-xl border border-[#e5e5e2] bg-white p-5 shadow-sm">
						<div className="mb-3 flex items-center justify-between">
							<div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#52525e] uppercase">
								<FiCalendar className="h-3.5 w-3.5 text-[#ca8a04]" />
								<span>Eventos Recentes</span>
							</div>
							<span className="font-mono-code text-[11px] text-[#8c8c98]">
								SGCE Oficial
							</span>
						</div>

						<div className="divide-y divide-[#f3f3f1]">
							{(overview?.recentEvents || []).slice(0, 4).map((ev) => (
								<button
									key={ev._id}
									type="button"
									onClick={() => navigate(`/searchEvent?id=${ev._id}`)}
									className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[#f8f8f6]"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-[13px] font-medium text-[#18181a]">
											{ev.name}
										</p>
										<p className="text-[11.5px] text-[#8c8c98]">
											{ev.campus}
										</p>
									</div>
									<span className="font-mono-code shrink-0 rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-[11px] text-[#52525e]">
										{ev.year}
									</span>
								</button>
							))}
							{!overview && (
								<div className="py-6 text-center text-xs text-[#8c8c98]">
									Carregando eventos recentes...
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
