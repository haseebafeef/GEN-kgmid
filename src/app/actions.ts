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

export type KGSearchResponse = { id: string; type: "P2671" | "P646" } | null;

export async function searchGoogleKGAction(query: string, apiKey: string, projectId?: string): Promise<KGSearchResponse> {
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
            headers: {
                'User-Agent': 'WikidataAutomationTool/1.0'
            }
        });

        if (!response.ok) {
            console.error(`KG API Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Body:", text);
            // Try to parse JSON error if possible
            try {
                const errJson = JSON.parse(text);
                if (errJson.error && errJson.error.message) {
                    throw new Error(errJson.error.message);
                }
            } catch (e) {
                // ignore json parse error
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data: KGResponse = await response.json();

        if (data.itemListElement && data.itemListElement.length > 0) {
            const result = data.itemListElement[0].result;
            const rawId = result["@id"];

            const cleanId = rawId.replace(/^kg:/, "");

            if (cleanId.startsWith("/m/")) {
                return { id: cleanId, type: "P646" };
            } else if (cleanId.startsWith("/g/")) {
                return { id: cleanId, type: "P2671" };
            } else {
                return { id: cleanId, type: "P2671" };
            }
        }

        return null;
    } catch (error) {
        console.error("Error searching KG:", error);
        // Rethrow to let the client know something went wrong? Or just return null.
        // For now, let's just log and return null, but maybe better to propagate error message?
        throw error;
    }
}
