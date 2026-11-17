import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
	FiUser,
	FiCalendar,
	FiBookOpen,
	FiInfo,
	FiMenu,
	FiX,
	FiGithub,
} from 'react-icons/fi';
import { UtfprLogo } from './UtfprLogo';

const navItems = [
	{ to: '/searchOwner', label: 'Por Pessoa', icon: FiUser },
	{ to: '/searchEvent', label: 'Por Evento', icon: FiCalendar },
	{ to: '/docs', label: 'Regulamentos', icon: FiBookOpen },
	{ to: '/about', label: 'Sobre', icon: FiInfo },
];

export function Layout({ children }) {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex min-h-screen flex-col bg-[#f8f8f6] text-[#18181a]">
			<header className="sticky top-0 z-40 border-b border-[#e5e5e2] bg-[#ffffff]/90 backdrop-blur-md">
				<div className="mx-auto flex h-15 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
					<Link to="/" className="flex items-center gap-3">
						<UtfprLogo className="block h-5.5 w-auto -translate-y-[1.5px]" />
						<span className="hidden h-4 w-px bg-[#d4d4cf] sm:inline-block" />
						<span className="text-[15px] leading-none font-semibold tracking-tight text-[#18181a]">
							Certificados
						</span>
						<span className="font-mono-code hidden rounded border border-[#e5e5e2] bg-[#f3f3f1] px-1.5 py-0.5 text-[11px] font-medium text-[#52525e] sm:inline-block">
							SGCE
						</span>
					</Link>

					<nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
						{navItems.map(({ to, label, icon: Icon }) => (
							<NavLink
								key={to}
								to={to}
								className={({ isActive }) =>
									`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors ${isActive
										? 'bg-[#18181a] text-white'
										: 'text-[#52525e] hover:bg-[#f3f3f1] hover:text-[#18181a]'
									}`
								}
							>
								<Icon className="h-4 w-4" />
								{label}
							</NavLink>
						))}
					</nav>

					<button
						type="button"
						onClick={() => setMobileOpen((v) => !v)}
						className="inline-flex items-center justify-center rounded-lg border border-[#e5e5e2] p-2 text-[#52525e] hover:bg-[#f3f3f1] md:hidden"
						aria-label="Abrir menu"
					>
						{mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
					</button>
				</div>

				{mobileOpen && (
					<div className="border-t border-[#e5e5e2] bg-white px-4 py-3 md:hidden">
						<nav className="flex flex-col gap-1">
							{navItems.map(({ to, label, icon: Icon }) => (
								<NavLink
									key={to}
									to={to}
									onClick={() => setMobileOpen(false)}
									className={({ isActive }) =>
										`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${isActive
											? 'bg-[#18181a] text-white'
											: 'text-[#52525e] hover:bg-[#f3f3f1]'
										}`
									}
								>
									<Icon className="h-4 w-4" />
									{label}
								</NavLink>
							))}
						</nav>
					</div>
				)}
			</header>

			<main className="flex flex-1 flex-col">{children}</main>

			<footer className="border-t border-[#e5e5e2] bg-white">
				<div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-[13px] text-[#8c8c98] sm:px-6 lg:px-10">
					<p>
						Baseado no TCC de{' '}
						<a
							href="https://github.com/pradoplucas/utfCerts"
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-[#52525e] transition-colors hover:text-[#18181a]"
						>
							Lucas do Prado Pinto
						</a>
					</p>
					<a
						href="https://github.com/DiogoSNs"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 font-medium text-[#52525e] transition-colors hover:text-[#18181a]"
					>
						<FiGithub className="h-3.5 w-3.5" />
						<span>Atualizado e mantido por</span>
						<span className="font-mono-code text-[#18181a]">DiogoSNs</span>
					</a>
				</div>
			</footer>
		</div>
	);
}
