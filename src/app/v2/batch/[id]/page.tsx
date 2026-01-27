/**
 * GenKgMID Batch Details Page
 * 
 * Displays the real-time status, progress, and results of a specific background batch.
 * Allows downloading results, retrying failed batches, and stopping processing.
 * 
 * @module Source/App/V2/BatchDetails
 */
"use client";

import { useEffect, useState, memo, useMemo, useRef, use } from "react";
import { BackgroundImage } from "@/app/actions";
import Link from "next/link";
import { ResultTable } from "@/components/ResultTable";
import { FloatingMenu } from "@/components/FloatingMenu";

const PreviewRow = memo(({ item }: { item: any }) => (
    <tr className="hover:bg-white/5">
        <td className="p-3 text-slate-300">{item.label}</td>
        <td className="p-3 text-blue-400">{item.qid}</td>
        <td className="p-3 text-green-400">{item.kgId || "-"}</td>
        <td className="p-3 text-purple-400">{item.kgType || "-"}</td>
    </tr>
), (prev, next) => {
    return (
        prev.item.label === next.item.label &&
        prev.item.qid === next.item.qid &&
        prev.item.kgId === next.item.kgId &&
        prev.item.kgType === next.item.kgType
    );
});
PreviewRow.displayName = 'PreviewRow';

const MemoizedResultTableWrapper = memo(({ batch, stableInputData }: { batch: any, stableInputData: any[] }) => {
    // Memoize the merged items to ensure object stability across renders
    const displayItems = useMemo(() => {
        // Overlay outputData results onto inputData for live updates
        const outputMap = new Map();
        if (batch.outputData) {
            batch.outputData.forEach((item: any) => {
                if (item._rowId !== undefined) {
                    outputMap.set(item._rowId, item);
                }
            });
        }

        // Merge logic: Map over stable input data and replace with processed results where available
        let merged = [];
        if (stableInputData && stableInputData.length > 0) {
            merged = stableInputData.map((item: any) => {
                const processed = outputMap.get(item._rowId);
                // Optimization: Return the original item reference if not processed
                // Preserves React.memo equality checks in child components
                return processed ? processed : item;
            });
        }
        return merged;
    }, [stableInputData, batch.outputData]); // Re-calculate when data updates logic

    // Memoization to prevent unnecessary re-renders of the table wrapper
    // Filters output data to determine derived properties efficiently
    const useQidOnly = useMemo(() => batch.outputData?.some((i: any) => i.kgSchemaType !== undefined || i.kgName !== undefined), [batch.outputData]);

    return (
        <ResultTable
            items={displayItems}
            isProcessing={batch.status === "PROCESSING"}
            showDownloads={false}
            useQidOnly={useQidOnly}
            strictMode={batch.strictMode}
        />
    );
});
MemoizedResultTableWrapper.displayName = 'MemoizedResultTableWrapper';


