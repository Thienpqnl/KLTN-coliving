import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bookingService } from '@/lib/services/booking.service'
import { bookingCreateSchema } from '@/lib/validation'
import { handleApiError, successResponse } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    const bookings = await prisma.booking.findMany({
      where: { userId: user.userId },
      include: {
        contract: {
          select: {
            id: true,
            status: true,
            terminatedAt: true,
          },
        },
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
          image: (booking.room.images as { url: string }[]).map((image) => image.url),
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
    const data = bookingCreateSchema.parse(await req.json())
    const booking = await bookingService.create(user.userId, data)
    return successResponse(booking, 201)
  } catch (error) {
    console.error('Booking creation error:', error)
    return handleApiError(error)
  }
}
