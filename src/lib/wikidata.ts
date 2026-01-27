/**
 * GenKgMID Wikidata Utility
 * 
 * Provides helper functions for parsing Wikidata JSON exports and generating
 * QuickStatements compatible validation files.
 * 
 * @module Source/Lib/Wikidata
 */
export interface WikidataItem {
    /** The QID of the entity (e.g., Q123) */
    qid: string;
    /** Human-readable label from Wikidata */
    label: string;
    /** Original URL or Identifier string */
    originalUrl: string;
    /** The found Google Knowledge Graph ID (or Freebase ID) */
    kgId?: string;
    /** The type of ID found (P2671 or P646) */
    kgType?: "P2671" | "P646";
    /** Description from Google KG for verification */
    kgDescription?: string;
    /** Name from Google KG */
    kgName?: string;
    /** Schema types from Google KG */
    kgSchemaType?: string[];
    /** Error message if search failed */
    error?: string;
    /** Optional index for V2 batch tracking */
    _rowId?: number;
}

/**
 * Parses JSON content from a Wikidata query result file.
 * Expects a standard JSON structure where items are in an array
 * and human labels are provided.
 * 
 * @param jsonContent - Raw JSON string content
 * @returns Array of valid Wikidata items
 */
export function parseWikidataJson(jsonContent: string): WikidataItem[] {
    try {
        const data = JSON.parse(jsonContent);
        if (!Array.isArray(data)) {
            throw new Error("Input must be an array");
        }

        return data.map((item: any, index: number) => {
            let url = "";
            let label = "";

            // Dynamic Key Discovery: Find any pair (key, keyLabel) where key contains a Wikidata ID/URL
            const keys = Object.keys(item);
            for (const key of keys) {
                if (key.endsWith("Label")) {
                    const baseKey = key.slice(0, -5); // e.g. "humanLabel" -> "human"
                    const value = item[baseKey];
                    // Check if base key exists and looks like a QID or Wikidata URL
                    if (value && typeof value === 'string' && (value.includes("/entity/Q") || value.match(/^Q\d+$/))) {
                        url = value;
                        label = item[key];
                        break; // Found valid pair
                    }
                }
            }

            // Fallback: If loop failed, try explicit 'human' or 'item' if they exist but failed validation check above (edge cases)
            if (!url) {
                if (item.human) { url = item.human; label = item.humanLabel || ""; }
                else if (item.item) { url = item.item; label = item.itemLabel || ""; }
            }

            // Extract QID from URL (e.g., http://www.wikidata.org/entity/Q42 -> Q42)
            const qidMatch = url.match(/(Q\d+)$/);
            const qid = qidMatch ? qidMatch[1] : "";

            return {
                qid,
                label: label || "",
                originalUrl: url,
                _rowId: index // Critical for tracking items across status updates
            };
        }).filter(item => item.qid); // Filter out invalid items
    } catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error("Invalid JSON format");
    }
}

export function generateSeparatedQuickStatements(items: WikidataItem[]): { p646: string, p2671: string } {
    const p646Items = items.filter(item => item.kgId && item.kgType === "P646");
    const p2671Items = items.filter(item => item.kgId && item.kgType === "P2671");

    let p646Content = "";
    if (p646Items.length > 0) {
        p646Content = "qid,P646\n" + p646Items.map(item => `${item.qid},"""${item.kgId}"""`).join("\n");
    }

    let p2671Content = "";
    if (p2671Items.length > 0) {
        p2671Content = "qid,P2671\n" + p2671Items.map(item => `${item.qid},"""${item.kgId}"""`).join("\n");
    }

    return { p646: p646Content, p2671: p2671Content };
}
