'use client';

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-outline-variant/10 pt-16 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 max-w-7xl mx-auto">
        <div className="col-span-1 md:col-span-1">
          <span className="text-lg font-black text-slate-900 font-headline mb-6 block">The Curated Hearth</span>
          <p className="text-slate-500 text-sm leading-relaxed font-body">Nâng tầm nghệ thuật sống cộng đồng cho những chuyên gia đô thị hiện đại.</p>
        </div>
        <div>
          <h4 className="font-label text-xs font-bold uppercase tracking-widest text-slate-900 mb-6">CÔNG TY</h4>
          <ul className="space-y-4 font-body text-sm text-slate-500">
            <li><a className="hover:text-orange-600 transition-colors" href="#">Về chúng tôi</a></li>
            <li><a className="hover:text-orange-600 transition-colors" href="#">Câu chuyện</a></li>
            <li><a className="hover:text-orange-600 transition-colors" href="#">Cộng đồng</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-label text-xs font-bold uppercase tracking-widest text-slate-900 mb-6">HỖ TRỢ</h4>
          <ul className="space-y-4 font-body text-sm text-slate-500">
            <li><a className="hover:text-orange-600 transition-colors" href="#">Liên hệ</a></li>
            <li><a className="hover:text-orange-600 transition-colors" href="#">Chính sách bảo mật</a></li>
            <li><a className="hover:text-orange-600 transition-colors" href="#">Điều khoản dịch vụ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-label text-xs font-bold uppercase tracking-widest text-slate-900 mb-6">MẠNG XÃ HỘI</h4>
          <div className="flex gap-4">
            <a className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-all" href="#">
              📷
            </a>
            <a className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-all" href="#">
              ✉️
            </a>
          </div>
        </div>
      </div>
      <div className="mt-16 border-t border-slate-200 pt-8 text-center px-8">
        <p className="text-slate-400 text-xs font-body">© 2024 The Curated Hearth.</p>
      </div>
    </footer>
  );
}
