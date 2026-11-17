import { FiGithub, FiExternalLink } from 'react-icons/fi';

export function AboutPage() {
	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight text-[#18181a]">
					Sobre o Projeto
				</h1>
				<p className="mt-1 text-sm text-[#52525e]">
					Histórico, propósito e responsáveis pela evolução e manutenção da plataforma.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="rounded-xl border border-[#e5e5e2] bg-white p-6 shadow-2xs lg:col-span-3">
					<h2 className="text-base font-semibold text-[#18181a]">
						Por que esta ferramenta existe
					</h2>
					<p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#52525e]">
						O portal público oficial de certificados da UTFPR (SGCE) exige seleção manual de câmpus, ano e evento sem oferecer busca por nome de participante. Esta plataforma indexa os registros públicos de forma estruturada para permitir consulta instantânea por pessoa, evento, câmpus e ano, mantendo a emissão e validação oficial diretamente pelos links da universidade.
					</p>
				</div>

				<div className="rounded-xl border border-[#e5e5e2] bg-white p-6 shadow-2xs lg:col-span-2">
					<span className="font-mono-code text-[11px] font-medium text-[#ca8a04] uppercase">
						Atualização, Escala & Novo Frontend
					</span>
					<h2 className="mt-1 text-lg font-semibold text-[#18181a]">
						Diogo (DiogoSNs)
					</h2>
					<p className="mt-2 text-sm leading-relaxed text-[#52525e]">
						Responsável pela reestruturação da coleta automática para abranger todos os câmpus e anos (2013 em diante), otimização de índices e segurança no backend, controle de requisições ao servidor da universidade e criação da nova interface em React + Tailwind CSS.
					</p>
					<div className="mt-5">
						<a
							href="https://github.com/DiogoSNs"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 rounded-lg bg-[#18181a] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2d2d32]"
						>
							<FiGithub className="h-4 w-4" />
							<span>github.com/DiogoSNs</span>
						</a>
					</div>
				</div>

				<div className="rounded-xl border border-[#e5e5e2] bg-white p-6 shadow-2xs">
					<span className="font-mono-code text-[11px] font-medium text-[#8c8c98] uppercase">
						Projeto Original (TCC)
					</span>
					<h2 className="mt-1 text-lg font-semibold text-[#18181a]">
						Lucas do Prado Pinto
					</h2>
					<p className="mt-2 text-sm leading-relaxed text-[#52525e]">
						Idealizador e autor original do sistema desenvolvido como TCC em Engenharia de Computação na UTFPR-CP.
					</p>
					<div className="mt-5 flex flex-wrap gap-2">
						<a
							href="https://github.com/pradoplucas/utfCerts"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e2] bg-[#f8f8f6] px-3 py-1.5 text-xs font-medium text-[#18181a] hover:bg-[#f3f3f1]"
						>
							<FiExternalLink className="h-3.5 w-3.5" />
							<span>utfCerts</span>
						</a>
						<a
							href="https://github.com/pradoplucas/sgceScripts"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e2] bg-[#f8f8f6] px-3 py-1.5 text-xs font-medium text-[#18181a] hover:bg-[#f3f3f1]"
						>
							<FiExternalLink className="h-3.5 w-3.5" />
							<span>sgceScripts</span>
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
