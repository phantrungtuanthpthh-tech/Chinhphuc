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
      // 1. Attempt normal login
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

      // 2. Bootstrap logic: If login fails and it's the requested initial user
      if (username === 'pttuan' && password === 'Tuan@2008') {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        if (count === 0) {
          // Create initial categories
          const initialCats = [
            'Toán', 'Ngữ văn', 'Vật lý', 'Hóa học', 'Sinh học', 'Tin học', 
            'Lịch sử', 'Địa lí', 'Pháp luật', 'Giáo dục quốc phòng', 
            'Thể thao', 'Nghệ thuật', 'Địa phương', 'Hiểu biết chung'
          ];
          
          await supabase.from('categories').insert(initialCats.map(name => ({ name })));

          // Create initial owner
          const { data: newUser, error: createError } = await supabase
            .from('profiles')
            .insert([{
              username: 'pttuan',
              password: 'Tuan@2008',
              full_name: 'Phan Trung Tuấn',
              role: 'owner',
              assigned_category_ids: []
            }])
            .select()
            .single();

          if (createError) throw createError;
          if (newUser) {
            alert('Hệ thống đã được khởi tạo thành công với tài khoản Chủ sở hữu!');
            onLogin(newUser as Profile);
            return;
          }
        }
      }

      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4 font-serif">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-8 md:p-12 border border-[#5A5A40]/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5A5A40] text-white rounded-full mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-[#5A5A40] mb-2">Chinh phục</h1>
          <p className="text-[#5A5A40]/60 italic">Trường THPT Hướng Hóa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#5A5A40] mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5A5A40] mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
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
            className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : (
              <>
                Đăng nhập <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-top border-[#5A5A40]/10 text-center">
          <p className="text-xs text-[#5A5A40]/40 uppercase tracking-widest">
            Hệ thống quản lý ngân hàng câu hỏi
          </p>
        </div>
      </div>
    </div>
  );
}
