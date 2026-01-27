"use client";

import { useState, useEffect } from "react";
import { parseWikidataJson, WikidataItem } from "@/lib/wikidata";
import { fetchRandomBackgroundAction, BackgroundImage } from "@/app/actions";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { FloatingMenu } from "@/components/FloatingMenu";
import { FileUploader } from "@/components/FileUploader";
import { ResultTable } from "@/components/ResultTable";

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
 * GenKgMID v2 Upload Page (Cloud/Batch)
 * 
 * Uploads data to a background queue (Inngest) for robust off-screen processing.
 * Redirects user to a persistent Batch status page.
 * 
 * @module Source/App/V2/Upload
 */
export default function Home() {
    const [apiKeys, setApiKeys] = useState<string[]>([""]);
    const [projectId, setProjectId] = useState("");
    const [strictMode, setStrictMode] = useState(false);
    const [useQidOnly, setUseQidOnly] = useState(false);
    const [items, setItems] = useState<WikidataItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState("");
    const [bgImage, setBgImage] = useState<BackgroundImage | null>(null);

    useEffect(() => {
        const loadBackground = async () => {
            try {
                const background = await fetchRandomBackgroundAction();
                if (background) {
                    setBgImage(background);
                } else {
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

        try {
            // 1. Initialize Upload
            const initRes = await fetch("/api/v2/upload/init", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName,
                    totalItems: items.length,
                    validKeys,
                    projectId,
                    strictMode,
                    useQidOnly
                })
            });

            if (!initRes.ok) {
                const err = await initRes.json();
                throw new Error(err.error || "Initialization failed");
            }

            const { batchId, readableId } = await initRes.json();

            // 2. Upload Chunks
            const CHUNK_SIZE = 500;
            const totalChunks = Math.ceil(items.length / CHUNK_SIZE);

            for (let i = 0; i < totalChunks; i++) {
                const chunk = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

                const chunkRes = await fetch("/api/v2/upload/chunk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        batchId,
                        items: chunk
                    })
                });

                if (!chunkRes.ok) {
                    throw new Error(`Chunk ${i + 1} upload failed`);
                }
            }

            // 3. Complete Upload
            const completeRes = await fetch("/api/v2/upload/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId })
            });

            if (!completeRes.ok) {
                const err = await completeRes.json();
                throw new Error(err.error || "Completion failed");
            }

            // Redirect to Batch Page
            window.location.href = `/v2/batch/${readableId}`;

        } catch (e: any) {
            console.error("Cloud processing error", e);
            alert("Failed to start cloud batch: " + e.message);
            setIsProcessing(false);
        }
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

            {/* Gradient Overlay */}
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-slate-950/50 z-0 pointer-events-none"></div>

            {/* Attribution Badge */}
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

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-20 px-4">
                {/* Header */}
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
                </header>

                <div className="z-10 w-full max-w-5xl p-6 md:p-8 backdrop-blur-3xl bg-slate-950/70 border border-white/20 rounded-2xl shadow-2xl shadow-black/80 mb-12 relative overflow-hidden group">
                    <div className="absolute inset-0 border border-white/10 rounded-2xl z-20 pointer-events-none"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-20 blur-md group-hover:opacity-30 transition-opacity duration-1000"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <h1 className="text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-blue-300 to-indigo-300 mb-2 tracking-tight drop-shadow-sm pb-1">
                            GenKgMID v2 ☁️
                        </h1>
                        <p className="text-slate-300 mb-8 font-light text-base md:text-lg max-w-2xl">
                            Upload your file here. The system will create a permanent background batch and you can close the window!
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

                    <div className="relative z-10 flex justify-center items-center mb-6">
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
                                    <span className="animate-spin text-xl">✨</span> Starting Cloud Batch...
                                </span>
                            ) : "Start Cloud Automation 🚀"}
                        </button>
                    </div>
                </div>

                <ResultTable items={items} isProcessing={isProcessing} disabled={true} />
            </div>
        </main>
    );
}
