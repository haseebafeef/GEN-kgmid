/**
 * GenKgMID History Page (Recent Batches)
 * 
 * Lists recent batch processing tasks from the last 7 days.
 * Provides quick access to view status and download results of past uploads.
 * 
 * @module Source/App/V2/History
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BatchSummary {
    _id: string;
    fileName: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    totalItems: number;
    processedCount: number;
    progress: number;
    createdAt: string;
    readableId?: number;
}

export default function HistoryPage() {
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch("/api/v2/batches");
                if (res.ok) {
                    const data = await res.json();
                    setBatches(data);
                }
            } catch (e) {
                console.error("Failed to load history", e);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 text-white p-6 font-sans flex flex-col items-center relative overflow-hidden">
            {/* Background Elements (Simplified) */}
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-slate-950/50 z-0 pointer-events-none"></div>
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
            </div>

            <div className="w-full max-w-5xl mt-12 z-10">
                <div className="flex justify-between items-center mb-8">
                    <Link href="/v2" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2">
                        <span>←</span> Back to v2 Upload
                    </Link>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300">
                        Recent Batches (Last 7 Days)
                    </h1>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading history...</div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No batches found in the last 7 days. <Link href="/v2" className="text-indigo-400 hover:underline">Start a new one?</Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-slate-400 text-xs uppercase font-semibold border-b border-white/10">
                                    <tr>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">File Name</th>
                                        <th className="p-4">Progress</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {batches.map((batch) => (
                                        <tr key={batch._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${batch.status === 'COMPLETED' ? 'bg-green-500/10 text-green-300 border-green-500/20' :
                                                    batch.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 animate-pulse' :
                                                        batch.status === 'FAILED' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                                                            'bg-slate-500/10 text-slate-300 border-slate-500/20'
                                                    }`}>
                                                    {batch.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-200 font-medium">{batch.fileName}</td>
                                            <td className="p-4 text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{ width: `${batch.progress}%` }}></div>
                                                    </div>
                                                    <span className="text-xs">{batch.progress}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-400 font-mono text-xs">
                                                {new Date(batch.createdAt).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link href={`/v2/batch/${batch.readableId || batch._id}`} className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider hover:underline">
                                                    View Batch #{batch.readableId || "?"} →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
