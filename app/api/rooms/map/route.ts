import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getServiceUrl,
  requestServiceJson,
} from '@/lib/microservices/service-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MapRoom = {
  id: string;
  title: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  priceValue: number;
};

async function getRoomsFromLocalDatabase(): Promise<MapRoom[]> {
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

  return rooms.map((room) => ({
    id: room.id,
    title: room.title,
    address: room.address,
    latitude: room.latitude,
    longitude: room.longitude,
    image: room.images[0]?.url || null,
    priceValue: Number(room.priceValue || 0),
  }));
}

export async function GET() {
  const propertyServiceUrl = getServiceUrl('PROPERTY');

  if (propertyServiceUrl) {
    try {
      const rooms = await requestServiceJson<MapRoom[]>(
        'property-service',
        propertyServiceUrl,
        '/v1/rooms/map',
        { timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000) },
      );
      return NextResponse.json(rooms);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.warn(
        `[BFF] Property Service unavailable (${reason}); using local rooms/map implementation.`,
      );
    }
  }

  try {
    return NextResponse.json(await getRoomsFromLocalDatabase());
  } catch (error) {
    console.error('Rooms map API error:', error);

    return NextResponse.json([]);
  }
}
