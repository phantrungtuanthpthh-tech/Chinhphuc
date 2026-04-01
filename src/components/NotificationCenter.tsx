import React, { useState, useEffect } from 'react';
import { supabase, type Notification, type Profile } from '../lib/supabase';
import { Plus, Trash2, Bell, ExternalLink, Send, X } from 'lucide-react';

interface NotificationCenterProps {
  user: Profile;
}

export default function NotificationCenter({ user }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ content: '', link: '' });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    const { error } = await supabase.from('notifications').insert([formData]);
    if (!error) {
      setFormData({ content: '', link: '' });
      setIsModalOpen(false);
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      await supabase.from('notifications').delete().eq('id', id);
      fetchNotifications();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Trung tâm Thông báo</h2>
          <p className="text-sm text-[#141414]/50 italic font-serif">Gửi thông báo và hướng dẫn đến tất cả các biên tập viên.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#141414] text-[#E4E3E0] px-6 py-3 rounded-full flex items-center gap-2 hover:bg-[#141414]/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          <span>Gửi thông báo mới</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-[#141414]/30 italic">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-[#141414]/30 italic">Chưa có thông báo nào được gửi.</div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="bg-white p-6 rounded-3xl border border-[#141414]/10 shadow-sm flex items-start justify-between gap-6 group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#141414]/5 rounded-full flex items-center justify-center text-[#141414]/40">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">{notif.content}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                      {new Date(notif.created_at).toLocaleString('vi-VN')}
                    </span>
                    {notif.link && (
                      <a 
                        href={notif.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] uppercase tracking-widest font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Đường dẫn <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(notif.id)}
                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[#141414]/10 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Gửi thông báo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSend} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Nội dung thông báo</label>
                <textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-3 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm min-h-[100px]"
                  placeholder="Nhập nội dung thông báo..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Đường dẫn đính kèm (Tùy chọn)</label>
                <input 
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  className="w-full px-4 py-3 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-full border border-[#141414]/10 font-bold uppercase text-xs tracking-widest hover:bg-[#141414]/5 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#141414] text-[#E4E3E0] px-6 py-4 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-[#141414]/90 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Gửi ngay <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
