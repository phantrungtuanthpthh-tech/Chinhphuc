import React, { useState, useEffect } from 'react';
import { supabase, type Profile, type Role, type Category } from '../lib/supabase';
import { Plus, Trash2, Edit2, X, Check, Shield, User, Mail, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserManagerProps {
  user: Profile;
}

export default function UserManager({ user }: UserManagerProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'editor' as Role,
    assigned_category_ids: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [uRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*').order('role'),
      supabase.from('categories').select('*').order('name')
    ]);
    if (uRes.data) setUsers(uRes.data);
    if (cRes.data) setCategories(cRes.data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await supabase.from('profiles').update(formData).eq('id', editingUser.id);
    } else {
      await supabase.from('profiles').insert([formData]);
    }
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', full_name: '', role: 'editor', assigned_category_ids: [] });
    fetchData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === user.id) return alert('Bạn không thể tự xóa chính mình.');
    if (confirm(`Bạn có chắc chắn muốn xóa người dùng "${name}"?`)) {
      await supabase.from('profiles').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_category_ids: prev.assigned_category_ids.includes(id)
        ? prev.assigned_category_ids.filter(cid => cid !== id)
        : [...prev.assigned_category_ids, id]
    }));
  };

  const openEdit = (u: Profile) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: (u as any).password || '',
      full_name: u.full_name,
      role: u.role,
      assigned_category_ids: u.assigned_category_ids
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1 text-accent-purple">Ban biên tập</h2>
          <p className="text-sm text-[#64748B] italic font-serif">Quản lý tài khoản và phân quyền lĩnh vực cho các biên tập viên.</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', full_name: '', role: 'editor', assigned_category_ids: [] });
            setIsModalOpen(true);
          }}
          className="bg-accent-purple text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-accent-purple/90 transition-all shadow-lg hover:shadow-xl font-bold"
        >
          <Plus size={20} />
          <span>Thêm thành viên mới</span>
        </button>
      </div>

      {/* User List */}
      <div className="bg-white rounded-2xl border border-pastel-purple-dark shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px] p-4 border-b border-pastel-purple-dark bg-pastel-purple/20 text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">
          <div>Họ và tên / Tên đăng nhập</div>
          <div>Vai trò</div>
          <div>Lĩnh vực phụ trách</div>
          <div className="text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#64748B] opacity-60 italic">Đang tải...</div>
        ) : (
          <div className="divide-y divide-pastel-purple-dark/30">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-[1fr_1fr_1fr_100px] p-4 hover:bg-pastel-blue/20 transition-colors items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pastel-purple text-accent-purple flex items-center justify-center font-bold text-xs border border-pastel-purple-dark">
                    {u.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1E293B]">{u.full_name}</p>
                    <p className="text-xs text-[#64748B] opacity-60 font-mono">{u.username}</p>
                  </div>
                </div>
                <div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                    u.role === 'owner' ? "bg-purple-100 text-purple-700" :
                    u.role === 'admin' ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {u.role}
                  </span>
                </div>
                <div className="text-[10px] text-[#64748B] opacity-60">
                  {u.role === 'editor' ? (
                    u.assigned_category_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.assigned_category_ids.map(cid => (
                          <span key={cid} className="bg-pastel-purple/30 text-accent-purple px-1.5 py-0.5 rounded border border-pastel-purple-dark/30">
                            {categories.find(c => c.id === cid)?.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-red-400">Chưa phân quyền</span>
                    )
                  ) : (
                    <span className="italic">Toàn quyền hệ thống</span>
                  )}
                </div>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(u)} className="p-2 hover:bg-pastel-purple text-accent-purple rounded-lg transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(u.id, u.full_name)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-pastel-purple-dark">
            <div className="p-8 border-b border-pastel-purple-dark flex items-center justify-between bg-pastel-purple/30">
              <h3 className="text-2xl font-bold text-accent-purple">{editingUser ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-pastel-purple rounded-full transition-colors text-accent-purple">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Tên đăng nhập</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-blue opacity-40" size={16} />
                    <input 
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-blue opacity-40" size={16} />
                    <input 
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Họ và tên</label>
                  <input 
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Vai trò</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                    className="w-full px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                    required
                  >
                    <option value="editor">Biên tập viên</option>
                    <option value="admin">Quản trị viên</option>
                    {user.role === 'owner' && <option value="owner">Chủ sở hữu</option>}
                  </select>
                </div>
              </div>

              {formData.role === 'editor' && (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Lĩnh vực phụ trách</label>
                  <div className="grid grid-cols-3 gap-2 max-h-[150px] overflow-y-auto p-2 bg-pastel-blue/20 rounded-xl border border-pastel-blue-dark/30">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border",
                          formData.assigned_category_ids.includes(cat.id)
                            ? "bg-accent-purple text-white border-accent-purple"
                            : "bg-white text-accent-purple/40 border-pastel-purple-dark hover:border-accent-purple"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-full border border-pastel-purple-dark font-bold uppercase text-xs tracking-widest text-accent-purple hover:bg-pastel-purple/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-accent-purple text-white px-6 py-4 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-accent-purple/90 transition-all shadow-lg"
                >
                  {editingUser ? 'Cập nhật' : 'Lưu thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
