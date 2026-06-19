"use client"

export function Footer() {
  return (
    <footer className="mt-auto rounded-[2rem] border border-white/70 bg-white/60 px-6 py-5 shadow-sm backdrop-blur">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-black text-slate-950">The Curated Hearth</h4>
          <p className="text-xs text-muted-foreground mt-1">
            © 2024 The Curated Hearth. Trải nghiệm co-living được tuyển chọn.
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Chính sách bảo mật</a>
          <a href="#" className="hover:text-foreground transition-colors">Điều khoản dịch vụ</a>
          <a href="#" className="hover:text-foreground transition-colors">Bền vững</a>
          <a href="#" className="hover:text-foreground transition-colors">Trợ năng</a>
        </div>
      </div>
    </footer>
  )
}
