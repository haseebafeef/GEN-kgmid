import { useRef } from "react";
import { WikidataItem } from "@/lib/wikidata";

interface FileUploaderProps {
    onUpload: (content: string, fileName: string) => void;
    fileName: string;
    itemCount: number;
}

export function FileUploader({ onUpload, fileName, itemCount }: FileUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            onUpload(content, file.name);
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 rounded-xl bg-slate-950/40 border border-white/10 backdrop-blur-sm flex flex-col justify-center shadow-xl shadow-black/20">
            <h2 className="text-xl font-bold mb-4 text-indigo-300 flex items-center gap-2">
                <span className="text-lg">📂</span> Data Input
            </h2>
            <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all duration-300 group"
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                />
                {fileName ? (
                    <div className="text-center">
                        <p className="text-green-400 font-bold drop-shadow-sm font-mono text-sm">{fileName}</p>
                        <p className="text-xs text-slate-400 mt-1">{itemCount} items loaded</p>
                    </div>
                ) : (
                    <div className="text-center text-slate-400/60 group-hover:text-slate-300 transition-colors">
                        <p className="font-medium text-lg">Upload JSON File</p>
                        <p className="text-xs mt-1 opacity-70">Click or drag file here</p>
                    </div>
                )}
            </div>
            <div className="mt-4 p-3 bg-black/40 rounded-lg text-xs text-gray-300 font-mono border border-white/10 shadow-inner">
                <p className="mb-1 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Supported Format:</p>
                <p className="text-gray-500 break-all">{`[{"item": "http://.../Q123", "itemLabel": "Name"}]`}</p>
                <p className="text-[10px] text-gray-600 mt-1 italic">Note: Keys can be variable (e.g., 'x' & 'xLabel') as long as they are paired.</p>
            </div>
        </div>
    );
}
