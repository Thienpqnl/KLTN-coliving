"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { ContractData, contractClient } from "@/lib/services/contract-client.service";
import { formatRoomArea } from "@/lib/format-room-area";

function formatDate(value?: string | null) {
  if (!value) return "Chưa xác nhận";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa ký";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đồng`;
}

function numberInWords(value: number) {
  return value === 0 ? "Không đồng" : "Theo số tiền bằng số nêu trên";
}

function signingCitizenId(contract: ContractData, type: "HOST_SIGNED" | "RENTER_SIGNED") {
  const event = contract.events?.find((item) => item.type === type);
  const value = event?.metadata?.citizenId;
  return typeof value === "string" ? value : "Chưa cung cấp";
}

export default function PrintableContractPage() {
  const params = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    contractClient.getById(params.id)
      .then(setContract)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải hợp đồng"));
  }, [params.id]);

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">{error}</main>;
  }

  if (!contract) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-7 w-7 animate-spin text-orange-600" /></main>;
  }

  const isDraft = contract.status === "DRAFT" || contract.status === "PENDING_HOST_SIGNATURE";
  const roomArea = formatRoomArea(contract.room.areaValue, contract.room.areaText);
  const hostCitizenId = signingCitizenId(contract, "HOST_SIGNED");
  const renterCitizenId = signingCitizenId(contract, "RENTER_SIGNED");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between print:hidden">
        <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-700"><ArrowLeft className="h-4 w-4" />Quay lại</button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"><Printer className="h-4 w-4" />In hoặc lưu PDF</button>
      </div>

      <article className="contract-document relative mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[20mm] py-[16mm] text-[13px] leading-6 text-black shadow-lg print:min-h-0 print:max-w-none print:shadow-none">
        {isDraft && <div className="absolute right-6 top-6 border-2 border-red-500 px-3 py-1 text-sm font-bold uppercase text-red-600">Bản nháp</div>}

        <header className="grid grid-cols-2 gap-8 text-center">
          <div>
            <p className="font-bold uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
            <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
            <div className="mx-auto mt-1 w-40 border-t border-black" />
          </div>
          <div>
            <p className="font-bold uppercase">Hợp đồng thuê nhà ở</p>
            <p>Số: {contract.contractNumber}</p>
          </div>
        </header>

        <div className="mt-8 text-center">
          <h1 className="text-xl font-bold uppercase">Hợp đồng thuê phòng trọ</h1>
          <p className="mt-1">Căn cứ Bộ luật Dân sự 2015 và Luật Nhà ở 2023 số 27/2023/QH15</p>
        </div>

        <p className="mt-6">Hôm nay, các bên tự nguyện xác lập hợp đồng thuê nhà ở với nội dung sau:</p>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Bên cho thuê (Bên A)</h2>
          <p>Họ và tên: <strong>{contract.host.fullName}</strong></p>
          <p>Số căn cước công dân: <strong>{hostCitizenId}</strong></p>
          <p>Địa chỉ: {contract.host.address || "Theo hồ sơ tài khoản đã xác minh"}</p>
          <p>Điện thoại: {contract.host.phone || "Chưa cung cấp"} | Email: {contract.host.email}</p>

          <h2 className="mt-4 font-bold uppercase">Bên thuê (Bên B)</h2>
          <p>Họ và tên: <strong>{contract.renter.fullName}</strong></p>
          <p>Số căn cước công dân: <strong>{renterCitizenId}</strong></p>
          <p>Địa chỉ: {contract.renter.address || "Theo hồ sơ tài khoản"}</p>
          <p>Điện thoại: {contract.renter.phone || "Chưa cung cấp"} | Email: {contract.renter.email}</p>
        </section>

        <section className="mt-5">
          <h2 className="font-bold uppercase">Điều 1. Nhà ở cho thuê và mục đích sử dụng</h2>
          <p>1. Bên A đồng ý cho Bên B thuê phòng “{contract.room.title}” tại địa chỉ: {contract.room.address}.</p>
          <p>2. Diện tích: {roomArea || "theo hiện trạng bàn giao"}. Mục đích sử dụng: để ở; không sử dụng vào hoạt động trái pháp luật.</p>
          <p>3. Số người ở không vượt quá {contract.room.maxOccupants || 1} người, trừ khi hai bên có thỏa thuận khác bằng văn bản.</p>
        </section>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Điều 2. Thời hạn thuê và bàn giao</h2>
          <p>1. Thời hạn thuê từ ngày {formatDate(contract.startDate)} đến hết ngày {formatDate(contract.endDate)}.</p>
          <p>2. Việc bàn giao chỉ hoàn tất khi cả hai bên xác nhận hiện trạng phòng, tài sản và chỉ số điện nước trên hệ thống.</p>
        </section>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Điều 3. Giá thuê và thanh toán</h2>
          <p>1. Giá thuê: <strong>{money(contract.monthlyRent)}</strong>/tháng ({numberInWords(contract.monthlyRent)}).</p>
          <p>2. Bên B thanh toán chậm nhất vào ngày {contract.paymentDueDay} hàng tháng bằng hình thức: {contract.paymentMethod || "theo thỏa thuận của hai bên"}.</p>
          <p>3. Mọi khoản thanh toán phải có biên nhận, mã giao dịch hoặc chứng từ điện tử có thể đối chiếu.</p>
        </section>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Điều 4. Tiền đặt cọc</h2>
          <p>1. Tiền đặt cọc: <strong>{money(contract.depositAmount)}</strong>.</p>
          <p>2. Tiền cọc được hoàn trả trong vòng {contract.depositReturnDays} ngày kể từ khi thanh lý, sau khi trừ các khoản nợ và thiệt hại có chứng cứ.</p>
          <p>3. Việc khấu trừ, hoàn trả hoặc xử lý tiền cọc phải được lập thành biên bản hoặc ghi nhận trên hệ thống.</p>
        </section>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Điều 5. Điện, nước và dịch vụ</h2>
          <p>1. Giá điện: {contract.electricityRate ? `${money(contract.electricityRate)}/kWh` : "theo đơn giá và phương pháp tính đã công bố"}.</p>
          <p>2. Giá nước: {contract.waterRate ? money(contract.waterRate) : "theo thỏa thuận và số lượng sử dụng"}.</p>
          <p>3. Dịch vụ khác: {contract.utilitiesNotes || "Không có thỏa thuận bổ sung"}.</p>
        </section>

        <section className="mt-4 break-inside-avoid">
          <h2 className="font-bold uppercase">Điều 6. Quyền và nghĩa vụ của Bên A</h2>
          <p>1. Bàn giao phòng đúng hiện trạng, bảo đảm quyền sử dụng ổn định của Bên B trong thời hạn thuê.</p>
          <p>2. Thực hiện sửa chữa thuộc trách nhiệm chủ sở hữu; thông báo trước khi kiểm tra phòng, trừ trường hợp khẩn cấp.</p>
          <p>3. Hỗ trợ thủ tục cư trú và cung cấp chứng từ thu tiền theo thỏa thuận.</p>
        </section>

        <section className="mt-4 break-inside-avoid">
          <h2 className="font-bold uppercase">Điều 7. Quyền và nghĩa vụ của Bên B</h2>
          <p>1. Thanh toán đầy đủ, đúng hạn; sử dụng phòng đúng mục đích và bảo quản tài sản bàn giao.</p>
          <p>2. Không tự ý cải tạo, cho thuê lại hoặc chuyển giao hợp đồng khi chưa được Bên A đồng ý bằng văn bản.</p>
          <p>3. Tuân thủ quy định cư trú, an ninh, vệ sinh và phòng cháy chữa cháy.</p>
        </section>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Điều 8. Chấm dứt, vi phạm và bồi thường</h2>
          <p>1. Bên muốn chấm dứt trước thời hạn phải thông báo trước {contract.noticeDays} ngày, trừ trường hợp pháp luật hoặc hợp đồng cho phép chấm dứt ngay.</p>
          <p>2. Bên vi phạm được tạo cơ hội khắc phục trong thời hạn hợp lý, trừ vi phạm nghiêm trọng; thiệt hại phải được chứng minh và bồi thường theo pháp luật.</p>
          <p>3. Khi chấm dứt, hai bên lập biên bản thanh lý, bàn giao lại phòng và quyết toán công nợ, tiền cọc.</p>
        </section>

        <section className="mt-4">
          <h2 className="font-bold uppercase">Điều 9. Nội quy và thỏa thuận bổ sung</h2>
          <p className="whitespace-pre-wrap">{contract.houseRules || "Các bên tuân thủ nội quy được công bố hợp pháp tại nơi thuê."}</p>
          {contract.notes && <p className="mt-2 whitespace-pre-wrap">Ghi chú bổ sung: {contract.notes}</p>}
        </section>

        {!!contract.inventory?.length && (
          <section className="mt-5 break-inside-avoid">
            <h2 className="mb-2 font-bold uppercase">Phụ lục 01. Danh mục tài sản bàn giao</h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead><tr><th className="border border-black p-2">STT</th><th className="border border-black p-2">Tài sản</th><th className="border border-black p-2">Số lượng</th><th className="border border-black p-2">Tình trạng</th></tr></thead>
              <tbody>{contract.inventory.map((item, index) => <tr key={`${item.name}-${index}`}><td className="border border-black p-2 text-center">{index + 1}</td><td className="border border-black p-2">{item.name}</td><td className="border border-black p-2 text-center">{item.quantity}</td><td className="border border-black p-2">{item.condition || "Chưa ghi nhận"}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        <section className="mt-5">
          <h2 className="font-bold uppercase">Điều 10. Giải quyết tranh chấp và hiệu lực</h2>
          <p>1. Tranh chấp được ưu tiên giải quyết bằng thương lượng; nếu không thành, các bên có quyền yêu cầu cơ quan có thẩm quyền giải quyết.</p>
          <p>2. Hợp đồng có hiệu lực sau khi hai bên ký, hoàn thành nghĩa vụ cọc nếu có và xác nhận bàn giao theo quy trình hệ thống.</p>
          <p>3. Dữ liệu hợp đồng, lịch sử chấp thuận và mã kiểm tra toàn vẹn là bộ phận không tách rời của hợp đồng.</p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-12 text-center break-inside-avoid">
          <div><p className="font-bold uppercase">Bên thuê</p><p className="italic">Đã đọc và đồng ý</p><div className="mt-12"><p className="font-bold">{contract.renterSignatureName || "Chưa ký"}</p><p className="text-xs">{formatDateTime(contract.renterSignedAt)}</p></div></div>
          <div><p className="font-bold uppercase">Bên cho thuê</p><p className="italic">Đã đọc và đồng ý</p><div className="mt-12"><p className="font-bold">{contract.hostSignatureName || "Chưa ký"}</p><p className="text-xs">{formatDateTime(contract.hostSignedAt)}</p></div></div>
        </section>

        <footer className="mt-10 border-t border-black pt-3 text-[10px] leading-4 text-slate-700">
          <p>Mã kiểm tra toàn vẹn SHA-256: <span className="break-all font-mono">{contract.contentHash}</span></p>
          <p>Phiên bản điều khoản: {contract.termsVersion} | Trạng thái: {contract.status} | Ngày tạo: {formatDateTime(contract.createdAt)}</p>
        </footer>
      </article>

      <style jsx global>{`
        .contract-document { font-family: "Times New Roman", Times, serif; }
        @page { size: A4; margin: 14mm 16mm; }
        @media print {
          html, body { background: white !important; }
          .contract-document { padding: 0 !important; font-size: 12pt; line-height: 1.45; }
        }
      `}</style>
    </main>
  );
}
