import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        address: true,
        latitude: true,
        longitude: true,
        priceValue: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
    });

    const mappedRooms = rooms.map((room) => ({
      id: room.id,
      title: room.title,
      address: room.address,
      latitude: room.latitude,
      longitude: room.longitude,
      image: room.images[0]?.url || null,
      priceValue: Number(room.priceValue || 0),
    }));

    return NextResponse.json(mappedRooms);
  } catch (error) {
    console.error('Rooms map API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải dữ liệu phòng trên bản đồ',
      },
      { status: 500 }
    );
  }
}
