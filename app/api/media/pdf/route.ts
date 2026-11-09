import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const download = searchParams.get('download') === 'true';
    const customFileName = searchParams.get('filename');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let pdfBuffer: ArrayBuffer;
    let fileName = customFileName ? (customFileName.endsWith('.pdf') ? customFileName : `${customFileName}.pdf`) : 'document.pdf';

    if (url.includes('cloudinary.com')) {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:pdf|jpe?g|png|webp)/i);
      if (!match) {
        return NextResponse.json({ error: 'Invalid Cloudinary URL' }, { status: 400 });
      }
      const publicId = match[1];
      if (!customFileName) {
        const rawName = publicId.split('/').pop() || 'document';
        fileName = `${rawName.replace(/^\d{10,14}_/, '')}.pdf`;
      }

      // 1. Try signed private download URL as 'image' (Cloudinary default for uploaded PDFs)
      let signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
        resource_type: 'image',
        type: 'upload',
      });

      let response = await fetch(signedUrl);

      // 2. Fallback to 'raw' if image returned error
      if (!response.ok) {
        const rawSignedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
          resource_type: 'raw',
          type: 'upload',
        });
        const rawRes = await fetch(rawSignedUrl);
        if (rawRes.ok) {
          response = rawRes;
        }
      }

      // 3. Fallback to direct fetch
      if (!response.ok) {
        response = await fetch(url);
      }

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch PDF from Cloudinary' }, { status: response.status });
      }
      pdfBuffer = await response.arrayBuffer();
    } else {
      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: response.status });
      }
      pdfBuffer = await response.arrayBuffer();
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': download
          ? `attachment; filename="${fileName}"`
          : `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('PDF proxy error:', error);
    return NextResponse.json({ error: 'Internal server error proxying PDF' }, { status: 500 });
  }
}
