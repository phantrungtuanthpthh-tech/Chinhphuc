import React, { useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { LogIn, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (profile: Profile) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Attempt normal login
      const { data, error: loginError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (!loginError && data) {
        onLogin(data as Profile);
        return;
      }

      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pastel-blue p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl p-8 md:p-12 border border-pastel-purple-dark">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-purple text-white rounded-full mb-4 shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-accent-purple mb-2">Chinh phục</h1>
          <p className="text-[#64748B] italic font-serif">Trường THPT Hướng Hóa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60 mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all text-[#1E293B]"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all text-[#1E293B]"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 italic">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-purple text-white py-4 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-accent-purple/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          >
            {loading ? 'Đang xác thực...' : (
              <>
                Đăng nhập <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-pastel-purple-dark text-center">
          <p className="text-xs text-[#64748B] uppercase tracking-widest font-bold opacity-40">
            Hệ thống quản lý ngân hàng câu hỏi Chinh phục
          </p>
        </div>
      </div>
    </div>
  );
}
