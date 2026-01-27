import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { level, message, data } = body;
    
    const timestamp = new Date().toISOString();
    const prefix = `[MOBILE-DEBUG][${timestamp}][${level || 'INFO'}]`;
    
    console.log(`${prefix} ${message}`);
    if (data) {
      console.log(`${prefix} Data:`, JSON.stringify(data, null, 2));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}