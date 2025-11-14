import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const tokenId = parseInt(id);

        if (!tokenId || isNaN(tokenId)) {
            return NextResponse.json({ error: 'Valid token ID is required' }, { status: 400 });
        }

        await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));

        return NextResponse.json({ message: 'Token deleted successfully' });
    } catch (error) {
        console.error('Delete token error:', error);
        return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
    }
}
