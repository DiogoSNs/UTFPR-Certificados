import { useEffect, useState } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiFileText } from 'react-icons/fi';

export function DownloadModal({ open, items = [], emptyMessage, onClose }) {
	const [downloaded, setDownloaded] = useState(new Set());

	useEffect(() => {
		if (open) {
			setDownloaded(new Set());
		}
	}, [open, items]);

	useEffect(() => {
		if (!open) return;
		function onKeyDown(e) {
			if (e.key === 'Escape') onClose();
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	function markDownloaded(code) {
		setDownloaded((prev) => {
			const next = new Set(prev);
			next.add(code);
			return next;
		});
	}

	if (emptyMessage) {
		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
				onClick={onClose}
				role="dialog"
				aria-modal="true"
			>
				<div
					className="w-full max-w-md rounded-xl border border-[#e5e5e2] bg-white shadow-xl"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between border-b border-[#e5e5e2] px-5 py-4">
						<h3 className="text-[15px] font-semibold text-[#18181a]">
							Nenhum certificado selecionado
						</h3>
						<button
							type="button"
							onClick={onClose}
							className="rounded-md p-1 text-[#52525e] hover:bg-[#f3f3f1] hover:text-[#18181a]"
							aria-label="Fechar"
						>
							<FiX className="h-4 w-4" />
						</button>
					</div>
					<div className="flex items-start gap-3 px-5 py-5 text-sm text-[#52525e]">
						<FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ca8a04]" />
						<p className="leading-relaxed">{emptyMessage}</p>
					</div>
					<div className="flex justify-end rounded-b-xl border-t border-[#e5e5e2] bg-[#f8f8f6] px-5 py-3">
						<button
							type="button"
							onClick={onClose}
							className="h-9 rounded-lg bg-[#18181a] px-4 text-xs font-semibold text-white hover:bg-[#2d2d32]"
						>
							Entendi
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e5e5e2] bg-white shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-[#e5e5e2] px-5 py-4">
					<div className="flex items-center gap-2.5">
						<h3 className="text-[15px] font-semibold text-[#18181a]">
							Download de Certificados
						</h3>
						<span className="font-mono-code rounded border border-[#e5e5e2] bg-[#f8f8f6] px-2 py-0.5 text-xs font-medium text-[#52525e]">
							{downloaded.size}/{items.length}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1.5 text-[#52525e] transition-colors hover:bg-[#f3f3f1] hover:text-[#18181a]"
						aria-label="Fechar"
					>
						<FiX className="h-4 w-4" />
					</button>
				</div>

				{/* List */}
				<div className="flex-1 divide-y divide-[#f3f3f1] overflow-y-auto">
					{items.map((item, idx) => {
						const isDone = downloaded.has(item.code);
						return (
							<div
								key={item.code}
								className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[#f8f8f6]"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-mono-code text-[11px] text-[#8c8c98]">
											{String(idx + 1).padStart(2, '0')}
										</span>
										<p
											className={`truncate text-sm font-medium ${
												isDone ? 'text-[#8c8c98]' : 'text-[#18181a]'
											}`}
										>
											{item.title}
										</p>
									</div>
									{item.subtitle && (
										<p className="font-mono-code mt-0.5 pl-6 text-[11.5px] text-[#8c8c98]">
											{item.subtitle}
										</p>
									)}
								</div>

								<a
									href={`https://apl.utfpr.edu.br/extensao/emitir/${encodeURIComponent(item.code)}`}
									target="_blank"
									rel="noopener noreferrer"
									onClick={() => markDownloaded(item.code)}
									className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
										isDone
											? 'border-[#e5e5e2] bg-[#f3f3f1] text-[#52525e] hover:bg-[#e5e5e2]'
											: 'border-[#18181a] bg-[#18181a] text-white hover:bg-[#2d2d32]'
									}`}
								>
									{isDone ? (
										<>
											<FiCheck className="h-3.5 w-3.5" />
											<span>Baixado</span>
										</>
									) : (
										<>
											<FiFileText className="h-3.5 w-3.5" />
											<span>Baixar PDF</span>
										</>
									)}
								</a>
							</div>
						);
					})}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-[#e5e5e2] bg-[#f8f8f6] px-5 py-3">
					<span className="text-xs text-[#8c8c98]">
						Emissão direta do portal SGCE da UTFPR
					</span>
					<button
						type="button"
						onClick={onClose}
						className="h-9 rounded-lg border border-[#d4d4cf] bg-white px-4 text-xs font-semibold text-[#18181a] hover:bg-[#f3f3f1]"
					>
						Fechar
					</button>
				</div>
			</div>
		</div>
	);
}
