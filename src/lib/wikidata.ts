export interface WikidataItem {
    qid: string;
    label: string;
    originalUrl: string;
    kgId?: string; // The found Google Knowledge Graph ID (or Freebase ID)
    kgType?: "P2671" | "P646"; // The type of ID found
    kgDescription?: string; // Description from Google KG for verification
    error?: string; // Error message if search failed
}

export function parseWikidataJson(jsonContent: string): WikidataItem[] {
    try {
        const data = JSON.parse(jsonContent);
        if (!Array.isArray(data)) {
            throw new Error("Input must be an array");
        }

        return data.map((item: any) => {
            const url = item.human || "";
            // Extract QID from URL (e.g., http://www.wikidata.org/entity/Q20656329 -> Q20656329)
            const qidMatch = url.match(/(Q\d+)$/);
            const qid = qidMatch ? qidMatch[1] : "";

            return {
                qid,
                label: item.humanLabel || "",
                originalUrl: url,
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
