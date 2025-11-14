import { NextResponse } from 'next/server';
import { logoutSession } from '@/lib/baileys';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await logoutSession(userId.toString());

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to logout. Please try again.' }, { status: 500 });
  }
}
