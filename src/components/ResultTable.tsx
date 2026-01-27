import { useState, memo } from "react";
import { WikidataItem, generateSeparatedQuickStatements } from "@/lib/wikidata";

interface ResultTableProps {
    items: WikidataItem[];
    isProcessing: boolean;
    disabled?: boolean;
    showDownloads?: boolean;
    useQidOnly?: boolean;
    strictMode?: boolean;
}

const ResultRow = memo(({ item, useQidOnly, strictMode }: { item: WikidataItem, useQidOnly: boolean, strictMode: boolean }) => {
    const showExtraInfo = useQidOnly || strictMode;
    return (
        <tr className="hover:bg-white/5 transition-colors group">
            <td className="px-6 py-3 font-mono text-xs text-indigo-300 group-hover:text-indigo-200">{item.qid}</td>
            <td className="px-6 py-3 text-slate-300 group-hover:text-white font-medium">{item.label}</td>

            {showExtraInfo && (
                <>
                    <td className="px-6 py-3 text-emerald-300 font-medium">{item.kgName || "-"}</td>
                    <td className="px-6 py-3 text-xs text-slate-400 max-w-xs">{item.kgSchemaType?.join(", ") || "-"}</td>
                </>
            )}

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
    );
}, (prev, next) => {
    // Custom comparison to prevent re-renders unless data actually changes
    return (
        prev.useQidOnly === next.useQidOnly &&
        prev.strictMode === next.strictMode &&
        prev.item.qid === next.item.qid &&
        prev.item.label === next.item.label &&
        prev.item.kgId === next.item.kgId &&
        prev.item.error === next.item.error &&
        prev.item.kgType === next.item.kgType &&
        prev.item.kgName === next.item.kgName &&
        prev.item.kgDescription === next.item.kgDescription
    );
});
ResultRow.displayName = 'ResultRow';

export function ResultTable({ items, isProcessing, disabled = false, showDownloads = true, useQidOnly = false, strictMode = false }: ResultTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);

    const showExtraInfo = useQidOnly || strictMode;

    if (items.length === 0) return null;

    const totalPages = Math.ceil(items.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const currentItems = items.slice(startIndex, endIndex);

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
        document.body.removeChild(element);
    };

    const p646Count = items.filter(i => i.kgId && i.kgType === 'P646').length;
    const p2671Count = items.filter(i => i.kgId && i.kgType === 'P2671').length;

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="bg-slate-950/40 rounded-xl border border-white/10 overflow-hidden shadow-xl shadow-black/20 backdrop-blur-md w-full max-w-6xl flex flex-col">
            {showDownloads && (
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
                                    disabled={disabled}
                                    className={`text-xs bg-black/40 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-mono uppercase tracking-wide group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                    disabled={disabled}
                                    className={`text-xs bg-black/40 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:border-purple-400 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-mono uppercase tracking-wide group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="group-hover:text-white transition-colors">Download P2671</span>
                                    <span className="bg-purple-500/20 px-1.5 rounded text-[10px] text-purple-200">{p2671Count}</span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Pagination Controls - Top */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-white/5 border-b border-white/5 text-xs text-slate-400">
                <div className="font-mono">
                    <span className="text-slate-500">Showing</span> <span className="text-indigo-300 font-bold">{startIndex + 1}</span> <span className="text-slate-500">to</span> <span className="text-indigo-300 font-bold">{Math.min(endIndex, items.length)}</span> <span className="text-slate-500">of</span> <span className="text-white font-bold">{items.length}</span> <span className="text-slate-500">rows</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 outline-none focus:border-indigo-500/50 text-slate-300"
                    >
                        {[10, 25, 50, 100, 200, 500, 1000].map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto custom-scrollbar bg-black/20">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/40 text-slate-400 text-xs uppercase sticky top-0 backdrop-blur-md z-10 font-medium shadow-sm">
                        <tr>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">QID</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">Label</th>
                            {showExtraInfo && <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider text-emerald-400">KG Name</th>}
                            {showExtraInfo && <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider text-emerald-400">Type</th>}
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">Found ID</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">{showExtraInfo ? "Property Type" : "Type"}</th>
                            <th className="px-6 py-3 border-b border-white/5 font-semibold text-xs tracking-wider">KG Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {currentItems.map((item, idx) => (
                            <ResultRow key={item.qid || idx} item={item} useQidOnly={useQidOnly} strictMode={strictMode} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls - Bottom */}
            <div className="flex items-center justify-center gap-2 p-4 bg-white/5 border-t border-white/5">
                <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black/40 border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300"
                >
                    &lt;&lt; FIRST
                </button>
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black/40 border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300"
                >
                    &lt; PREV
                </button>

                <div className="bg-black/40 px-4 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-400 mx-2">
                    Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
                </div>

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black/40 border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300"
                >
                    NEXT &gt;
                </button>
                <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black/40 border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300"
                >
                    LAST &gt;&gt;
                </button>
            </div>
        </div>
    );
}
