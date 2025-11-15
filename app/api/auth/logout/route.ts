import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Don't disconnect WhatsApp when user logs out from web app
    // WhatsApp connection should persist until user explicitly disconnects
    
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear the authentication token cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to logout. Please try again.' }, { status: 500 });
  }
}
