import React, { useState, useEffect } from 'react';
import { supabase, type Question, type Category, type Profile } from '../lib/supabase';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  ChevronDown,
  X,
  Check,
  MoreVertical,
  HelpCircle,
  FileText,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuestionBankProps {
  user: Profile;
}

export default function QuestionBank({ user }: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState({
    content: '',
    answer: '',
    media_link: '',
    difficulty: 'Khởi động' as Question['difficulty'],
    category_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [qRes, cRes] = await Promise.all([
      supabase.from('questions').select('*, categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*')
    ]);

    if (qRes.data) setQuestions(qRes.data);
    if (cRes.data) {
      setCategories(cRes.data);
      if (cRes.data.length > 0) setFormData(prev => ({ ...prev, category_id: cRes.data[0].id }));
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      last_edited_by: user.id,
      created_by: editingQuestion ? editingQuestion.created_by : user.id
    };

    if (editingQuestion) {
      await supabase.from('questions').update(payload).eq('id', editingQuestion.id);
    } else {
      await supabase.from('questions').insert([payload]);
    }

    setIsModalOpen(false);
    setEditingQuestion(null);
    setFormData({ content: '', answer: '', media_link: '', difficulty: 'Khởi động', category_id: categories[0]?.id || '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      await supabase.from('questions').delete().eq('id', id);
      fetchData();
    }
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormData({
      content: q.content,
      answer: q.answer,
      media_link: q.media_link || '',
      difficulty: q.difficulty,
      category_id: q.category_id
    });
    setIsModalOpen(true);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         q.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || q.category_id === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    
    // Editor can only see their assigned categories
    const isAssigned = user.role !== 'editor' || user.assigned_category_ids.includes(q.category_id);

    return matchesSearch && matchesCategory && matchesDifficulty && isAssigned;
  });

  const availableCategories = user.role === 'editor' 
    ? categories.filter(c => user.assigned_category_ids.includes(c.id))
    : categories;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Ngân hàng câu hỏi</h2>
          <p className="text-sm text-[#141414]/50 italic font-serif">Quản lý và biên tập nội dung câu hỏi cho các trận đấu.</p>
        </div>
        <button 
          onClick={() => {
            setEditingQuestion(null);
            setFormData({ content: '', answer: '', media_link: '', difficulty: 'Khởi động', category_id: availableCategories[0]?.id || '' });
            setIsModalOpen(true);
          }}
          className="bg-[#141414] text-[#E4E3E0] px-6 py-3 rounded-full flex items-center gap-2 hover:bg-[#141414]/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          <span>Thêm câu hỏi mới</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-[#141414]/10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#141414]/30" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
        >
          <option value="all">Tất cả lĩnh vực</option>
          {availableCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select 
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-4 py-2 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
        >
          <option value="all">Tất cả mức độ</option>
          <option value="Khởi động">Khởi động</option>
          <option value="10 điểm">10 điểm</option>
          <option value="20 điểm">20 điểm</option>
          <option value="30 điểm">30 điểm</option>
        </select>
        <div className="flex items-center justify-end px-2 text-xs font-bold uppercase tracking-widest opacity-40">
          {filteredQuestions.length} câu hỏi
        </div>
      </div>

      {/* Question List */}
      <div className="bg-white rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_100px] p-4 border-b border-[#141414]/10 bg-[#141414]/5 text-[10px] uppercase tracking-widest font-bold opacity-50">
          <div>#</div>
          <div>Nội dung câu hỏi</div>
          <div>Lĩnh vực & Mức độ</div>
          <div>Trận đấu đã dùng</div>
          <div className="text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#141414]/30 italic">Đang tải dữ liệu...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-[#141414]/30 italic">Không tìm thấy câu hỏi nào.</div>
        ) : (
          <div className="divide-y divide-[#141414]/5">
            {filteredQuestions.map((q, idx) => (
              <div key={q.id} className="grid grid-cols-[40px_1.5fr_1fr_1fr_100px] p-4 hover:bg-[#141414]/5 transition-colors items-center group">
                <div className="text-[10px] font-mono opacity-30">{idx + 1}</div>
                <div className="pr-4">
                  <p className="text-sm font-medium line-clamp-2 mb-1">{q.content}</p>
                  <p className="text-xs text-[#141414]/50 italic">Đáp án: {q.answer}</p>
                </div>
                <div>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-[#141414]/10 rounded text-[10px] font-bold uppercase">
                      {(q as any).categories?.name}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      q.difficulty === 'Khởi động' ? "bg-blue-100 text-blue-700" :
                      q.difficulty === '10 điểm' ? "bg-green-100 text-green-700" :
                      q.difficulty === '20 điểm' ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {q.difficulty}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] opacity-60">
                  {q.used_match_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {q.used_match_ids.map(mid => (
                        <span key={mid} className="underline cursor-help">Trận {mid.slice(0, 4)}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="italic">Chưa sử dụng</span>
                  )}
                </div>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(q)} className="p-2 hover:bg-[#141414] hover:text-white rounded-lg transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all">
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
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[#141414]/10 flex items-center justify-between">
              <h3 className="text-2xl font-bold">{editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Lĩnh vực</label>
                  <select 
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-4 py-3 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
                    required
                  >
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Mức độ</label>
                  <select 
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value as any})}
                    className="w-full px-4 py-3 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
                    required
                  >
                    <option value="Khởi động">Khởi động</option>
                    <option value="10 điểm">10 điểm</option>
                    <option value="20 điểm">20 điểm</option>
                    <option value="30 điểm">30 điểm</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Nội dung câu hỏi</label>
                <textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-3 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm min-h-[100px]"
                  placeholder="Nhập nội dung câu hỏi..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Đáp án</label>
                <input 
                  type="text"
                  value={formData.answer}
                  onChange={(e) => setFormData({...formData, answer: e.target.value})}
                  className="w-full px-4 py-3 bg-[#E4E3E0]/30 rounded-xl border-none focus:ring-2 focus:ring-[#141414] outline-none text-sm"
                  placeholder="Nhập đáp án..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Link Media (Tùy chọn)</label>
                <input 
                  type="url"
                  value={formData.media_link}
                  onChange={(e) => setFormData({...formData, media_link: e.target.value})}
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
                  className="flex-1 bg-[#141414] text-[#E4E3E0] px-6 py-4 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-[#141414]/90 transition-all shadow-lg"
                >
                  {editingQuestion ? 'Cập nhật' : 'Lưu câu hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
