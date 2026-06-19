"use client"

import { Sparkles } from "lucide-react"

export function CommunityPulse() {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-orange-950 to-orange-700 p-5 text-white shadow-xl shadow-orange-200/70">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-200" />
        <h3 className="font-semibold text-sm">Nhịp cộng đồng</h3>
      </div>
      <p className="text-sm leading-relaxed opacity-90">
        &quot;Cộng đồng đang có nhiều tín hiệu tích cực. Các khu vực chung và phòng làm việc tiếp tục được quan tâm.&quot;
      </p>
      <div className="mt-4 pt-4 border-t border-primary-foreground/20">
        <div className="flex items-center justify-between">
          <span className="text-xs opacity-80">Mức độ hài lòng</span>
          <span className="text-lg font-bold">96%</span>
        </div>
        <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-amber-200 to-sky-200" />
        </div>
      </div>
    </div>
  )
}
