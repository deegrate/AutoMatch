"use client";

import React from "react";
import { Database, Eye, Search, FileOutput } from "lucide-react";
import { Run } from "./Dashboard";

interface SidePipelineProps {
    selectedRun?: Run;
}

export function SidePipeline({ selectedRun }: SidePipelineProps) {
    const stages = [
        { id: "scrape", label: "Scrape", icon: Database, status: "completed" },
        { id: "vision", label: "Vision", icon: Eye, status: "completed" },
        { id: "match", label: "Match", icon: Search, status: "completed" },
        { id: "export", label: "Export", icon: FileOutput, status: "completed" },
    ];

    return (
        <aside className="w-20 lg:w-64 border-r border-slate-800 bg-slate-950/50 flex flex-col items-center py-6 px-4 shrink-0">
            <div className="flex-1 w-full space-y-12 mt-8 relative">
                {/* Continuous gradient line */}
                <div className="absolute left-[23px] lg:left-8 top-4 bottom-4 w-[2px] bg-slate-800" />
                <div className="absolute left-[23px] lg:left-8 top-4 h-[75%] w-[2px] bg-gradient-to-b from-millennium-teal to-millennium-violet shadow-[0_0_10px_rgba(45,212,191,0.5)]" />

                {stages.map((stage, idx) => (
                    <div key={stage.id} className="relative flex items-center lg:space-x-4">
                        <div className={`relative z-10 h-12 w-12 rounded-full flex items-center justify-center transition-all ${stage.status === "completed"
                                ? "bg-slate-900 border-2 border-millennium-teal text-millennium-teal shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                                : "bg-slate-950 border-2 border-slate-800 text-slate-600"
                            }`}>
                            <stage.icon className="h-5 w-5" />
                        </div>
                        <div className="hidden lg:block">
                            <p className={`text-sm font-bold uppercase tracking-wider ${stage.status === "completed" ? "text-slate-200" : "text-slate-600"
                                }`}>
                                {stage.label}
                            </p>
                            {stage.id === "export" && selectedRun && (
                                <p className="text-xs text-slate-500">{selectedRun.total_products} items</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto hidden lg:block p-4 border border-slate-800/50 rounded-xl bg-slate-900/40 text-xs text-slate-500">
                <p className="font-semibold text-slate-400 mb-1">Engine Status</p>
                <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-millennium-teal animate-pulse" />
                    <span>v1.0.4 Online</span>
                </div>
            </div>
        </aside>
    );
}
