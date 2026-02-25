import { NextRequest, NextResponse } from 'next/server';
import { readCsv, fixImageUrl } from '@/lib/csv';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;

        // 1. Get Export Row from CSV (Deduplicate or find latest)
        const allProducts = readCsv('inventory_export.csv');
        // Type-safe search (convert CSV ID to string)
        const exportRow = allProducts.reverse().find((p: any) => String(p.product_internal_id) === productId);

        if (!exportRow) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // 2. Load Agent A/B (Checkpoint) and Agent C (Match) data
        const checkpointPath = path.join(PROJECT_ROOT, `checkpoint_${productId}.json`);
        const matchPath = path.join(PROJECT_ROOT, `match_${productId}.json`);

        let raw = {};
        let inference = {};
        let match = {};

        if (fs.existsSync(checkpointPath)) {
            const cpData = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
            raw = cpData.raw || {};
            inference = cpData.inference || {};
            // Fix dead CDN URLs in image_urls array
            if ((raw as any).image_urls) {
                (raw as any).image_urls = (raw as any).image_urls.map((u: string) => fixImageUrl(u));
            }
        }

        if (fs.existsSync(matchPath)) {
            match = JSON.parse(fs.readFileSync(matchPath, 'utf-8'));
        }

        // Fix dead CDN URLs in export_row image fields
        const fixedExportRow = { ...exportRow };
        for (const key of Object.keys(fixedExportRow)) {
            if (key.includes('image_url') && typeof fixedExportRow[key] === 'string') {
                fixedExportRow[key] = fixImageUrl(fixedExportRow[key]);
            }
        }

        return NextResponse.json({
            run_id: 'latest', // Placeholder
            raw,
            inference,
            match,
            export_row: fixedExportRow
        });
    } catch (error) {
        console.error('API Error /api/product/[id]:', error);
        return NextResponse.json({ error: 'Failed to fetch product details' }, { status: 500 });
    }
}
