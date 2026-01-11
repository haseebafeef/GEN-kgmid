"use server";

import "server-only";

interface KGSearchResult {
    "@id": string;
    name: string;
    description?: string;
    detailedDescription?: {
        articleBody: string;
    };
    score?: number;
}

interface KGResponse {
    itemListElement: Array<{
        result: KGSearchResult;
        resultScore: number;
    }>;
}

export type KGSearchResponse = {
    id: string;
    type: "P2671" | "P646";
    description: string;
    url?: string;
} | null;

// Helper to perform a single fetch
async function fetchKGResult(query: string, apiKey: string, projectId?: string): Promise<KGSearchResponse | null> {
    if (!query || !apiKey) return null;

    try {
        let url = "";
        if (projectId) {
            url = `https://enterpriseknowledgegraph.googleapis.com/v1/projects/${projectId}/locations/global/publicKnowledgeGraphEntities:Search?query=${encodeURIComponent(query)}&limit=1&key=${apiKey}`;
        } else {
            url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&limit=1&key=${apiKey}`;
        }

        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'User-Agent': 'WikidataAutomationTool/1.0' }
        });

        if (!response.ok) {
            // Log error but don't throw to avoid crashing the whole Promise.all chain if one request fails gently
            // console.error(`KG API Error: ${response.status} ${response.statusText}`); 
            return null;
        }

        const data: KGResponse = await response.json();

        if (data.itemListElement && data.itemListElement.length > 0) {
            const result = data.itemListElement[0].result;
            const rawId = result["@id"];
            const description = result.description || result.detailedDescription?.articleBody || "No description found";

            const cleanId = rawId.replace(/^kg:/, "");
            const responseObj = { id: cleanId, description };

            if (cleanId.startsWith("/m/")) {
                return { ...responseObj, type: "P646" };
            } else if (cleanId.startsWith("/g/")) {
                return { ...responseObj, type: "P2671" };
            } else {
                return { ...responseObj, type: "P2671" };
            }
        }
        return null;
    } catch (error) {
        console.error("Error searching KG:", error);
        return null;
    }
}

export async function searchGoogleKGAction(label: string, apiKey: string, projectId: string = "", qid: string = "", strictMode: boolean = false): Promise<KGSearchResponse> {
    // 1. Search by Human Label
    const labelResult = await fetchKGResult(label, apiKey, projectId);

    if (!labelResult) return null;

    // 2. If Strict Mode is ON and QID is provided, perform strict "Double Verification"
    if (strictMode && qid) {
        // Small delay to prevent hitting rate limits too hard with the second request immediately
        // await new Promise(r => setTimeout(r, 50)); 

        const qidResult = await fetchKGResult(qid, apiKey, projectId);

        // Strict Match: The ID found via Label MUST match the ID found via QID
        if (qidResult && qidResult.id === labelResult.id) {
            return labelResult;
        } else {
            return null; // Mismatch or QID search failed -> Reject match in strict mode
        }
    }

    // Fallback if no QID provided or Strict Mode is OFF
    return labelResult;
}
