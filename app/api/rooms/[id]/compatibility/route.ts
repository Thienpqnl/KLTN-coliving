import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET /api/rooms/[id]/compatibility
// Lấy chi tiết tương đồng giữa user hiện tại và room
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 1. Sửa kiểu thành Promise
) {
  try {
    const payload = await getAuthUser(req);

    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Không được phép truy cập' },
        { status: 401 }
      );
    }

    // 2. Await params để lấy giá trị thực tế
    const { id: roomId } = await params; 

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }


    // Gọi API Python (AI Service)
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    const response = await fetch(
      `${aiServiceUrl}/compatibility-detail/${payload.userId}/${roomId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('AI Service error:', response.statusText);
      return NextResponse.json(
        { error: 'Không thể tính toán độ tương đồng' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Compatibility API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
