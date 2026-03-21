import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd',
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Price fetch proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price', details: error.message },
      { status: 500 }
    );
  }
}
