import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');

export function readCsv(filename: string) {
    const filePath = path.join(PROJECT_ROOT, filename);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        cast: true,
    });
}

export interface RunLog {
    run_id: string;
    started_at: string;
    finished_at: string;
    supplier_name: string;
    total_products: number;
    matched_products: number;
    needs_review_yes: number;
    needs_review_no: number;
    avg_match_confidence: number;
    min_match_confidence: number;
    max_match_confidence: number;
    discover_limit?: number;
}

export interface ProductResult {
    category_id: string;
    product_internal_id: string;
    brand: string;
    product_name: string;
    product_sku: string;
    product_description: string;
    product_supplier: string;
    product_supplier_url: string;
    product_cost_price: string;
    product_compare_to_price: string;
    product_price: string;
    product_media_main_image_url: string;
    [key: string]: any; // Allow for gallery images
    needs_review: string;
}

/**
 * Rewrites image URLs from the dead pic.qiqi2000.com CDN
 * to the working bags.qiqiyg.com mirror.
 * The path structure is identical on both domains.
 */
export function fixImageUrl(url: string | undefined | null): string {
    if (!url) return '';
    return url.replace('https://pic.qiqi2000.com/', 'https://bags.qiqiyg.com/');
}
