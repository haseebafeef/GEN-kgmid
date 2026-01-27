import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { SpeedInsights } from "@vercel/speed-insights/next";

import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Google Knowledge Graph ID Finder",
    description: "Automated tool to find Google Knowledge Graph IDs for Wikidata items. Generate QuickStatements compatbile CSVs instantly.",
    keywords: ["GenKgMID", "Gen-KgMID", "GEN-kgmid", "Wikidata", "Google Knowledge Graph", "QuickStatements", "Automation", "Knowledge Graph Search API", "JSON to CSV", "P646", "P2671"],
    authors: [{ name: "Haseeb Afeef", url: "https://github.com/haseebafeef" }],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}
