import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Google Knowledge Graph ID Finder",
    description: "Automated tool to find Google Knowledge Graph IDs for Wikidata items. Generate QuickStatements compatbile CSVs instantly.",
    keywords: ["Wikidata", "Google Knowledge Graph", "QuickStatements", "Automation", "Knowledge Graph Search API", "JSON to CSV", "P646", "P2671"],
    authors: [{ name: "Haseeb Afeef", url: "https://github.com/haseebafeef" }],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
