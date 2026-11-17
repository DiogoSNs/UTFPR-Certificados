import { FiX, FiAlertCircle } from 'react-icons/fi';

export function DownloadModal({ state, onClose }) {
	if (!state.open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full max-w-md rounded-xl border border-[#e5e5e2] bg-white shadow-xl">
				<div className="flex items-center justify-between border-b border-[#e5e5e2] px-5 py-4">
					<h3 className="text-[15px] font-semibold text-[#18181a]">
						{state.title}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 text-[#52525e] transition-colors hover:bg-[#f3f3f1] hover:text-[#18181a]"
						aria-label="Fechar"
					>
						<FiX className="h-4 w-4" />
					</button>
				</div>

				<div className="px-5 py-6 text-sm text-[#52525e]">
					{state.loading ? (
						<div className="flex items-center gap-3">
							<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4d4cf] border-t-[#18181a]" />
							<span>{state.message}</span>
						</div>
					) : (
						<div className="flex items-start gap-3">
							<FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
							<p className="leading-relaxed">{state.message}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
