import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { GoogleDriveService } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const driveService = new GoogleDriveService(session.accessToken);
    const uploadedFile = await driveService.uploadFile(
      buffer,
      file.name,
      file.type
    );

    return NextResponse.json({
      success: true,
      file: uploadedFile,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
