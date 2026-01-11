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
        <div className="p-6 rounded-xl bg-black/20 border border-white/10 flex flex-col justify-center">
            <h2 className="text-xl font-semibold mb-4 text-purple-300">Data Input</h2>
            <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all group"
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
                        <p className="text-green-400 font-medium">{fileName}</p>
                        <p className="text-xs text-gray-500">{itemCount} items loaded</p>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 group-hover:text-purple-300 transition-colors">
                        <p className="font-medium">Upload JSON File</p>
                        <p className="text-xs mt-1">Click or drag file here</p>
                    </div>
                )}
            </div>
            <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-gray-400 font-mono">
                <p className="mb-1 text-gray-300 font-semibold">Expected Format:</p>
                <p>{`[{"human": "http://.../Q123", "humanLabel": "Name"}]`}</p>
            </div>
        </div>
    );
}
