"use client";

import React from "react";
import { Search, Download, Play, ChevronDown } from "lucide-react";
import { Run } from "./Dashboard";

interface TopBarProps {
    runs: Run[];
    selectedRunId: string;
    onRunSelect: (id: string) => void;
}

export function TopBar({ runs, selectedRunId, onRunSelect }: TopBarProps) {
    return (
        <header className="glass flex h-16 items-center justify-between px-6 z-20">
            <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded bg-gradient-to-br from-millennium-teal to-millennium-violet flex items-center justify-center font-bold text-white">A</div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        AutoMatch
                    </span>
                </div>

                <div className="relative group">
                    <select
                        value={selectedRunId}
                        onChange={(e) => onRunSelect(e.target.value)}
                        className="appearance-none bg-slate-900/40 border border-slate-800 rounded-lg py-1.5 pl-3 pr-10 text-sm font-medium hover:border-millennium-teal transition-colors focus:outline-none focus:ring-1 focus:ring-millennium-teal cursor-pointer"
                    >
                        {runs.map((run) => (
                            <option key={run.run_id} value={run.run_id}>
                                {run.run_id}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800 text-sm font-medium hover:border-slate-700 transition-all">
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-millennium-teal/10 border border-millennium-teal/30 text-millennium-teal text-sm font-semibold hover:bg-millennium-teal/20 transition-all shadow-[0_0_15px_-3px_rgba(45,212,191,0.3)]">
                    <Play className="h-4 w-4 fill-current" />
                    <span>Run New Batch</span>
                </button>
            </div>
        </header>
    );
}
