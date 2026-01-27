import { Dispatch, SetStateAction } from "react";

interface ConfigurationFormProps {
    apiKeys: string[];
    setApiKeys: Dispatch<SetStateAction<string[]>>;
    projectId: string;
    setProjectId: Dispatch<SetStateAction<string>>;
    strictMode: boolean;
    setStrictMode: Dispatch<SetStateAction<boolean>>;
    useQidOnly?: boolean;
    setUseQidOnly?: Dispatch<SetStateAction<boolean>>;
}

export function ConfigurationForm({ apiKeys, setApiKeys, projectId, setProjectId, strictMode, setStrictMode, useQidOnly, setUseQidOnly }: ConfigurationFormProps) {
    const addKey = () => {
        if (apiKeys.length < 20) {
            setApiKeys([...apiKeys, ""]);
        }
    };

    const removeKey = (index: number) => {
        if (apiKeys.length > 1) {
            const newKeys = apiKeys.filter((_, i) => i !== index);
            setApiKeys(newKeys);
        }
    };

    const updateKey = (index: number, value: string) => {
        const newKeys = [...apiKeys];
        newKeys[index] = value;
        setApiKeys(newKeys);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text");
        const pastedKeys = pastedData.split(/[\r\n]+/).map(k => k.trim()).filter(k => k !== "");

        if (pastedKeys.length === 0) return;

        const newKeys = [...apiKeys];

        pastedKeys.forEach((key, i) => {
            const targetIndex = startIndex + i;
            if (targetIndex < 20) {
                newKeys[targetIndex] = key;
            }
        });

        // Update state with the new keys array.
        // React will handle the re-render to reflect the filled inputs.
        setApiKeys(newKeys);
    };

    return (
        <div className="p-6 rounded-xl bg-slate-950/40 border border-white/10 backdrop-blur-sm shadow-xl shadow-black/20">
            <h2 className="text-xl font-bold mb-4 text-indigo-300 flex items-center gap-2">
                <span className="text-lg">⚙️</span> Configuration
            </h2>
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-300">Google Cloud API Keys</label>
                        <span className="text-xs text-slate-500">{apiKeys.length}/20 keys</span>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {apiKeys.map((key, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="password"
                                    value={key}
                                    onChange={(e) => updateKey(index, e.target.value)}
                                    onPaste={(e) => handlePaste(e, index)}
                                    placeholder={`API Key #${index + 1}`}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600 text-sm text-gray-200"
                                />
                                {apiKeys.length > 1 && (
                                    <button
                                        onClick={() => removeKey(index)}
                                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/20"
                                        title="Remove Key"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {apiKeys.length < 20 && (
                        <button
                            onClick={addKey}
                            className="mt-2 text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors font-medium border border-indigo-500/20 px-2 py-1 rounded hover:bg-indigo-500/10"
                        >
                            + Add another API Key
                        </button>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Project ID (Optional)</label>
                    <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="e.g. my-project-123"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600 text-gray-200"
                    />
                    <p className="text-xs text-slate-500 mt-1">Required for Enterprise Basic Edition API.</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                    {/* Strict Mode Checkbox */}
                    <div className="flex items-start gap-3">
                        <div className="flex items-center h-5 mt-0.5">
                            <input
                                id="strictMode"
                                type="checkbox"
                                checked={strictMode}
                                onChange={(e) => setStrictMode(e.target.checked)}
                                disabled={!!(useQidOnly && setUseQidOnly && useQidOnly)} // Disable if QID Only is active
                                className="w-4 h-4 text-indigo-500 bg-black/50 border-gray-600 rounded focus:ring-indigo-400 focus:ring-2 accent-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="text-sm">
                            <label htmlFor="strictMode" className={`font-medium ${useQidOnly ? 'text-slate-500' : 'text-slate-300'} cursor-pointer select-none`}>Enable Strict Double Verification</label>
                            <p className="text-xs text-slate-500"> Checks if Label Search matches QID Search. Slower but more accurate.</p>
                        </div>
                    </div>

                    {/* QID Only Checkbox - Conditionally Rendered */}
                    {setUseQidOnly && (
                        <div className="flex items-start gap-3">
                            <div className="flex items-center h-5 mt-0.5">
                                <input
                                    id="useQidOnly"
                                    type="checkbox"
                                    checked={useQidOnly}
                                    onChange={(e) => setUseQidOnly(e.target.checked)}
                                    className="w-4 h-4 text-emerald-500 bg-black/50 border-gray-600 rounded focus:ring-emerald-400 focus:ring-2 accent-emerald-500 cursor-pointer"
                                />
                            </div>
                            <div className="text-sm">
                                <label htmlFor="useQidOnly" className="font-medium text-slate-300 cursor-pointer select-none">Search with qid(s) only</label>
                                <p className="text-xs text-slate-500">Ignores label and directly searches using QID. Recommended if you trust your input QIDs.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
