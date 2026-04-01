import React, { useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  user: Profile;
  onClose: () => void;
}

export default function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      setLoading(false);
      return;
    }

    try {
      // Verify current password
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('password')
        .eq('id', user.id)
        .single();

      if (fetchError || !profile) throw new Error('Không tìm thấy thông tin người dùng.');
      
      if (profile.password !== currentPassword) {
        throw new Error('Mật khẩu hiện tại không đúng.');
      }

      // Update password
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) throw new Error('Lỗi khi cập nhật mật khẩu.');

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-pastel-purple-dark">
        <div className="p-6 md:p-8 border-b border-pastel-purple-dark flex items-center justify-between bg-pastel-purple/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-accent-purple rounded-xl flex items-center justify-center shadow-sm">
              <Lock size={20} />
            </div>
            <h3 className="text-xl font-bold text-accent-purple">Đổi mật khẩu</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-accent-purple">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-green-700">Thành công!</h4>
              <p className="text-sm text-green-600">Mật khẩu của bạn đã được thay đổi.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-xl border border-red-100 italic">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-full border border-pastel-purple-dark font-bold uppercase text-[10px] tracking-widest text-accent-purple hover:bg-pastel-purple/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-accent-purple text-white px-6 py-3 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-accent-purple/90 transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
