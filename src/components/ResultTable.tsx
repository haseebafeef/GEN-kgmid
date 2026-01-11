import { WikidataItem, generateSeparatedQuickStatements } from "@/lib/wikidata";

interface ResultTableProps {
    items: WikidataItem[];
    isProcessing: boolean;
}

export function ResultTable({ items, isProcessing }: ResultTableProps) {
    if (items.length === 0) return null;

    const download = (type: 'P646' | 'P2671') => {
        const { p646, p2671 } = generateSeparatedQuickStatements(items);
        const content = type === 'P646' ? p646 : p2671;
        const filename = type === 'P646' ? "qid_P646.csv" : "qid_P2671.csv";

        const element = document.createElement("a");
        const file = new Blob([content], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
    };

    const p646Count = items.filter(i => i.kgId && i.kgType === 'P646').length;
    const p2671Count = items.filter(i => i.kgId && i.kgType === 'P2671').length;

    return (
        <div className="bg-slate-950/40 rounded-xl border border-white/10 overflow-hidden shadow-xl shadow-black/20 backdrop-blur-md w-full max-w-6xl">
            <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                    Results Preview
                </h3>
                <div className="flex gap-2">
                    {/* P646 Status/Download */}
                    {p646Count > 0 && (
                        isProcessing ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-xs font-mono uppercase tracking-wider">
                                <span className="animate-pulse text-blue-400">●</span>
                                <span>P646: {p646Count}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => download('P646')}
                                className="text-xs bg-black/40 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-mono uppercase tracking-wide group"
                            >
                                <span className="group-hover:text-white transition-colors">Download P646</span>
                                <span className="bg-blue-500/20 px-1.5 rounded text-[10px] text-blue-200">{p646Count}</span>
                            </button>
                        )
                    )}

                    {/* P2671 Status/Download */}
                    {p2671Count > 0 && (
                        isProcessing ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 text-xs font-mono uppercase tracking-wider">
                                <span className="animate-pulse text-purple-400">●</span>
                                <span>P2671: {p2671Count}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => download('P2671')}
                                className="text-xs bg-black/40 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:border-purple-400 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-mono uppercase tracking-wide group"
                            >
                                <span className="group-hover:text-white transition-colors">Download P2671</span>
                                <span className="bg-purple-500/20 px-1.5 rounded text-[10px] text-purple-200">{p2671Count}</span>
                            </button>
                        )
                    )}
                </div>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar bg-black/20">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/40 text-slate-400 text-xs uppercase sticky top-0 backdrop-blur-md z-10 font-medium">
                        <tr>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">QID</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">Label</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">Found ID</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">Type</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">KG Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-3 font-mono text-xs text-indigo-300 group-hover:text-indigo-200">{item.qid}</td>
                                <td className="px-6 py-3 text-slate-300 group-hover:text-white font-medium">{item.label}</td>
                                <td className="px-6 py-3">
                                    {item.kgId ? (
                                        <span className="text-green-400 font-mono text-xs tracking-wide bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{item.kgId}</span>
                                    ) : item.error ? (
                                        <span className="text-red-400 text-xs italic opacity-80">{item.error}</span>
                                    ) : (
                                        <span className="text-slate-600">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3">
                                    {item.kgType ? (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.kgType === 'P2671' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'}`}>
                                            {item.kgType}
                                        </span>
                                    ) : ""}
                                </td>
                                <td className="px-6 py-3 text-slate-400 text-xs max-w-xs truncate font-mono opacity-80" title={item.kgDescription}>
                                    {item.kgDescription || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
