import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$connect()

    return NextResponse.json({
      status: 'success',
      message: 'Kết nối DB thành công'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Kết nối thất bại',
      error: String(error)
    })
  }
}