import { NextRequest, NextResponse } from 'next/server';

const COIN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset') ?? 'ETH';
  const days = searchParams.get('days') ?? '30';

  const coinId = COIN_IDS[asset];
  if (!coinId) {
    return NextResponse.json({ error: 'Unknown asset' }, { status: 400 });
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing COINGECKO_API_KEY' }, { status: 500 });
  }

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&x_cg_demo_api_key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `CoinGecko error: ${res.status}`, detail: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