export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: batchId } = use(params);
    const [batch, setBatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewAll, setViewAll] = useState(false);
    const [showMatched, setShowMatched] = useState(false);

    // Stable reference for inputData to prevent re-renders on every poll
    const inputDataRef = useRef<any[]>([]);

    // Update inputDataRef only when a new batch is loaded or inputData actually changes significantly
    if (batch?.inputData && batch.inputData.length > 0) {
        if (inputDataRef.current.length === 0 || inputDataRef.current.length !== batch.inputData.length) {
            inputDataRef.current = batch.inputData;
        }
    }
    const stableInputData = inputDataRef.current;

    // Poll for status updates
    useEffect(() => {
        const poll = async () => {
            try {
                // Fetch batch details
                const url = `/api/v2/batch/${batchId}${viewAll ? '?limit=all' : ''}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setBatch(data);

                    // Terminate polling if batch has reached a final state
                    if (data.status === "COMPLETED" || data.status === "FAILED" || data.status === "STOPPED") {
                        return true;
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            } finally {
                setLoading(false);
            }
            return false;
        };

        let intervalId: NodeJS.Timeout;

        // Initiate polling sequence
        poll().then((shouldStop) => {
            if (!shouldStop) {
                intervalId = setInterval(async () => {
                    const stop = await poll();
                    if (stop) clearInterval(intervalId);
                }, 4000); // Poll every 4 seconds to balance freshness with server load
            }
        });

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [batchId, viewAll]);

    // CSV Download Handlers
    const downloadCSV = (type: "P646" | "P2671" | "v1") => {
        const url = `/api/v2/batch/${batchId}/download?type=${type}`;
        window.open(url, "_blank");
    };

    const downloadMatchedCSV = (type: "P646" | "P2671" | "v1") => {
        const url = `/api/v2/batch/${batchId}/download?type=${type}&filter=matched`;
        window.open(url, "_blank");
    };

    if (loading && !batch) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
                {/* Animated Circular Loader */}
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-purple-500/30 border-b-purple-500 rounded-full animate-spin-reverse"></div>
                    </div>
                </div>
                <div className="text-xl font-medium animate-pulse text-indigo-300">Loading Batch...</div>
            </div>
        );
    }

    if (!batch) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Batch Not Found</div>;
    }

    const p646Count = batch.foundCountP646 || 0;
    const p2671Count = batch.foundCountP2671 || 0;
    const totalFound = p646Count + p2671Count;

    return (
        <main className="min-h-screen bg-slate-950 text-white p-6 font-sans flex flex-col items-center">
            <div className="w-full max-w-4xl mt-12">
                <nav className="relative z-50 flex flex-wrap justify-between items-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 mb-8">
                    <div className="flex items-center gap-6">
                        <Link href="/v2" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2">
                            <span>←</span> Back to v2 Upload
                        </Link>
                        <Link
                            href="/v2/batches"
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all group"
                        >
                            <span className="text-xl">🕰️</span>
                            <span className="text-sm font-semibold text-purple-200 group-hover:text-purple-100">Recent Batches</span>
                        </Link>
                    </div>
                    <div>
                        <FloatingMenu isV2={true} />
                    </div>
                </nav>

                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                    <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        Batch Status: {batch.status}
                    </h1>
                    <p className="text-slate-400 mb-8 font-mono text-sm">Batch #{batch.readableId || batchId}</p>

                    {/* Retry Button */}
                    {(batch.status === "PENDING" || batch.status === "FAILED" || batch.status === "STOPPED") && (
                        <div className="mb-6">
                            <button
                                onClick={async () => {
                                    if (!confirm("Resume this batch? This will process pending items and skip already completed ones.")) return;
                                    setLoading(true);
                                    try {
                                        const res = await fetch(`/api/v2/batch/${batchId}/retry`, { method: "POST" });
                                        if (res.ok) {
                                            window.location.reload();
                                        } else {
                                            const err = await res.json();
                                            alert("Retry Failed: " + (err.error || "Unknown Error"));
                                        }
                                    } catch (e) {
                                        alert("Network Error");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 hover:text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                            >
                                Retry Batch
                            </button>
                            {(!batch.validKeys || batch.validKeys.length === 0) && (
                                <p className="text-xs text-yellow-500/70 mt-2">
                                    Note: Old batches created before this update may not be retryable.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-end mb-4">
                        <div className="w-full mr-4">
                            {/* Progress Bar */}
                            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden mb-1 border border-white/5">
                                <div
                                    className={`h-full transition-all duration-500 ${batch.status === "FAILED" || batch.status === "STOPPED" ? "bg-red-500" :
                                        batch.status === "COMPLETED" ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"
                                        }`}
                                    style={{ width: `${batch.progress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">
                                    {batch.processedCount} / {batch.totalItems} items processed
                                    {batch.status !== "COMPLETED" && (
                                        <span className="ml-2 text-green-400 font-mono text-xs">
                                            (P646: {batch.foundCountP646 || 0} found &nbsp; P2671: {batch.foundCountP2671 || 0} found)
                                        </span>
                                    )}
                                </span>
                                <span className="text-cyan-300 font-bold">{batch.progress}%</span>
                            </div>
                        </div>

                        {/* Stop Action */}
                        {batch.status === "PROCESSING" && (
                            <button
                                onClick={async () => {
                                    if (!confirm("Stop this batch? You can resume it later.")) return;
                                    setLoading(true);
                                    try {
                                        const res = await fetch(`/api/v2/batch/${batchId}/cancel`, { method: "POST" });
                                        if (res.ok) {
                                            window.location.reload();
                                        } else {
                                            alert("Failed to stop.");
                                        }
                                    } catch (e) {
                                        alert("Network Error");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap h-[42px] flex items-center"
                            >
                                🛑 Stop
                            </button>
                        )}
                    </div>

                    {batch.error && (
                        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-8">
                            Error: {batch.error}
                        </div>
                    )}

                    {batch.status === "COMPLETED" && (
                        <div className="flex flex-col gap-8">
                            {/* Standard Downloads */}
                            <div className="flex flex-col gap-3">
                                <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest pl-1">All Results</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button onClick={() => downloadCSV("P646")} className="relative group overflow-hidden bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/20 border border-blue-400/20 flex flex-col items-center justify-center">
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span>Download Freebase ID (P646)</span>
                                        <span className="text-xs font-normal opacity-80 mt-1">found ({p646Count})</span>
                                    </button>
                                    <button onClick={() => downloadCSV("P2671")} className="relative group overflow-hidden bg-purple-600 hover:bg-purple-500 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-purple-500/20 border border-purple-400/20 flex flex-col items-center justify-center">
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span>Download Google KG ID (P2671)</span>
                                        <span className="text-xs font-normal opacity-80 mt-1">found ({p2671Count})</span>
                                    </button>
                                </div>
                                <button onClick={() => downloadCSV("v1")} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-white/5 border border-white/10 flex flex-col items-center justify-center">
                                    <span>Download V1 (total ({totalFound}))</span>
                                </button>
                            </div>

                            {/* Matched Label Section Toggle */}
                            {batch.useQidOnly && (
                                <div className="flex items-center gap-3 py-2 border-t border-white/10 mt-2">
                                    <input
                                        type="checkbox"
                                        id="showMatched"
                                        checked={showMatched}
                                        onChange={(e) => setShowMatched(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer"
                                    />
                                    <label htmlFor="showMatched" className="text-slate-300 cursor-pointer select-none hover:text-white transition-colors">
                                        Download ID(s) with matched Label
                                    </label>
                                </div>
                            )}

                            {/* Matched Label Section (Only for useQidOnly batches AND when checked) */}
                            {batch.useQidOnly && showMatched && (
                                <div className="group relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/40 via-emerald-950/20 to-slate-900/50 p-4 shadow-2xl backdrop-blur-sm transition-all animate-fade-in-down">
                                    <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-teal-500/20 to-emerald-500/10 text-teal-300 text-[9px] px-2 py-1 rounded-bl-lg font-bold border-l border-b border-teal-500/20 tracking-wider shadow-lg backdrop-blur-md">
                                        ✨ STRICT MATCH
                                    </div>

                                    <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-400 font-bold mb-4 flex items-center gap-3 text-sm">
                                        <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-teal-500/20 border border-teal-500/30 shadow-[0_0_15px_-3px_rgba(20,184,166,0.3)] text-teal-300">
                                            <span className="text-[10px] translate-y-[1px]">➤</span>
                                        </div>
                                        <div>
                                            Verified Label Matches
                                            <div className="text-[10px] font-medium text-teal-500/60 mt-0 font-mono">
                                                (Case-Sensitive: Input Label === KG Name)
                                            </div>
                                        </div>
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <button
                                            onClick={() => downloadMatchedCSV("P646")}
                                            className="relative overflow-hidden group/btn bg-gradient-to-br from-teal-900/40 to-emerald-900/40 hover:from-teal-800/50 hover:to-emerald-800/50 text-teal-100 border border-teal-500/30 hover:border-teal-400/50 py-2 px-4 rounded-lg transition-all shadow-lg hover:shadow-teal-900/20 flex flex-col items-center justify-center"
                                        >
                                            <div className="absolute inset-0 bg-teal-400/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                            <span className="font-bold tracking-tight text-xs">Freebase ID (P646)</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] uppercase tracking-wider text-teal-400/70 font-bold">Matches Found</span>
                                                <span className="bg-teal-500/20 text-teal-300 px-1.5 py-0 rounded text-[9px] font-mono border border-teal-500/30">
                                                    {batch.matchedCountP646 || 0}
                                                </span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => downloadMatchedCSV("P2671")}
                                            className="relative overflow-hidden group/btn bg-gradient-to-br from-emerald-900/40 to-teal-900/40 hover:from-emerald-800/50 hover:to-teal-800/50 text-emerald-100 border border-emerald-500/30 hover:border-emerald-400/50 py-2 px-4 rounded-lg transition-all shadow-lg hover:shadow-emerald-900/20 flex flex-col items-center justify-center"
                                        >
                                            <div className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                            <span className="font-bold tracking-tight text-xs">Google KG ID (P2671)</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] uppercase tracking-wider text-emerald-400/70 font-bold">Matches Found</span>
                                                <span className="bg-teal-500/20 text-emerald-300 px-1.5 py-0 rounded text-[9px] font-mono border border-emerald-500/30">
                                                    {batch.matchedCountP2671 || 0}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => downloadMatchedCSV("v1")}
                                        className="w-full bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white py-2 px-4 rounded-lg font-semibold transition-all border border-white/5 hover:border-white/10 text-[10px] flex items-center justify-center gap-2 hover:shadow-lg group/v1"
                                    >
                                        <span>Download V1 Format</span>
                                        <span className="text-slate-500 group-hover/v1:text-slate-400 transition-colors">
                                            — Total Matched: {(batch.matchedCountP646 || 0) + (batch.matchedCountP2671 || 0)}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const url = `/api/v2/batch/${batchId}/download?type=not_found&filter=strict_rejects`;
                                            window.open(url, "_blank");
                                        }}
                                        className="w-full mt-2 bg-orange-900/20 hover:bg-orange-900/30 text-orange-300/80 hover:text-orange-200 py-2 px-4 rounded-lg font-semibold transition-all border border-orange-500/10 hover:border-orange-500/30 text-[10px] flex items-center justify-center gap-2 hover:shadow-lg"
                                    >
                                        <span>Download Unmatched (JSON)</span>
                                        <span className="text-orange-500/60">
                                            — Failed: {Math.max(0, batch.totalItems - ((batch.matchedCountP646 || 0) + (batch.matchedCountP2671 || 0)))}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {batch.status === "COMPLETED" && (
                        <div className="mt-8">
                            {/* Not Found Download Section */}
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-slate-300 font-bold flex items-center gap-2">
                                        <span>⚠️</span> Items Missing KG IDs
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Download items where no Knowledge Graph ID was found.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = `/api/v2/batch/${batchId}/download?type=not_found`;
                                        window.open(url, "_blank");
                                    }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 hover:border-slate-500 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 shadow-lg"
                                >
                                    <span>Download JSON</span>
                                    <span className="bg-slate-900/50 px-2 py-0.5 rounded text-xs text-slate-400 font-mono">
                                        {Math.max(0, batch.totalItems - (p646Count + p2671Count))} items
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Result Preview (Optional) */}
                {batch.inputData && batch.inputData.length > 0 && (
                    <div className="mt-12 w-full">
                        <h3 className="text-xl font-bold text-slate-300 mb-4">Live Preview</h3>

                        {!viewAll ? (
                            <>
                                <div className="bg-black/40 rounded-xl overflow-hidden border border-white/10 max-h-96 overflow-y-auto font-mono text-xs">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-800 text-slate-400 sticky top-0">
                                            <tr>
                                                <th className="p-3">Label</th>
                                                <th className="p-3">QID</th>
                                                <th className="p-3">KG ID</th>
                                                <th className="p-3">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(() => {
                                                // Preview Merge Logic: Show first 100 items from INPUT, overlaid with valid results
                                                // This ensures the table is populated immediately and updates in-place.
                                                const previewLimit = 100;
                                                const outputMap = new Map();
                                                if (batch.outputData) {
                                                    batch.outputData.forEach((item: any) => {
                                                        if (item._rowId !== undefined) outputMap.set(item._rowId, item);
                                                    });
                                                }

                                                const displayItems = stableInputData.slice(0, previewLimit).map((item: any) => {
                                                    const result = outputMap.get(item._rowId);
                                                    return result ? result : item;
                                                });

                                                return displayItems.map((item: any, i: number) => (
                                                    <PreviewRow key={item._rowId || i} item={item} />
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                    <div className="p-3 text-center text-slate-500 italic border-t border-white/5 font-mono text-[10px] uppercase tracking-wider">
                                        Showing only first 100 items...
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={() => setViewAll(true)}
                                        className="bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-lg border border-white/10"
                                    >
                                        View All Items ({batch.totalItems})
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="animate-fade-in">
                                <div className="mb-4 flex justify-end">
                                    <button
                                        onClick={() => setViewAll(false)}
                                        className="text-indigo-400 hover:text-indigo-300 text-sm underline"
                                    >
                                        Back to Preview
                                    </button>
                                </div>
                                {(() => {
                                    return (
                                        <MemoizedResultTableWrapper
                                            batch={batch}
                                            stableInputData={stableInputData}
                                        />
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
