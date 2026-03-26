import { NextResponse } from 'next/server';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl : '';
  const targetHeaders = isPlainObject(body.targetHeaders)
    ? (body.targetHeaders as Record<string, string>)
    : {};
  const targetBody = body.targetBody;

  if (!targetUrl) {
    return NextResponse.json(
      { error: { message: 'targetUrl is required.' } },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...targetHeaders,
      },
      body: JSON.stringify(targetBody),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy request failed';
    return NextResponse.json(
      { error: { message: `LLM proxy error: ${message}` } },
      { status: 502 },
    );
  }
}
