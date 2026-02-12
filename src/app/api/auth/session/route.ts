import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const sessionCookie = cookies().get('tibbna-session');

  if (!sessionCookie) {
    return NextResponse.json({ session: null });
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ session: null });
  }
}
