"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message);
                return;
            }

            // lưu token
            localStorage.setItem("token", data.token);

            // redirect dashboard
            router.push("/dashboard");

        } catch (err) {
            setError("Không thể kết nối server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form
                onSubmit={handleLogin}
                className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md"
            >
                <h2 className="text-2xl font-bold mb-6 text-center">
                    Đăng nhập
                </h2>

                {/* Email */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mb-4 p-3 border rounded-lg"
                    required
                />

                {/* Password */}
                <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mb-4 p-3 border rounded-lg"
                    required
                />

                {/* Error */}
                {error && (
                    <p className="text-red-500 text-sm mb-3">{error}</p>
                )}

                {/* Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600"
                >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                {/* Link register */}
                <p className="text-sm mt-4 text-center">
                    Chưa có tài khoản?{" "}
                    <span
                        className="text-blue-500 cursor-pointer"
                        onClick={() => router.push("/register")}
                    >
                        Đăng ký
                    </span>
                </p>
            </form>
        </div>
    );
}