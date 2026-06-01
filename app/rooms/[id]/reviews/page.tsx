'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Star, Send, ArrowLeft } from 'lucide-react';

interface RoommateReview {
  friendliness: number;
  cleanliness: number;
  quietness: number;
  respectfulness: number;
  comment: string;
}

export default function RoommateReviewPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [review, setReview] = useState<RoommateReview>({
    friendliness: 5,
    cleanliness: 5,
    quietness: 5,
    respectfulness: 5,
    comment: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/rooms/${roomId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Lỗi khi lưu đánh giá');
      }

      setSuccess('✅ Đánh giá của bạn đã được lưu thành công!');
      setTimeout(() => {
        router.push(`/rooms/${roomId}`);
      }, 2000);
    } catch (err) {
      setError(`❌ Lỗi: ${err instanceof Error ? err.message : 'Đã có lỗi xảy ra'}`);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        <span className="text-2xl font-bold text-yellow-500">{value}/5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={32}
              className={`${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-bold mb-6"
            >
              <ArrowLeft size={20} />
              Quay lại
            </button>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-3">
                Đánh giá Roommate
              </h1>
              <p className="text-lg text-slate-600">
                Chia sẻ trải nghiệm sống chung của bạn với các roommate để giúp cộng đồng tìm được người phù hợp.
              </p>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-xl bg-green-50 border-2 border-green-200 p-4 text-green-700">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-12 space-y-8">
            {/* Friendliness */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
              <StarRating
                label="😊 Thân thiện & Hòa đồng"
                value={review.friendliness}
                onChange={(val) => setReview({ ...review, friendliness: val })}
              />
              <p className="text-xs text-slate-600 mt-3">Roommate có thân thiện, dễ gặp gỡ và giao tiếp tốt không?</p>
            </div>

            {/* Cleanliness */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
              <StarRating
                label="🧹 Sạch sẽ & Gọn gàng"
                value={review.cleanliness}
                onChange={(val) => setReview({ ...review, cleanliness: val })}
              />
              <p className="text-xs text-slate-600 mt-3">Roommate có giữ gìn vệ sinh chung không?</p>
            </div>

            {/* Quietness */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
              <StarRating
                label="🔇 Yên tĩnh & Tôn trọng giờ nghỉ"
                value={review.quietness}
                onChange={(val) => setReview({ ...review, quietness: val })}
              />
              <p className="text-xs text-slate-600 mt-3">Roommate có tôn trọng giờ nghỉ của bạn không?</p>
            </div>

            {/* Respectfulness */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200">
              <StarRating
                label="🤝 Tôn trọng & Tin tưởng được"
                value={review.respectfulness}
                onChange={(val) => setReview({ ...review, respectfulness: val })}
              />
              <p className="text-xs text-slate-600 mt-3">Roommate có tôn trọng quyền riêng tư và đồ đạc của bạn không?</p>
            </div>

            {/* Comment */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                💬 Nhận xét thêm (tùy chọn)
              </label>
              <textarea
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                placeholder="Chia sẻ chi tiết hơn về trải nghiệm sống chung với roommate... (điểm mạnh, điểm yếu, lời khuyên cho người tư vấn tiếp theo)"
                maxLength={500}
                rows={5}
                className="w-full px-6 py-4 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition text-slate-900 placeholder:text-slate-400"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Chia sẻ trung thực giúp cộng đồng tìm được người phù hợp</span>
                <span>{review.comment.length}/500</span>
              </div>
            </div>

            {/* Average Rating */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Đánh giá trung bình</p>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={star <= Math.round((review.friendliness + review.cleanliness + review.quietness + review.respectfulness) / 4) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold">
                  {((review.friendliness + review.cleanliness + review.quietness + review.respectfulness) / 4).toFixed(1)}/5
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold uppercase tracking-wide hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>Đang lưu...</>
                ) : (
                  <>
                    <Send size={18} />
                    Gửi đánh giá
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-4 rounded-full border-2 border-slate-300 text-slate-700 font-bold uppercase tracking-wide hover:bg-slate-50 transition"
              >
                Hủy
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              💡 Đánh giá của bạn giúp xây dựng cộng đồng tin cậy. Chúng tôi sẽ không công khai tên của bạn.
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
