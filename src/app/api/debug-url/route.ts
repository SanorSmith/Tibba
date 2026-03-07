import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const pathParts = pathname.split('/');
  
  return NextResponse.json({
    pathname,
    pathParts,
    lastPart: pathParts[pathParts.length - 1],
    searchParams: Object.fromEntries(url.searchParams)
  });
}
