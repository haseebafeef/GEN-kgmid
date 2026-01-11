"use client";

import { useState } from "react";
import { parseWikidataJson, generateSeparatedQuickStatements, WikidataItem } from "@/lib/wikidata";
import { searchGoogleKGAction } from "@/app/actions";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { FileUploader } from "@/components/FileUploader";
import { ResultTable } from "@/components/ResultTable";

export default function Home() {
    const [apiKeys, setApiKeys] = useState<string[]>([""]);
    const [projectId, setProjectId] = useState("");
    const [strictMode, setStrictMode] = useState(false);
    const [items, setItems] = useState<WikidataItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processedCount, setProcessedCount] = useState(0);
    const [resultContentP646, setResultContentP646] = useState("");
    const [resultContentP2671, setResultContentP2671] = useState("");
    const [fileName, setFileName] = useState("");

    const handleFileUpload = (content: string, name: string) => {
        try {
            setFileName(name);
            const parsedItems = parseWikidataJson(content);
            setItems(parsedItems);
            setProcessedCount(0);
            setProgress(0);
            setResultContentP646("");
            setResultContentP2671("");
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
        let currentIndex = 0;
        let processed = 0;

        const worker = async (key: string) => {
            while (currentIndex < newItems.length) {
                const i = currentIndex++;
                if (i >= newItems.length) break;

                const item = newItems[i];
                try {
                    // Small delay to prevent burst issues even with multiple keys
                    // Small delay to prevent burst issues
                    await new Promise(r => setTimeout(r, 100));
                    const result = await searchGoogleKGAction(item.label, key, projectId, item.qid, strictMode);
                    if (result) {
                        newItems[i] = {
                            ...item,
                            kgId: result.id,
                            kgType: result.type,
                            kgDescription: result.description
                        };
                    }
                } catch (e: any) {
                    console.error("Error processing item", item.label, key, e);
                    newItems[i] = { ...item, error: e.message || "Request Failed" };
                }

                processed++;
                setProcessedCount(processed);
                setProgress(Math.round((processed / newItems.length) * 100));

                // Update state occasionally (Less frequent updates to prevent lag on large datasets)
                // Updating every 50 items instead of 5
                if (processed % 50 === 0 || processed === newItems.length) {
                    setItems([...newItems]);
                }
            }
        };

        await Promise.all(validKeys.map(key => worker(key)));

        setItems(newItems);
        const { p646, p2671 } = generateSeparatedQuickStatements(newItems);
        setResultContentP646(p646);
        setResultContentP2671(p2671);
        setIsProcessing(false);
    };

    // Removed old downloadResults function as it's now in ResultTable

    return (
        <main className="flex min-h-screen flex-col items-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative">
            {/* Navbar */}
            <nav className="w-full max-w-6xl flex flex-wrap justify-between items-center mb-12 p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    GenKGmid
                </div>
                <div className="flex gap-6 text-sm text-gray-300">
                    <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Wikidata</a>
                    <a href="https://query.wikidata.org/" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">Query Service</a>
                    <a href="https://quickstatements.toolforge.org/" target="_blank" rel="noopener noreferrer" className="hover:text-red-400 transition-colors">QuickStatements</a>
                </div>
            </nav>

            <div className="z-10 w-full max-w-4xl p-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl mb-12">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                    Google Knowledge Graph ID Finder
                </h1>
                <p className="text-gray-300 mb-8">
                    Automate Google Knowledge Graph ID linking for QuickStatements.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <ConfigurationForm
                        apiKeys={apiKeys}
                        setApiKeys={setApiKeys}
                        projectId={projectId}
                        setProjectId={setProjectId}
                        strictMode={strictMode}
                        setStrictMode={setStrictMode}
                    />
                    <FileUploader
                        onUpload={handleFileUpload}
                        fileName={fileName}
                        itemCount={items.length}
                    />
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-gray-400">
                        {items.length > 0 && (
                            <span className="font-mono">
                                {processedCount} / {items.length} processed ({progress}% completed)
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing || !apiKeys.some(k => k.trim()) || items.length === 0}
                        className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all ${isProcessing || !apiKeys.some(k => k.trim()) || items.length === 0
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 active:scale-95 text-white"
                            }`}
                    >
                        {isProcessing ? "Processing..." : "Start Automation"}
                    </button>
                </div>

                {items.length > 0 && (
                    <div className="w-full h-1 bg-gray-700 rounded-full mb-8 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                )}

                <ResultTable
                    items={items}
                    resultContentP646={resultContentP646}
                    resultContentP2671={resultContentP2671}
                />
            </div>

            {/* About Section */}
            <div className="w-full max-w-4xl p-8 bg-black/20 border border-white/10 rounded-2xl mb-12 text-gray-300">
                <h2 className="text-2xl font-bold text-white mb-4">How it works</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Input</h3>
                        <p className="text-sm">Upload a JSON file from a Wikidata Query containing <code>humanLabel</code>. Provide your Google Cloud API Keys.</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-purple-400 mb-2">2. Process</h3>
                        <p className="text-sm">The tool queries the Google Knowledge Graph API in parallel for each item to find matching Freebase (P646) or Knowledge Graph (P2671) IDs.</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-2">3. Output</h3>
                        <p className="text-sm">Download pre-formatted CSV files ready to be copied directly into QuickStatements for mass batch updates.</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="text-gray-500 text-sm font-medium py-4">
                Designed & Developed with <span className="text-red-500">♥</span> by <a href="https://github.com/haseebafeef" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Haseeb</a>
            </footer>
        </main>
    );
}
