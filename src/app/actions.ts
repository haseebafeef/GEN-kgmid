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
            format: "json",
            origin: "*",
            uselang: "en" // Ensure we get English descriptions where possible
        });

        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GenKgMID/1.0; +https://github.com/haseebafeef)'
            },
            next: { revalidate: 0 } // No cache for random images
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

        // Extract Title: Prefer ImageDescription (caption) over ObjectName
        let title = metadata?.ObjectName?.value || page.title;
        if (metadata?.ImageDescription?.value) {
            let desc = metadata.ImageDescription.value;
            // Strip HTML tags
            desc = desc.replace(/<[^>]+>/g, "").trim();
            // Remove common language prefixes like "English:" usually added by Commons
            desc = desc.replace(/^English:\s*/i, "");

            // Use description if it's a reasonable length (e.g. not a whole essay)
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
            url: imageInfo.url,
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
