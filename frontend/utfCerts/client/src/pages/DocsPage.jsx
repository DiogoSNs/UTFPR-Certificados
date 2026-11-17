import { FiExternalLink } from 'react-icons/fi';

const DOCS = [
	{
		code: 'COGEP · GERAL',
		title: 'Regulamento Geral das Atividades Complementares',
		href: 'http://www.utfpr.edu.br/documentos/conselhos/cogep/resolucoes/regulamento-das-atividades-complementares',
	},
	{
		code: 'ECP · UTFPR-CP',
		title: 'Engenharia de Computação',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-engenharia-de-computacao/area-academica/atividades-complementares',
	},
	{
		code: 'ESW · UTFPR-CP',
		title: 'Engenharia de Software',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-bacharelado-em-engenharia-de-software/area-academica/atividades-complementares',
	},
	{
		code: 'ADS · UTFPR-CP',
		title: 'Análise e Desenvolvimento de Sistemas',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-tecnologia-em-analise-e-desenvolvimento-de-sistemas/area-academica/atividades-complementares',
	},
	{
		code: 'ELE · UTFPR-CP',
		title: 'Engenharia Elétrica',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-engenharia-eletrica/area-academica/atividades-complementares',
	},
	{
		code: 'ELT · UTFPR-CP',
		title: 'Engenharia Eletrônica',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-engenharia-eletronica/area-academica/atividades-complementares',
	},
	{
		code: 'ECA · UTFPR-CP',
		title: 'Engenharia de Controle e Automação',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-engenharia-de-controle-e-automacao/area-academica/atividades-complementares',
	},
	{
		code: 'EMC · UTFPR-CP',
		title: 'Engenharia Mecânica',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-engenharia-mecanica/area-academica/atividades-complementares',
	},
	{
		code: 'LMT · UTFPR-CP',
		title: 'Licenciatura em Matemática',
		href: 'http://www.utfpr.edu.br/cursos/coordenacoes/graduacao/cornelio-procopio/cp-licenciatura-em-matematica/area-academica/atividades-complementares',
	},
];

export function DocsPage() {
	return (
		<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight text-[#18181a]">
					Regulamentos
				</h1>
				<p className="mt-1 text-sm text-[#52525e]">
					Acesso direto às normas oficiais de atividades complementares no portal da UTFPR.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{DOCS.map((doc) => (
					<a
						key={doc.code}
						href={doc.href}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex flex-col justify-between rounded-xl border border-[#e5e5e2] bg-white p-5 shadow-2xs transition-colors hover:border-[#18181a]"
					>
						<div>
							<span className="font-mono-code text-[11px] font-medium text-[#ca8a04]">
								{doc.code}
							</span>
							<h2 className="mt-1.5 text-[15px] font-semibold text-[#18181a]">
								{doc.title}
							</h2>
						</div>
						<span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#52525e] group-hover:text-[#18181a]">
							<span>Acessar documento oficial</span>
							<FiExternalLink className="h-3.5 w-3.5" />
						</span>
					</a>
				))}
			</div>
		</div>
	);
}
