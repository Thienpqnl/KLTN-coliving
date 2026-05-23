"use client"

export function Footer() {
  return (
    <footer className="mt-8 pt-6 border-t border-border">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-serif text-lg text-foreground">The Curated Hearth</h4>
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
