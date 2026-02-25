import { NextRequest, NextResponse } from 'next/server';
import { readCsv, fixImageUrl } from '@/lib/csv';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const runId = searchParams.get('runId');

        const products = readCsv('inventory_export.csv');

        // Deduplicate: Keep only the latest entry for each product_internal_id
        const uniqueProductsMap = new Map();
        products.forEach((p: any) => {
            uniqueProductsMap.set(String(p.product_internal_id), p);
        });
        const uniqueProducts = Array.from(uniqueProductsMap.values());

        const mappedProducts = uniqueProducts.map((p: any) => ({
            product_internal_id: p.product_internal_id,
            run_id: runId || 'latest',
            brand: p.brand,
            product_name: p.product_name,
            needs_review: p.needs_review,
            match_found: p.match_found === 'TRUE' || p.match_found === true,
            match_confidence: parseFloat(p.match_confidence) || 0,
            product_media_main_image_url: fixImageUrl(p.product_media_main_image_url),
            product_supplier_url: p.product_supplier_url,
            product_cost_price: p.product_cost_price,
            product_compare_to_price: p.product_compare_to_price,
        }));

        return NextResponse.json(mappedProducts);
    } catch (error) {
        console.error('API Error /api/products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
