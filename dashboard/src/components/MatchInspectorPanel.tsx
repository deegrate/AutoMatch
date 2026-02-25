"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Info, Image as ImageIcon, AlertTriangle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MatchInspectorPanelProps {
    productId: string;
}

export function MatchInspectorPanel({ productId }: MatchInspectorPanelProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchDetails() {
            if (!productId) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/product/${productId}`);
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error("Failed to fetch product details:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDetails();
    }, [productId]);

    if (!productId) {
        return (
            <div className="glass rounded-2xl h-[600px] flex items-center justify-center text-slate-500">
                <p className="text-sm">Select a product to inspect</p>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="glass rounded-2xl h-[600px] animate-pulse p-8 space-y-4">
                <div className="h-8 w-1/3 bg-slate-800 rounded" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-40 bg-slate-800 rounded" />
                    <div className="h-40 bg-slate-800 rounded" />
                </div>
            </div>
        );
    }

    const { raw, inference, match, export_row } = data;
    const confidence = match?.match_confidence || 0;

    // Logic to pick a better wholesale image (skip logos)
    const allImages = raw?.image_urls || [];
    const mainWholesaleImage = export_row?.product_media_main_image_url ||
        allImages.find((img: string) => !img.includes('logo')) ||
        allImages[0];

    return (
        <div className="glass rounded-2xl h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200">Match Inspector</h4>
                <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${confidence >= 0.8 ? "bg-millennium-teal/20 text-millennium-teal" :
                        confidence >= 0.6 ? "bg-amber-500/20 text-amber-500" : "bg-rose-500/20 text-rose-500"
                        }`}>
                        {(confidence * 100).toFixed(0)}% Confidence
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Comparison Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Wholesale View */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wholesale (QiQiYG)</p>
                        <div className="aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative group">
                            <img
                                src={mainWholesaleImage}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-[10px] text-white truncate">{raw?.title}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-slate-500">Internal ID</span>
                                <span className="text-[10px] font-mono text-slate-300">{raw?.product_internal_id}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-slate-500">Price</span>
                                <span className="text-[10px] font-bold text-slate-300">{raw?.raw_price_text || "N/A"}</span>
                            </div>
                            <a href={raw?.product_page_url} target="_blank" className="flex items-center space-x-1 text-[10px] text-millennium-teal hover:underline pt-1">
                                <span>View Source</span>
                                <ExternalLink className="h-2 w-2" />
                            </a>
                        </div>
                    </div>

                    {/* Official View */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Official Match</p>
                        <div className={`aspect-square rounded-xl bg-slate-950 border overflow-hidden relative ${match?.match_found ? "border-millennium-teal/30" : "border-slate-800"
                            }`}>
                            {match?.official_main_image_url ? (
                                <img src={match.official_main_image_url} alt="" className="h-full w-full object-cover" />
                            ) : match?.match_found ? (
                                <a href={match.official_page_url} target="_blank" rel="noopener noreferrer"
                                    className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-millennium-teal/10 to-slate-900/40 hover:from-millennium-teal/20 transition-colors cursor-pointer">
                                    <CheckCircle className="h-8 w-8 mb-2 text-millennium-teal" />
                                    <span className="text-sm font-bold text-millennium-teal">{Math.round((match.match_confidence || 0) * 100)}% Match</span>
                                    <span className="text-[10px] text-slate-400 mt-1 px-4 text-center">{match.official_product_name}</span>
                                    <span className="text-[10px] text-millennium-teal/80 mt-2 underline">View on Store →</span>
                                </a>
                            ) : (
                                <div className="h-full w-full flex flex-col items-center justify-center text-slate-700 bg-slate-900/20">
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <span className="text-[10px]">No match found</span>
                                </div>
                            )}
                            {match?.match_found && (
                                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-millennium-teal flex items-center justify-center text-white shadow-lg">
                                    <CheckCircle className="h-3 w-3" />
                                </div>
                            )}
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-slate-500">Brand</span>
                                <span className="text-[10px] font-bold text-slate-300">{match?.official_brand || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-slate-500">Price</span>
                                <span className="text-[10px] font-bold text-millennium-teal">{match?.official_price || "N/A"}</span>
                            </div>
                            {match?.official_page_url && (
                                <a href={match.official_page_url} target="_blank" className="flex items-center space-x-1 text-[10px] text-millennium-violet hover:underline pt-1">
                                    <span>View Official</span>
                                    <ExternalLink className="h-2 w-2" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes & Diff */}
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-inner">
                        <div className="flex items-center space-x-2 mb-2">
                            <Info className="h-3 w-3 text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Matching Analysis</p>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                            {match?.notes || "No analysis notes available for this product."}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-millennium-violet/5 border border-millennium-violet/10">
                        <div className="flex items-center space-x-2 mb-3">
                            <AlertTriangle className="h-3 w-3 text-millennium-violet" />
                            <p className="text-[10px] font-bold text-millennium-violet uppercase tracking-[2px]">Inference Signals</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">Predicted Category</span>
                                <span className="text-[10px] font-bold text-slate-400">{inference?.inferred_category || "Uncategorized"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">Predicted Brand</span>
                                <span className="text-[10px] font-bold text-slate-400">{inference?.inferred_brand || "Unknown"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/20">
                <button className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors">
                    Mark as Verified
                </button>
            </div>
        </div>
    );
}
