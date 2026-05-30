import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy tài khoản.' },
        { status: 404 },
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Mật khẩu hiện tại không chính xác.' },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Đã đổi mật khẩu thành công.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' },
      { status: 401 },
    );
  }
}
