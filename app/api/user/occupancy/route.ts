import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    // Get active occupancy for the user
    const occupancy = await prisma.occupancy.findFirst({
      where: {
        userId: user.userId,
        status: 'ACTIVE',
      },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
      },
    })

    // Also get rooms owned by the user (for hosts)
    const ownedRooms = await prisma.room.findMany({
      where: {
        ownerId: user.userId,
      },
      select: {
        id: true,
        title: true,
        address: true,
      },
    })

    return NextResponse.json({
      occupancy,
      ownedRooms,
    })
  } catch (error) {
    console.error('Occupancy error:', error)
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }
}
