"use client";

import React, { useState, useEffect } from "react";
import { Product } from "./Dashboard";
import { Search, Filter, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface ProductTablePanelProps {
    runId: string;
    selectedProductId: string;
    onProductSelect: (id: string) => void;
}

export function ProductTablePanel({ runId, selectedProductId, onProductSelect }: ProductTablePanelProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<"ALL" | "YES" | "NO">("YES");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/products?runId=${runId}`);
                const data = await res.json();
                setProducts(data);
                if (data.length > 0 && !selectedProductId) {
                    onProductSelect(data[0].product_internal_id);
                }
            } catch (error) {
                console.error("Failed to fetch products:", error);
            } finally {
                setIsLoading(false);
            }
        }
        if (runId) fetchProducts();
    }, [runId, onProductSelect, selectedProductId]);

    const filteredProducts = products.filter((p) => filter === "ALL" || p.needs_review === filter);

    return (
        <div className="glass rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-slate-200">Review Queue</h4>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400">{filteredProducts.length}</span>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {(["YES", "NO", "ALL"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === f ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                {f === "YES" ? "REVIEW" : f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                        <tr className="border-b border-slate-800">
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confidence</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Review</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredProducts.map((p, idx) => (
                            <tr
                                key={`${p.product_internal_id}-${idx}`}
                                onClick={() => onProductSelect(p.product_internal_id)}
                                className={`group cursor-pointer transition-colors ${selectedProductId === p.product_internal_id ? "bg-millennium-teal/5" : "hover:bg-slate-800/30"
                                    }`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 flex-shrink-0">
                                            <img
                                                src={p.product_media_main_image_url}
                                                alt=""
                                                className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-200 truncate">{p.product_name}</p>
                                            <p className="text-[10px] text-slate-500 truncate uppercase mt-0.5">{p.brand}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="w-24">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold ${p.match_confidence >= 0.8 ? "text-millennium-teal" :
                                                p.match_confidence >= 0.6 ? "text-amber-400" : "text-rose-400"
                                                }`}>
                                                {(p.match_confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${p.match_confidence * 100}%` }}
                                                className={`h-full ${p.match_confidence >= 0.8 ? "bg-millennium-teal" :
                                                    p.match_confidence >= 0.6 ? "bg-amber-400" : "bg-rose-400"
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {p.needs_review === "YES" ? (
                                        <AlertCircle className="h-4 w-4 text-amber-500 ml-auto" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-millennium-teal ml-auto" />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
