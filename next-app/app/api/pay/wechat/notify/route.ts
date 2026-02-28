import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await request.text(); // consume body (XML)
  const xml =
    "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
