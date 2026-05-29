import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { asset, assetName, tf, prices } = await req.json();

    if (!asset || !prices || !Array.isArray(prices)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const priceList = (prices as number[])
      .map((p: number) => p.toFixed(2))
      .join(', ');

    const prompt = `Anda adalah analis kripto profesional. Berikut adalah data pergerakan harga ${assetName} (${asset}) dalam ${tf} terakhir (dalam USD):

[${priceList}]

Berikan analisis teknikal mendalam berdasarkan tren data di atas. Fokus pada momentum pasar dan pola pergerakan harga.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `Anda adalah API analis kripto profesional. Anda HANYA boleh merespons dengan satu objek JSON yang valid. Jangan gunakan blok kode markdown. Jangan berikan teks penjelasan apa pun di luar JSON.

Struktur JSON wajib seperti ini (semua field wajib diisi):
{
  "signal": "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL",
  "type": "buy" | "hold" | "sell",
  "text": "Analisis naratif 2-3 kalimat menjelaskan kondisi pasar, tren momentum, dan faktor teknikal kunci dalam bahasa Indonesia.",
  "target": "$angka",
  "support": "$angka",
  "conf": angka_integer_antara_50_dan_95,
  "rsi": "angka_desimal_string",
  "macd": "deskripsi_singkat_dalam_bahasa_inggris"
}

Gunakan hanya nilai "buy" atau "sell" atau "hold" untuk field "type". Target dan support harus berdasarkan analisis data harga yang diberikan.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: 'Invalid JSON from AI', raw }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
