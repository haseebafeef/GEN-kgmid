"use server";

import "server-only";

interface KGSearchResult {
    "@id": string;
    "@type"?: string[];
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
    name: string;
    schemaType?: string[];
    url?: string;
} | null;

/**
 * Fetches entities from Google Knowledge Graph API.
 * 
 * @param query - The search query string.
 * @param apiKey - The Google Cloud API key.
 * @param projectId - Optional Google Cloud Project ID for Enterprise KG.
 * @param limit - Number of results to fetch (default 1).
 * @returns Array of structured KG search responses.
 */
async function fetchKGResults(query: string, apiKey: string, projectId?: string, limit: number = 1): Promise<KGSearchResponse[]> {
    if (!query || !apiKey) return [];

    try {
        let url = "";
        if (projectId) {
            url = `https://enterpriseknowledgegraph.googleapis.com/v1/projects/${projectId}/locations/global/publicKnowledgeGraphEntities:Search?query=${encodeURIComponent(query)}&limit=${limit}&key=${apiKey}`;
        } else {
            url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&limit=${limit}&key=${apiKey}`;
        }

        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'User-Agent': 'GenKgMID/2.0.0 (+https://github.com/haseebafeef/gen-kgmid)' }
        });

        if (response.status === 429) {
            throw new Error("429 Rate Limit");
        }

        if (!response.ok) {
            return [];
        }

        const data: KGResponse = await response.json();

        if (data.itemListElement && data.itemListElement.length > 0) {
            return data.itemListElement.map(item => {
                const result = item.result;
                const rawId = result["@id"];
                const description = result.description || result.detailedDescription?.articleBody || "No description found";
                const name = result.name || "";
                const types = result["@type"] || [];

                const cleanId = rawId.replace(/^kg:/, "");
                const responseObj = { id: cleanId, description, name, schemaType: types };

                let type: "P646" | "P2671" = "P2671"; // Default to KG ID (P2671)

                if (cleanId.startsWith("/m/")) {
                    type = "P646"; // Freebase ID
                }

                return { ...responseObj, type };
            });
        }
        return [];
    } catch (error: any) {
        if (error.message === "429 Rate Limit") {
            throw error;
        }
        console.error("Error searching KG:", error);
        return [];
    }
}

// Options interface for clearer arguments
interface SearchOptions {
    projectId?: string;
    qid?: string;
    strictMode?: boolean;
    useQidOnly?: boolean;
}

/**
 * Server Action to search the Google Knowledge Graph.
 * 
 * Supports three modes:
 * 1. Label Search: Standard search by name.
 * 2. QID-Only: Fetches entity details using known QID (if mapped in cache/logic).
 * 3. Strict Mode: Performs "Deep Verification" - searches by QID first, then Label, requiring cross-match.
 * 
 * @param label - The human-readable label to search for.
 * @param apiKey - Google Cloud API Key.
 * @param options - Configuration options (projectId, qid, strictMode).
 */
export async function searchGoogleKGAction(
    label: string,
    apiKey: string,
    options: SearchOptions = {}
): Promise<KGSearchResponse> {
    const { projectId = "", qid = "", strictMode = false, useQidOnly = false } = options;

    // Mode 0: Direct QID Lookup
    // If a specific QID is provided and QID-only mode is active, strictly fetch that entity.
    if (useQidOnly) {
        if (qid) {
            const results = await fetchKGResults(qid, apiKey, projectId, 1);
            return results.length > 0 ? results[0] : null;
        } else {
            return null; // Bypass label search if QID is missing in strict mode
        }
    }

    // Mode 1: Strict Verification (Deep Check)
    // Verifies that the entity for the provided QID matches the searched label.
    if (strictMode && qid) {
        // Step A: Retrieve entity candidates for the QID
        const qidResults = await fetchKGResults(qid, apiKey, projectId, 3);

        if (qidResults.length === 0) {
            return null; // Invalid or non-existent QID
        }

        // Fast lookup set for QID candidates
        // Prioritize QID result order when matching against label results

        // Step B: Search by Label (Limit 10)
        const labelResults = await fetchKGResults(label, apiKey, projectId, 10);

        for (const qRes of qidResults) {
            for (const lRes of labelResults) {
                if (qRes && lRes && qRes.id === lRes.id) {
                    return lRes; // Successful Match
                }
            }
        }

        return null;
    }

    // 2. Standard Label Search (Fallback)
    const labelResults = await fetchKGResults(label, apiKey, projectId, 1);
    return labelResults.length > 0 ? labelResults[0] : null;
}

export interface BackgroundImage {
    url: string;
    title: string;
    artist: string;
    artistUrl: string;
    license: string;
    licenseUrl: string;
    attributionUrl: string;
}

export async function fetchRandomBackgroundAction(): Promise<BackgroundImage | null> {
    try {
        const categories = [
            "Category:Featured_pictures_of_castles_in_Germany",
            "Category:Featured_pictures_of_castles_in_France",
            "Category:Featured_pictures_of_castles_in_Spain",
            "Category:Featured_pictures_of_lighthouses",
            "Category:Featured_pictures_of_towers"
        ];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        console.log("Fetching background from category:", randomCategory);

        const params = new URLSearchParams({
            action: "query",
            generator: "categorymembers",
            gcmtitle: randomCategory,
            gcmnamespace: "6", // Files
            gcmlimit: "50",
            prop: "imageinfo",
            iiprop: "url|extmetadata",
            iiurlwidth: "2560", // Request a scaled version (2560px width) to prevent loading massive originals
            format: "json",
            origin: "*",
            uselang: "en" // Request English descriptions
        });

        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GenKgMID/2.0.0; +https://github.com/haseebafeef/gen-kgmid)'
            },
            // Next.js specific fetch options
            next: { revalidate: 0 } as NextFetchRequestConfig
        });

        if (!response.ok) {
            console.error("Wikimedia API Status Error:", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        const pages = data?.query?.pages;

        if (!pages) {
            console.warn("No pages found in Wikimedia response for category:", randomCategory);
            return null;
        }

        const pageIds = Object.keys(pages);
        if (pageIds.length === 0) return null;

        // Select random image
        const randomPageId = pageIds[Math.floor(Math.random() * pageIds.length)];
        const page = pages[randomPageId];
        const imageInfo = page?.imageinfo?.[0];

        if (!imageInfo) return null;

        const metadata = imageInfo.extmetadata;

        // Use the scaled 'thumburl' if available, otherwise fallback to 'url'
        const imageUrl = imageInfo.thumburl || imageInfo.url;

        // Title Extraction: Prioritize ImageDescription, fallback to ObjectName/PageTitle
        let title = metadata?.ObjectName?.value || page.title;
        if (metadata?.ImageDescription?.value) {
            let desc = metadata.ImageDescription.value;
            // Clean HTML tags
            desc = desc.replace(/<[^>]+>/g, "").trim();
            // Remove standard language prefixes (e.g. "English:")
            desc = desc.replace(/^English:\s*/i, "");

            // Validate description length
            if (desc && desc.length < 300) {
                title = desc;
            }
        }

        // Extract Artist Name and URL from HTML
        let artistName = "Unknown";
        let artistUrl = "";

        if (metadata?.Artist?.value) {
            const artistHtml = metadata.Artist.value;
            // Try to extract name (strip tags)
            artistName = artistHtml.replace(/<[^>]+>/g, "").trim();

            // Try to extract URL
            const urlMatch = artistHtml.match(/href=\s*["']([^"']+)["']/i);
            if (urlMatch && urlMatch[1]) {
                artistUrl = urlMatch[1];
                // Fix protocol-relative URLs
                if (artistUrl.startsWith("//")) {
                    artistUrl = "https:" + artistUrl;
                }
            }
        }

        return {
            url: imageUrl,
            title: title,
            artist: artistName,
            artistUrl: artistUrl,
            license: metadata?.LicenseShortName?.value || "Unknown License",
            licenseUrl: metadata?.LicenseUrl?.value || "",
            attributionUrl: imageInfo.descriptionurl || ""
        };

    } catch (error) {
        console.error("Error fetching background:", error);
        return null;
    }
}
