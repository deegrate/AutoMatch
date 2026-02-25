"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Run } from "./Dashboard";
import { motion } from "framer-motion";

interface RunOverviewPanelProps {
    run?: Run;
}

export function RunOverviewPanel({ run }: RunOverviewPanelProps) {
    if (!run) return null;

    // Mock data for confidence distribution (since we don't have it in the CSV yet)
    const chartData = [
        { range: "< 0.6", count: run.needs_review_yes },
        { range: "0.6-0.8", count: Math.round(run.matched_products * 0.2) },
        { range: "0.8-1.0", count: run.matched_products - Math.round(run.matched_products * 0.2) },
    ];

    const metrics = [
        { label: "Total Products", value: run.total_products, color: "text-white" },
        { label: "Matched Products", value: run.matched_products, color: "text-millennium-teal" },
        { label: "Needs Review", value: run.needs_review_yes, color: "text-amber-400" },
        { label: "Avg Confidence", value: `${(run.avg_match_confidence * 100).toFixed(1)}%`, color: "text-millennium-violet" },
    ];

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, idx) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="glass p-5 rounded-2xl relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <div className="h-12 w-12 rounded-full border-4 border-white" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{metric.label}</p>
                        <h3 className={`text-2xl font-bold mt-1 ${metric.color}`}>{metric.value}</h3>
                    </motion.div>
                ))}

                <div className="glass col-span-full h-64 rounded-2xl p-6 flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-400 mb-4">Confidence Distribution</h4>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }}
                                />
                                <Bar dataKey="count" fill="url(#colorTeal)" radius={[4, 4, 0, 0]} />
                                <defs>
                                    <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="glass rounded-2xl p-6 flex flex-col">
                <h4 className="text-sm font-semibold text-slate-400 mb-4">Top Brands</h4>
                <div className="flex flex-wrap gap-2">
                    {["Marc Jacobs", "Gucci", "LV", "Coach", "Prada"].map((brand, i) => (
                        <span key={brand} className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-medium text-slate-300 hover:border-millennium-teal/50 transition-colors cursor-default">
                            {brand}
                        </span>
                    ))}
                </div>
                <div className="mt-auto pt-6">
                    <div className="p-4 rounded-xl bg-millennium-teal/5 border border-millennium-teal/10">
                        <p className="text-[10px] uppercase font-bold text-millennium-teal tracking-widest mb-1">Efficiency</p>
                        <p className="text-xl font-mono text-slate-100 italic">{(run.matched_products / run.total_products * 100 || 0).toFixed(0)}% <span className="text-xs not-italic text-slate-500 font-sans ml-1">Automated</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
