"use client";

import { useState, useEffect } from "react";
import { parseWikidataJson, WikidataItem } from "@/lib/wikidata";
import { searchGoogleKGAction, fetchRandomBackgroundAction, BackgroundImage } from "@/app/actions";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { FloatingMenu } from "@/components/FloatingMenu";
import { FileUploader } from "@/components/FileUploader";
import { ResultTable } from "@/components/ResultTable";
import { pLimit } from "@/lib/concurrency";

import Link from "next/link";

const FALLBACK_BG: BackgroundImage = {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Schloss_Neuschwanstein_2013.jpg/2560px-Schloss_Neuschwanstein_2013.jpg",
    title: "Neuschwanstein Castle",
    artist: "Thomas Wolf",
    artistUrl: "https://commons.wikimedia.org/wiki/User:Der_Wolf_im_Wald",
    license: "CC BY-SA 3.0 DE",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
    attributionUrl: "https://commons.wikimedia.org/wiki/File:Schloss_Neuschwanstein_2013.jpg"
};

/**
 * GenKgMID Optimized Page
 * 
 * Uses p-limit for controlled concurrency (5 requests at a time) to prevent
 * API rate limiting while maintaining high throughput.
 * Features a dynamic update loop to keep UI responsive without excessive renders.
 * 
 * @module Source/App/Optimized
 */
