import { NextResponse } from 'next/server';
import { readCsv } from '@/lib/csv';

export async function GET() {
    try {
        const runs = readCsv('runs_log.csv');
        // Sort by started_at descending
        const sortedRuns = [...runs].sort((a: any, b: any) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        return NextResponse.json(sortedRuns);
    } catch (error) {
        console.error('API Error /api/runs:', error);
        return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }
}
