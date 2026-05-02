import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        phone: true,
        birthDate: true,
        address: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    })

    if (!userData) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const body = await req.json()

    const { fullName, phone, birthDate, address, avatarUrl } = body

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(fullName && { fullName }),
        ...(phone && { phone }),
        ...(birthDate && { birthDate: new Date(birthDate) }),
        ...(address && { address }),
        ...(avatarUrl && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        phone: true,
        birthDate: true,
        address: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }
}
