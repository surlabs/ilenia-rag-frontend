import { Sparkles } from "lucide-react";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4">
			<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 mb-6 dark:border-slate-700 dark:bg-slate-800">
				<Sparkles className="h-8 w-8 text-sky-500" />
			</div>
			<h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
				¿En qué puedo ayudarte hoy?
			</h1>
			<p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
				Proyecto ILENIA: Inteligencia Artificial Multilingüe
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
				<button className="text-left p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 transition-all group bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-500 dark:hover:bg-zinc-800/50">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded dark:text-sky-400 dark:bg-sky-900/30">
							Legal · Euskera
						</span>
					</div>
					<span className="text-xs font-semibold text-slate-800 mb-1 block group-hover:text-sky-600 dark:text-slate-200 dark:group-hover:text-sky-400">
						Lan-eskubideak
					</span>
					<span className="text-[11px] text-slate-500 block dark:text-slate-400">
						Lan-kontratuen inguruko galderak.
					</span>
				</button>
				<button className="text-left p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 transition-all group bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-500 dark:hover:bg-zinc-800/50">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:text-emerald-400 dark:bg-emerald-900/30">
							Salud · Gallego
						</span>
					</div>
					<span className="text-xs font-semibold text-slate-800 mb-1 block group-hover:text-sky-600 dark:text-slate-200 dark:group-hover:text-sky-400">
						Gripe estacional
					</span>
					<span className="text-[11px] text-slate-500 block dark:text-slate-400">
						Síntomas e prevención.
					</span>
				</button>
				<button className="text-left p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 transition-all group bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-500 dark:hover:bg-zinc-800/50">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded dark:text-sky-400 dark:bg-sky-900/30">
							Legal · Valencià
						</span>
					</div>
					<span className="text-xs font-semibold text-slate-800 mb-1 block group-hover:text-sky-600 dark:text-slate-200 dark:group-hover:text-sky-400">
						Contractació laboral
					</span>
					<span className="text-[11px] text-slate-500 block dark:text-slate-400">
						Requisits per a empreses.
					</span>
				</button>
				<button className="text-left p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 transition-all group bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-500 dark:hover:bg-zinc-800/50">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:text-emerald-400 dark:bg-emerald-900/30">
							Salud · Gallego
						</span>
					</div>
					<span className="text-xs font-semibold text-slate-800 mb-1 block group-hover:text-sky-600 dark:text-slate-200 dark:group-hover:text-sky-400">
						Tarxeta sanitaria
					</span>
					<span className="text-[11px] text-slate-500 block dark:text-slate-400">
						Trámites no SERGAS.
					</span>
				</button>
			</div>
		</div>
	);
}
