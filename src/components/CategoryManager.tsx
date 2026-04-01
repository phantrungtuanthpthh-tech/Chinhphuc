import React, { useState, useEffect } from 'react';
import { supabase, type Category, type Profile } from '../lib/supabase';
import { Plus, Trash2, Edit2, X, Check, AlertCircle } from 'lucide-react';

interface CategoryManagerProps {
  user: Profile;
}

export default function CategoryManager({ user }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
    if (!error) {
      setNewCategoryName('');
      fetchCategories();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from('categories').update({ name: editName.trim() }).eq('id', id);
    if (!error) {
      setEditingId(null);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (name === 'Hiểu biết chung') {
      alert('Không thể xóa lĩnh vực mặc định này.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa lĩnh vực "${name}"? Tất cả câu hỏi thuộc lĩnh vực này sẽ được chuyển về "Hiểu biết chung".`)) {
      // Find "Hiểu biết chung" ID
      const hbc = categories.find(c => c.name === 'Hiểu biết chung');
      if (hbc) {
        // Update questions first
        await supabase.from('questions').update({ category_id: hbc.id }).eq('category_id', id);
      }
      
      // Delete category
      await supabase.from('categories').delete().eq('id', id);
      fetchCategories();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-1 text-accent-purple">Quản lý Lĩnh vực</h2>
        <p className="text-sm text-[#64748B] italic font-serif">Thêm, sửa hoặc xóa các lĩnh vực kiến thức trong hệ thống.</p>
      </div>

      {/* Add New */}
      <form onSubmit={handleAdd} className="flex gap-4 bg-white p-6 rounded-2xl border border-pastel-purple-dark shadow-sm">
        <input 
          type="text" 
          placeholder="Tên lĩnh vực mới..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1 px-4 py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
        />
        <button 
          type="submit"
          className="bg-accent-purple text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-accent-purple/90 transition-all shadow-lg"
        >
          Thêm mới
        </button>
      </form>

      {/* List */}
      <div className="bg-white rounded-2xl border border-pastel-purple-dark shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_120px] p-4 border-b border-pastel-purple-dark bg-pastel-purple/20 text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">
          <div>Tên lĩnh vực</div>
          <div className="text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#64748B] opacity-60 italic">Đang tải...</div>
        ) : (
          <div className="divide-y divide-pastel-purple-dark/30">
            {categories.map((cat) => (
              <div key={cat.id} className="grid grid-cols-[1fr_120px] p-4 hover:bg-pastel-blue/20 transition-colors items-center group">
                <div>
                  {editingId === cat.id ? (
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1 bg-pastel-blue/50 rounded border border-pastel-blue-dark focus:ring-1 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium text-[#1E293B]">{cat.name}</span>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  {editingId === cat.id ? (
                    <>
                      <button onClick={() => handleUpdate(cat.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                        }} 
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-pastel-purple text-accent-purple rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      {cat.name !== 'Hiểu biết chung' && (
                        <button 
                          onClick={() => handleDelete(cat.id, cat.name)} 
                          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-pastel-blue/30 border border-pastel-blue-dark p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="text-accent-blue shrink-0" size={20} />
        <p className="text-xs text-[#1E293B] leading-relaxed">
          <strong>Lưu ý:</strong> Khi xóa một lĩnh vực, tất cả các câu hỏi thuộc lĩnh vực đó sẽ tự động được chuyển về lĩnh vực <strong>"Hiểu biết chung"</strong> để đảm bảo không mất dữ liệu.
        </p>
      </div>
    </div>
  );
}
