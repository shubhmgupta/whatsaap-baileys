import { NextResponse } from 'next/server';
import { POST as sendMessagePost, OPTIONS as sendMessageOptions } from '@/app/api/v1/message/send/route';
import { GET as incomingMessagesGet } from '@/app/api/v1/messages/incoming/route';
import { GET as contactMessagesGet } from '@/app/api/v1/contacts/messages/route';

export async function OPTIONS() {
  return sendMessageOptions();
}

export async function POST(request: Request) {
  return sendMessagePost(request);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get('phoneNumber');

  if (phoneNumber) {
    // If phone number is specified, fetch contact messages history
    return contactMessagesGet(request);
  }

  // Otherwise, return incoming messages
  return incomingMessagesGet(request);
}