export default function Home() {
    const [apiKeys, setApiKeys] = useState<string[]>([""]);
    const [projectId, setProjectId] = useState("");
    const [strictMode, setStrictMode] = useState(false);
    const [useQidOnly, setUseQidOnly] = useState(false);
    const [items, setItems] = useState<WikidataItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processedCount, setProcessedCount] = useState(0);
    const [fileName, setFileName] = useState("");
    const [bgImage, setBgImage] = useState<BackgroundImage | null>(null);

    // Fetch random background on mount
    useEffect(() => {
        const loadBackground = async () => {
            try {
                const background = await fetchRandomBackgroundAction();
                if (background) {
                    setBgImage(background);
                } else {
                    console.warn("Using fallback background image.");
                    setBgImage(FALLBACK_BG);
                }
            } catch (e) {
                console.error("Failed to load background", e);
                setBgImage(FALLBACK_BG);
            }
        };
        loadBackground();
    }, []);

    const handleFileUpload = (content: string, name: string) => {
        try {
            setFileName(name);
            const parsedItems = parseWikidataJson(content);
            setItems(parsedItems);
            setProcessedCount(0);
            setProgress(0);
        } catch (err) {
            alert("Failed to parse JSON file. Please ensure it fits the expected format.");
        }
    };

    const handleProcess = async () => {
        const validKeys = apiKeys.filter(k => k.trim() !== "");
        if (validKeys.length === 0) {
            alert("Please enter at least one Google Cloud API Key.");
            return;
        }
        if (items.length === 0) {
            alert("Please upload a file first.");
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setProcessedCount(0);

        const newItems = [...items];
        let processed = 0;

        // Dynamic Update Frequency Calculation
        // Goal: Maintain responsiveness while avoiding excessive re-renders.
        // Formula: Update roughly every 50th of the total list, but at least every 1 item.
        // Examples:
        // - 50 items: 50/50 = 1 -> Update every 1 item
        // - 200 items: 200/50 = 4 -> Update every 4 items
        // - 500 items: 500/50 = 10 -> Update every 10 items
        // - 1000 items: 1000/50 = 20 -> Update every 20 items
        const updateInterval = Math.max(1, Math.floor(newItems.length / 50));

        const limit = pLimit(5);
        // Create a single queue for ALL items, but distribute keys in validKeys cyclically.

        const promises = newItems.map((item, index) => {
            // Assign a key round-robin style
            const key = validKeys[index % validKeys.length];

            return limit(async () => {
                // Check if already processed (not strictly needed with map, but good for safety)
                if (item.kgId) return;

                try {
                    const result = await searchGoogleKGAction(item.label, key, {
                        projectId,
                        qid: item.qid,
                        strictMode,
                        useQidOnly
                    });
                    if (result) {
                        newItems[index] = {
                            ...item,
                            kgId: result.id,
                            kgType: result.type,
                            kgDescription: result.description,
                            kgName: result.name,
                            kgSchemaType: result.schemaType
                        };
                    }
                } catch (e: any) {
                    console.error("Error processing item", item.label, key, e);
                    newItems[index] = { ...item, error: e.message || "Request Failed" };
                } finally {
                    processed++;
                    setProcessedCount(processed);
                    setProgress(Math.round((processed / newItems.length) * 100));

                    // Dynamic Update: Use the calculated interval
                    if (processed % updateInterval === 0 || processed === newItems.length) {
                        setItems([...newItems]);
                    }
                }
            });
        });

        await Promise.all(promises);

        setItems(newItems);
        setIsProcessing(false);
    };


    return (
        <main className="flex min-h-screen flex-col items-center p-6 bg-slate-950 text-white relative font-sans selection:bg-pink-500 selection:text-white transition-all duration-1000">
            {/* Background Image - Enhanced Visibility */}
            {bgImage && (
                <div
                    className="fixed inset-0 z-0 transition-opacity duration-1000 ease-in-out"
                    style={{
                        backgroundImage: `url(${bgImage.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed',
                        opacity: 0.85,
                        filter: 'saturate(1.3) contrast(1.1)'
                    }}
                />
            )}

            {/* Gradient Overlay - Reduced opacity for better BG visibility */}
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-slate-950/50 z-0 pointer-events-none"></div>

            {/* Background Attribution Badge */}
            {bgImage && (
                <div className="fixed bottom-4 right-4 z-0 text-[11px] text-white/70 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 hover:opacity-100 transition-opacity max-w-sm md:max-w-md shadow-xl text-right">
                    <p className="font-semibold mb-1 leading-snug">
                        <a href={bgImage.attributionUrl} target="_blank" rel="noopener" className="hover:text-white underline decoration-white/30 hover:decoration-white">{bgImage.title}</a>
                    </p>
                    <p className="leading-snug opacity-90 text-[10px]">
                        By {bgImage.artistUrl ? (
                            <a href={bgImage.artistUrl} target="_blank" rel="noopener" className="hover:text-white underline decoration-white/30 hover:decoration-white">{bgImage.artist}</a>
                        ) : (
                            bgImage.artist
                        )} • <a href={bgImage.licenseUrl} target="_blank" rel="noopener" className="hover:text-white underline decoration-white/30 hover:decoration-white">{bgImage.license}</a>
                    </p>
                </div>
            )}

            {/* Background Orbs/Glows for extra color */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-1000"></div>
            </div>

            {/* Content Container - Increased contrast for readability */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-20 px-4">

                <header className="w-full max-w-6xl mb-12 z-50 relative">
                    <nav className="flex flex-wrap justify-between items-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10">
                        <div className="flex items-center gap-6">
                            <Link href="/" className="hover:opacity-80 transition-opacity">
                                <img
                                    src="/assets/logo.png"
                                    alt="GenKgMID Logo"
                                    className="h-12 w-auto bg-white rounded-lg p-1 shadow-lg shadow-purple-500/20"
                                />
                            </Link>
                            <a
                                href="https://github.com/haseebafeef/gen-kgmid"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg transition-all group"
                            >
                                <span className="text-xl">📚</span>
                                <span className="text-sm font-semibold text-indigo-200 group-hover:text-indigo-100">Documentation</span>
                            </a>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-200 font-medium">
                            <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition-colors flex items-center gap-2 drop-shadow-md">
                                <img src="/assets/wikidata.svg" alt="" className="w-6 h-6 drop-shadow-md" />
                                Wikidata
                            </a>
                            <a href="https://query.wikidata.org/" target="_blank" rel="noopener noreferrer" className="hover:text-green-300 transition-colors flex items-center gap-2 drop-shadow-md">
                                <img src="/assets/query-service.svg" alt="" className="w-5 h-5 bg-white rounded-full p-0.5" />
                                Query Service
                            </a>
                            <a href="https://quickstatements.toolforge.org/" target="_blank" rel="noopener noreferrer" className="hover:text-red-300 transition-colors flex items-center gap-2 drop-shadow-md">
                                <img src="/assets/quickstatements.svg" alt="" className="w-6 h-6" />
                                QuickStatements
                            </a>
                            <FloatingMenu />
                        </div>
                    </nav>
                </header>

                <div className="z-10 w-full max-w-5xl p-6 md:p-8 backdrop-blur-3xl bg-slate-950/70 border border-white/20 rounded-2xl shadow-2xl shadow-black/80 mb-12 relative overflow-hidden group">
                    {/* Subtle gradient border effect */}
                    <div className="absolute inset-0 border border-white/10 rounded-2xl z-20 pointer-events-none"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-20 blur-md group-hover:opacity-30 transition-opacity duration-1000"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <h1 className="text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 mb-2 tracking-tight drop-shadow-sm pb-1">
                            Google Knowledge Graph ID Finder (Optimized)
                        </h1>
                        <p className="text-slate-300 mb-8 font-light text-base md:text-lg max-w-2xl">
                            Automate Google Knowledge Graph ID linking for QuickStatements.
                        </p>
                    </div>

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <ConfigurationForm
                            apiKeys={apiKeys}
                            setApiKeys={setApiKeys}
                            projectId={projectId}
                            setProjectId={setProjectId}
                            strictMode={strictMode}
                            setStrictMode={setStrictMode}
                            useQidOnly={useQidOnly}
                            setUseQidOnly={setUseQidOnly}
                        />
                        <FileUploader
                            onUpload={handleFileUpload}
                            fileName={fileName}
                            itemCount={items.length}
                        />
                    </div>

                    <div className="relative z-10 flex justify-between items-center mb-6">
                        <div className="text-sm font-medium">
                            {items.length > 0 && (
                                <span className="font-mono text-cyan-300">
                                    {processedCount} / {items.length} processed ({progress}% completed)
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleProcess}
                            disabled={isProcessing || !apiKeys.some(k => k.trim()) || items.length === 0}
                            className={`px-8 py-3 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 border border-white/20 ${isProcessing || !apiKeys.some(k => k.trim()) || items.length === 0
                                ? "bg-slate-900/50 text-slate-600 cursor-not-allowed border-none"
                                : "bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white shadow-purple-900/40"
                                }`}
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin text-xl">✨</span> Processing...
                                </span>
                            ) : "Start Automation 🚀"}
                        </button>
                    </div>

                    {items.length > 0 && (
                        <div className="relative z-10 w-full h-2 bg-slate-900/50 rounded-full mb-8 overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}

                    {/* Processing Logic - separated processing for clarity */}
                    {/* We use ResultTable to manage preview and downloads */}
                </div>

                <ResultTable items={items} isProcessing={isProcessing} useQidOnly={useQidOnly} />

                {/* About Section */}
                <section aria-label="How it works" className="w-full max-w-4xl p-8 bg-slate-950/80 border border-white/20 rounded-3xl mb-12 text-slate-300 backdrop-blur-xl z-10 shadow-2xl shadow-black/50">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 mb-8 text-center">How it works</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Step 1: Input (Blue) */}
                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 hover:border-indigo-500/50 transition-all hover:-translate-y-1 duration-300 group shadow-lg">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 text-indigo-300 font-bold text-xl group-hover:scale-110 transition-transform ring-1 ring-indigo-500/30">1</div>
                            <h3 className="text-xl font-bold text-indigo-200 mb-3">Input</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Upload a JSON file from a Wikidata Query. The system automatically detects <code className="bg-indigo-950/50 px-1 rounded text-indigo-300 border border-indigo-500/20">item/Label</code> pairs (e.g., human/humanLabel or custom). Provide your Google Cloud API Keys.</p>
                        </div>

                        {/* Step 2: Process (Purple) */}
                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 hover:border-purple-500/50 transition-all hover:-translate-y-1 duration-300 group shadow-lg">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 text-purple-300 font-bold text-xl group-hover:scale-110 transition-transform ring-1 ring-purple-500/30">2</div>
                            <h3 className="text-xl font-bold text-purple-200 mb-3">Process</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">The tool queries the Google Knowledge Graph API in parallel for each item to find matching Freebase (P646) or Knowledge Graph (P2671) IDs.</p>
                        </div>

                        {/* Step 3: Output (Cyber/Green) */}
                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 hover:border-cyan-500/50 transition-all hover:-translate-y-1 duration-300 group shadow-lg">
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 text-cyan-300 font-bold text-xl group-hover:scale-110 transition-transform ring-1 ring-cyan-500/30">3</div>
                            <h3 className="text-xl font-bold text-cyan-200 mb-3">Output</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Download pre-formatted CSV files ready to be copied directly into QuickStatements for mass batch updates.</p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-slate-400 text-sm font-medium py-4 z-10">
                    Designed & Developed with <span className="text-red-500">♥</span> by <a href="https://github.com/haseebafeef" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Haseeb</a>
                </footer>
            </div>
        </main >
    );
}
