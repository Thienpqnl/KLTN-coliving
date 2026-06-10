import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {

  const rooms =
    await prisma.room.findMany({

      where: {
        latitude: {
          not: null,
        },

        longitude: {
          not: null,
        },
      },

      select: {
  id: true,
  title: true,
  address: true,

  latitude: true,
  longitude: true,

  images: {
    orderBy: {
      sortOrder: 'asc'
    },
    take: 1,
    select: {
      url: true
    }
  },

  priceValue: true,
}
    })

const mappedRooms = rooms.map(room => ({
  id: room.id,
  title: room.title,
  address: room.address,

  latitude: room.latitude,
  longitude: room.longitude,

  image:

  room.images?.[0]?.url || null,

  priceValue:
    Number(room.priceValue || 0),
}))

return NextResponse.json(mappedRooms)
}