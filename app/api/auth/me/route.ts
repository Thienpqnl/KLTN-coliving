import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { ApiError } from '@/lib/api-error'
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
        phoneVerified: true,
        phoneVerifiedAt: true,
        gender: true,
        birthDate: true,
        address: true,
        avatarUrl: true,
        role: true,
      },
    })

    if (!userData) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(userData, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (!(error instanceof ApiError && error.statusCode === 401)) {
      console.error('Auth/me error:', error)
    }

    return NextResponse.json(
      { message: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
