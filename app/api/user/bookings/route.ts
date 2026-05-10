import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    const bookings = await prisma.booking.findMany({
      where: { userId: user.userId },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            priceValue: true,
            priceText: true,
            images: {
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                url: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bookings.map((booking) => ({
      ...booking,
      room: {
        ...booking.room,
        priceValue: booking.room.priceValue == null ? null : Number(booking.room.priceValue),
        price: booking.room.priceValue == null ? 0 : Number(booking.room.priceValue),
        image: booking.room.images.map((image) => image.url),
      },
    })))
  } catch (error) {
    console.error('Bookings error:', error)
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const body = await req.json()

    const { roomId, startDate, endDate } = body

    if (!roomId || !startDate || !endDate) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.userId,
        roomId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        room: {
          include: {
            images: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      ...booking,
      room: {
        ...booking.room,
        priceValue: booking.room.priceValue == null ? null : Number(booking.room.priceValue),
        areaValue: booking.room.areaValue == null ? null : Number(booking.room.areaValue),
        price: booking.room.priceValue == null ? 0 : Number(booking.room.priceValue),
        area: booking.room.areaText || '',
        image: booking.room.images.map((image) => image.url),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { message: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
