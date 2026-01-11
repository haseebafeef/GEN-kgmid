import { WikidataItem } from "@/lib/wikidata";

interface ResultTableProps {
    items: WikidataItem[];
    resultContentP646: string;
    resultContentP2671: string;
}

export function ResultTable({ items, resultContentP646, resultContentP2671 }: ResultTableProps) {
    if (items.length === 0) return null;

    const download = (content: string, filename: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
    };

    return (
        <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/5">
                <h3 className="text-lg font-medium text-gray-200">Results Preview</h3>
                <div className="flex gap-2">
                    {resultContentP646 && (
                        <button
                            onClick={() => download(resultContentP646, "qid_P646.csv")}
                            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                        >
                            Download P646 (Freebase)
                        </button>
                    )}
                    {resultContentP2671 && (
                        <button
                            onClick={() => download(resultContentP2671, "qid_P2671.csv")}
                            className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded transition-colors"
                        >
                            Download P2671 (Google KG)
                        </button>
                    )}
                </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase sticky top-0 backdrop-blur-md">
                        <tr>
                            <th className="px-4 py-3">QID</th>
                            <th className="px-4 py-3">Label</th>
                            <th className="px-4 py-3">Found ID</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">KG Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors text-sm">
                                <td className="px-4 py-2 font-mono text-blue-300">{item.qid}</td>
                                <td className="px-4 py-2 text-gray-300">{item.label}</td>
                                <td className="px-4 py-2">
                                    {item.kgId ? (
                                        <span className="text-green-400 font-mono">{item.kgId}</span>
                                    ) : item.error ? (
                                        <span className="text-red-400 text-xs">{item.error}</span>
                                    ) : (
                                        <span className="text-gray-600">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    {item.kgType ? (
                                        <span className={`px-2 py-0.5 rounded text-xs ${item.kgType === 'P2671' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                                            {item.kgType}
                                        </span>
                                    ) : ""}
                                </td>
                                <td className="px-4 py-2 text-gray-400 text-xs max-w-xs truncate" title={item.kgDescription}>
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
