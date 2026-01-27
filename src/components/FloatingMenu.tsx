"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

/**
 * FloatingMenu Component
 * 
 * A floating dropdown menu that appears on the right side of the header.
 * Provides navigation between different versions of the app (v1, Optimized, v2)
 * and access to external resources (Wikidata, QS) when relevant.
 * 
 * @param {boolean} isV2 - If true, displays the "Resources" section with external links.
 */
interface FloatingMenuProps {
    isV2?: boolean;
}

export function FloatingMenu({ isV2 = false }: FloatingMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <div className="relative inline-block text-left z-50" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all shadow-md group ${isOpen
                    ? 'bg-slate-800 text-white border-white/20'
                    : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20'
                    }`}
            >
                <span className="text-xl">☰</span>
                <span className="font-semibold text-sm">Menu</span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-64 origin-top-right bg-slate-900 border border-white/10 divide-y divide-white/5 rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-3xl animate-fade-in-down"
                    style={{ animationDuration: '0.2s' }}
                >
                    <div className="p-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Versions</p>
                        <div className="space-y-1">
                            <MenuLink href="/" label="Home (Classic)" icon="🏠" description="Client-side processing" />
                            <MenuLink href="/optimized" label="Optimized" icon="🚀" description="Safe Mode" />
                            <MenuLink href="/v2" label="v2 Batch Cloud" icon="☁️" description="Background Tasks" />
                        </div>
                    </div>

                    {isV2 && (
                        <div className="p-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Resources</p>
                            <div className="space-y-1">
                                <ExternalMenuLink href="https://www.wikidata.org/" label="Wikidata" icon="/assets/wikidata.svg" />
                                <ExternalMenuLink href="https://query.wikidata.org/" label="Query Service" icon="/assets/query-service.svg" iconClass="bg-white rounded-full p-0.5" />
                                <ExternalMenuLink href="https://quickstatements.toolforge.org/" label="QuickStatements" icon="/assets/quickstatements.svg" />
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-white/5 rounded-b-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">About</p>
                        <p className="text-[11px] text-slate-400 px-2 leading-relaxed">
                            GenKgMID bridges Wikidata and the Google Knowledge Graph. Automate the retrieval of IDs (P2671/P646), process large datasets with optimized concurrency or background cloud tasks, and generate QuickStatements CSVs instantly.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function MenuLink({ href, label, icon, description }: { href: string; label: string; icon: string; description?: string }) {
    return (
        <Link href={href} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group">
            <span className="text-lg mt-0.5 group-hover:scale-110 transition-transform">{icon}</span>
            <div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</p>
                {description && <p className="text-[10px] text-slate-500 group-hover:text-slate-400">{description}</p>}
            </div>
        </Link>
    );
}

function ExternalMenuLink({ href, label, icon, iconClass = "" }: { href: string; label: string; icon: string; iconClass?: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group">
            <img src={icon} alt="" className={`w-5 h-5 ${iconClass} group-hover:scale-110 transition-transform`} />
            <span className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</span>
            <span className="ml-auto text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
        </a>
    );
}
