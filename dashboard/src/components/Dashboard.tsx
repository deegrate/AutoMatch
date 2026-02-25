"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { SidePipeline } from "./SidePipeline";
import { RunOverviewPanel } from "./RunOverviewPanel";
import { ProductTablePanel } from "./ProductTablePanel";
import { MatchInspectorPanel } from "./MatchInspectorPanel";
import { motion, AnimatePresence } from "framer-motion";

export interface Run {
    run_id: string;
    started_at: string;
    total_products: number;
    matched_products: number;
    needs_review_yes: number;
    avg_match_confidence: number;
}

export interface Product {
    product_internal_id: string;
    brand: string;
    product_name: string;
    match_confidence: number;
    match_found: boolean;
    needs_review: string;
    product_media_main_image_url: string;
}

export default function Dashboard() {
    const [runs, setRuns] = useState<Run[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string>("");
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRuns() {
            try {
                const res = await fetch("/api/runs");
                const data = await res.json();
                setRuns(data);
                if (data.length > 0) {
                    setSelectedRunId(data[0].run_id);
                }
            } catch (error) {
                console.error("Failed to fetch runs:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchRuns();
    }, []);

    const selectedRun = runs.find((r) => r.run_id === selectedRunId);

    return (
        <div className="flex h-screen w-full bg-millennium-bg">
            <SidePipeline selectedRun={selectedRun} />

            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar
                    runs={runs}
                    selectedRunId={selectedRunId}
                    onRunSelect={setSelectedRunId}
                />

                <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="mx-auto max-w-[1600px] space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedRunId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <RunOverviewPanel run={selectedRun} />
                            </motion.div>
                        </AnimatePresence>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-7">
                                <ProductTablePanel
                                    runId={selectedRunId}
                                    selectedProductId={selectedProductId}
                                    onProductSelect={setSelectedProductId}
                                />
                            </div>
                            <div className="lg:col-span-5">
                                <MatchInspectorPanel productId={selectedProductId} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
