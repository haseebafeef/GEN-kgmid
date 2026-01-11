import { Dispatch, SetStateAction } from "react";

interface ConfigurationFormProps {
    apiKeys: string[];
    setApiKeys: Dispatch<SetStateAction<string[]>>;
    projectId: string;
    setProjectId: Dispatch<SetStateAction<string>>;
}

export function ConfigurationForm({ apiKeys, setApiKeys, projectId, setProjectId }: ConfigurationFormProps) {
    const addKey = () => {
        if (apiKeys.length < 10) {
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

    return (
        <div className="p-6 rounded-xl bg-black/20 border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Configuration</h2>
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-gray-400">Google Cloud API Keys</label>
                        <span className="text-xs text-gray-500">{apiKeys.length}/10 keys</span>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {apiKeys.map((key, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="password"
                                    value={key}
                                    onChange={(e) => updateKey(index, e.target.value)}
                                    placeholder={`API Key #${index + 1}`}
                                    className="flex-1 bg-black/50 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 text-sm"
                                />
                                {apiKeys.length > 1 && (
                                    <button
                                        onClick={() => removeKey(index)}
                                        className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors border border-red-900/50"
                                        title="Remove Key"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {apiKeys.length < 10 && (
                        <button
                            onClick={addKey}
                            className="mt-2 text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            + Add another API Key
                        </button>
                    )}
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Project ID (Optional)</label>
                    <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="e.g. my-project-123"
                        className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for Enterprise Basic Edition API.</p>
                </div>
            </div>
        </div>
    );
}
