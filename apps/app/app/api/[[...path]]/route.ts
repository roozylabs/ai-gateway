import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendApiUrl(): string {
  const url = process.env.API_URL || 'http://api:8080';
  return url.replace(/\/+$/, '');
}

function sanitizeTargetUrl(url: string, req: NextRequest): string {
  try {
    const parsed = new URL(url);
    const hostHeader = req.headers.get('host') || 'app.prism.roozylabs.com';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${hostHeader}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

async function proxyHandler(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const resolvedParams = await params;
  const pathArray = resolvedParams?.path || [];
  const subPath = pathArray.join('/');
  const searchParams = request.nextUrl.search;

  const backendApiUrl = getBackendApiUrl();
  
  // Clean proxy: map /api/* directly to backendApiUrl/api/*
  const targetUrl = subPath === 'health'
    ? `${backendApiUrl}/health${searchParams}`
    : `${backendApiUrl}/api/${subPath}${searchParams}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const token = request.cookies.get('auth_token')?.value;
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  let body: ArrayBuffer | undefined = undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      body = await request.arrayBuffer();
    } catch (_bodyErr) {
      body = undefined;
    }
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store',
    });

    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    const contentType = responseHeaders.get('content-type') || '';
    const isEventStream = contentType.includes('text/event-stream') || subPath.includes('sse');
    const isNoBodyStatus = backendResponse.status === 204 || backendResponse.status === 304;

    if (isEventStream) {
      responseHeaders.set('Content-Type', 'text/event-stream');
      responseHeaders.set('Cache-Control', 'no-cache, no-transform');
      responseHeaders.set('Connection', 'keep-alive');
      responseHeaders.set('X-Accel-Buffering', 'no');

      return new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    }

    if (isNoBodyStatus) {
      return new NextResponse(null, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    }

    const responseData = await backendResponse.arrayBuffer();
    return new NextResponse(responseData, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    console.error('[API Proxy Error] Failed to proxy to:', targetUrl, error);
    const sanitizedUrl = sanitizeTargetUrl(targetUrl, request);
    return NextResponse.json(
      { error: 'Failed to connect to API backend', details: message, targetUrl: sanitizedUrl },
      { status: 502 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
export const OPTIONS = proxyHandler;
