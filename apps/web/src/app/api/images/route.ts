
import { NextRequest, NextResponse } from 'next/server';
import { getWikimediaImage } from '@/lib/external/wikimedia';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const imageUrl = await getWikimediaImage(query);

    // Return a default placeholder if no image found, or just null
    // Using a 1x1 transparent gif as fallback or just null for frontend to handle
    return NextResponse.json({ url: imageUrl });
}
