import React, { useState, useEffect } from 'react';
import { firebaseService, uploadFile, type Question, type Category, type Profile } from '../lib/firebaseService';
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
  Clock,
  Download,
  User,
  Upload,
  Layers,
  Zap,
  Image,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

interface QuestionBankProps {
  user: Profile;
}

export default function QuestionBank({ user }: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null); // tracks uploading field

  // Form State
  const [formData, setFormData] = useState({
    content: '',
    answer: '',
    media_link: '',
    difficulty: 'Khởi động' as Question['difficulty'],
    category_id: '',
    // Vượt chướng ngại vật fields
    sub_questions: [
      { content: '', answer: '' },
      { content: '', answer: '' },
      { content: '', answer: '' },
      { content: '', answer: '' }
    ],
    central_question: '',
    central_answer: '',
    keyword: '',
    image_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [questionsData, categoriesData, matchesData] = await Promise.all([
        firebaseService.questions.getAll(),
        firebaseService.categories.getAll(),
        firebaseService.matches.getMinimalList()
      ]);
      setQuestions(questionsData);
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setFormData(prev => ({ ...prev, category_id: categoriesData[0].id }));
      }
      setMatches(matchesData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu ngân hàng câu hỏi:', err);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'media_link' | 'image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(targetField);
    try {
      const url = await uploadFile(file);
      setFormData(prev => ({ ...prev, [targetField]: url }));
      alert('Tải tệp lên thành công!');
    } catch (err: any) {
      alert('Lỗi tải tệp: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      last_edited_by: user.id,
      created_by: editingQuestion ? editingQuestion.created_by : user.id
    };

    try {
      if (editingQuestion) {
        await firebaseService.questions.update(editingQuestion.id, payload as any);
      } else {
        await firebaseService.questions.create(payload as any);
      }
    } catch (err) {
      console.error('Lỗi lưu câu hỏi:', err);
    }

    setIsModalOpen(false);
    setEditingQuestion(null);
    setFormData({ 
      content: '', 
      answer: '', 
      media_link: '', 
      difficulty: 'Khởi động', 
      category_id: categories[0]?.id || '',
      sub_questions: [
        { content: '', answer: '' },
        { content: '', answer: '' },
        { content: '', answer: '' },
        { content: '', answer: '' }
      ],
      central_question: '',
      central_answer: '',
      keyword: '',
      image_url: ''
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await firebaseService.questions.delete(deleteConfirmId);
      } catch (err) {
        console.error('Lỗi xóa câu hỏi:', err);
      }
      setDeleteConfirmId(null);
      fetchData();
    }
  };

  const exportToExcel = () => {
    const data = filteredQuestions.map((q, idx) => {
      const usedMatchNames = q.used_match_ids
        .map(mid => {
          const match = matches.find(m => m.id === mid);
          return (match && match.is_published) ? match.name : null;
        })
        .filter(Boolean)
        .join(', ');

      return {
        'STT': idx + 1,
        'Lĩnh vực': (q as any).categories?.name,
        'Mức độ': q.difficulty,
        'Nội dung': q.content,
        'Đáp án': q.answer,
        'Link Media': q.media_link || '',
        'Người tạo': (q as any).creator?.full_name || 'N/A',
        'Người sửa cuối': (q as any).editor?.full_name || 'N/A',
        'Các trận đấu đã dùng': usedMatchNames || 'Chưa sử dụng',
        'Ngày tạo': new Date(q.created_at).toLocaleString('vi-VN')
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NganHangCauHoi");
    XLSX.writeFile(wb, `NganHangCauHoi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormData({
      content: q.content,
      answer: q.answer,
      media_link: q.media_link || '',
      difficulty: q.difficulty,
      category_id: q.category_id,
      sub_questions: q.sub_questions || [
        { content: '', answer: '' },
        { content: '', answer: '' },
        { content: '', answer: '' },
        { content: '', answer: '' }
      ],
      central_question: q.central_question || '',
      central_answer: q.central_answer || '',
      keyword: q.keyword || '',
      image_url: q.image_url || ''
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
            <h2 className="text-3xl font-bold tracking-tight mb-1 text-accent-purple">Ngân hàng câu hỏi</h2>
            <p className="text-sm text-[#64748B] italic font-serif">Quản lý và biên tập nội dung câu hỏi cho các trận đấu.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={exportToExcel}
              className="flex-1 md:flex-none bg-accent-blue text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full flex items-center justify-center gap-2 hover:bg-accent-blue/90 transition-all shadow-lg hover:shadow-xl font-bold text-sm md:text-base"
            >
              <Download size={18} />
              <span>Xuất Excel</span>
            </button>
            <button 
              onClick={() => {
                setEditingQuestion(null);
                setFormData({ content: '', answer: '', media_link: '', difficulty: 'Khởi động', category_id: availableCategories[0]?.id || '' });
                setIsModalOpen(true);
              }}
              className="flex-1 md:flex-none bg-accent-purple text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full flex items-center justify-center gap-2 hover:bg-accent-purple/90 transition-all shadow-lg hover:shadow-xl font-bold text-sm md:text-base"
            >
              <Plus size={18} />
              <span>Thêm mới</span>
            </button>
          </div>
        </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-pastel-purple-dark shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-blue opacity-40" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
        >
          <option value="all">Tất cả lĩnh vực</option>
          {availableCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select 
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-4 py-2 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
        >
          <option value="all">Tất cả mức độ</option>
          <option value="Khởi động">Khởi động</option>
          <option value="10 điểm">10 điểm</option>
          <option value="20 điểm">20 điểm</option>
          <option value="30 điểm">30 điểm</option>
          <option value="Vượt chướng ngại vật">Vượt chướng ngại vật</option>
          <option value="Tăng tốc">Tăng tốc</option>
        </select>
        <div className="flex items-center justify-end px-2 text-xs font-bold uppercase tracking-widest text-[#64748B] opacity-60">
          {filteredQuestions.length} câu hỏi
        </div>
      </div>

      {/* Question List */}
      <div className="bg-white rounded-2xl border border-pastel-purple-dark shadow-sm overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:grid md:grid-cols-[40px_1.5fr_1fr_1fr_1fr_100px] p-4 border-b border-pastel-purple-dark bg-pastel-purple/20 text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">
          <div>#</div>
          <div>Nội dung câu hỏi</div>
          <div>Lĩnh vực & Mức độ</div>
          <div>Người tạo/Sửa</div>
          <div>Trận đấu đã dùng</div>
          <div className="text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#64748B] opacity-60 italic">Đang tải dữ liệu...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] opacity-60 italic">Không tìm thấy câu hỏi nào.</div>
        ) : (
          <div className="divide-y divide-pastel-purple-dark/30">
            {filteredQuestions.map((q, idx) => {
              const isVCNV = q.difficulty === 'Vượt chướng ngại vật';
              const isTangToc = q.difficulty === 'Tăng tốc';
              return (
                <div key={q.id} className="flex flex-col p-4 hover:bg-pastel-blue/20 transition-colors items-start justify-stretch group gap-4 md:gap-2">
                  <div className="w-full flex flex-col md:grid md:grid-cols-[40px_1.5fr_1fr_1fr_1fr_100px] items-start md:items-center gap-4 md:gap-0">
                    {/* Mobile Header Row */}
                    <div className="flex items-center justify-between w-full md:hidden">
                      <div className="text-[10px] font-mono text-[#64748B] opacity-40">#{idx + 1}</div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(q)} className="p-2 bg-pastel-purple/30 text-accent-purple rounded-lg transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="p-2 bg-red-50 text-red-500 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="hidden md:block text-[10px] font-mono text-[#64748B] opacity-40">{idx + 1}</div>
                    
                    <div className="pr-4 w-full">
                      {isVCNV ? (
                        <div>
                          <p className="text-sm font-bold text-accent-purple mb-1">Bộ Câu Hỏi Vượt Chướng Ngại Vật</p>
                          <p className="text-xs text-[#1E293B]"><strong>Từ khóa hình ảnh:</strong> {q.keyword}</p>
                          <p className="text-xs text-[#1E293B]"><strong>Câu hỏi trung tâm:</strong> {q.central_question} (Đáp án: {q.central_answer})</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium line-clamp-3 md:line-clamp-2 mb-1 text-[#1E293B]">{q.content}</p>
                          <p className="text-xs text-[#64748B] italic">Đáp án: {q.answer}</p>
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-auto">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 bg-pastel-purple text-accent-purple rounded text-[10px] font-bold uppercase">
                          {(q as any).categories?.name}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          q.difficulty === 'Khởi động' ? "bg-blue-100 text-blue-700" :
                          q.difficulty === '10 điểm' ? "bg-green-100 text-green-700" :
                          q.difficulty === '20 điểm' ? "bg-yellow-100 text-yellow-700" :
                          q.difficulty === '30 điểm' ? "bg-red-100 text-red-700" :
                          q.difficulty === 'Vượt chướng ngại vật' ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>

                <div className="text-[10px] text-[#64748B] opacity-60 flex flex-row md:flex-col gap-3 md:gap-1 w-full md:w-auto">
                  <div className="flex items-center gap-1">
                    <User size={10} className="text-accent-purple" />
                    <span className="truncate max-w-[120px]">Tạo: {(q as any).creator?.full_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Edit2 size={10} className="text-accent-blue" />
                    <span className="truncate max-w-[120px]">Sửa: {(q as any).editor?.full_name || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-[10px] text-[#64748B] opacity-60 w-full md:w-auto">
                  {q.used_match_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      <span className="md:hidden mr-1">Đã dùng:</span>
                      {q.used_match_ids.map(mid => {
                        const match = matches.find(m => m.id === mid);
                        if (!match || !match.is_published) return null;
                        return (
                          <span key={mid} className="underline cursor-help hover:text-accent-blue transition-colors" title={match.name}>
                            {match.name.length > 10 ? match.name.slice(0, 10) + '...' : match.name}
                          </span>
                        );
                      }).filter(Boolean)}
                      {q.used_match_ids.every(mid => {
                        const match = matches.find(m => m.id === mid);
                        return !match || !match.is_published;
                      }) && <span className="italic">Chưa sử dụng</span>}
                    </div>
                  ) : (
                    <span className="italic md:not-italic"><span className="md:hidden">Chưa sử dụng</span><span className="hidden md:inline">Chưa sử dụng</span></span>
                  )}
                </div>

                <div className="hidden md:flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(q)} className="p-2 hover:bg-pastel-purple text-accent-purple rounded-lg transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isVCNV && (
                <div className="w-full pl-0 md:pl-10 mt-3 p-4 bg-pastel-purple/10 rounded-2xl border border-pastel-purple-dark/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#1E293B]">
                  <div className="space-y-2">
                    <p className="font-bold text-accent-purple tracking-wider uppercase text-[10px]">4 Mảnh ghép (Câu hỏi & Đáp án):</p>
                    {q.sub_questions?.map((sq: any, sIdx: number) => (
                      <div key={sIdx} className="p-2 bg-white rounded-lg border border-pastel-purple-dark/30">
                        <p><strong>Mảnh ghép {sIdx + 1}:</strong> {sq.content || '(Trống)'}</p>
                        <p className="text-accent-blue font-serif italic mt-0.5">Đáp án: {sq.answer || '(Trống)'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-accent-purple tracking-wider uppercase text-[10px] mb-1">Hình ảnh đính kèm (Tỉ lệ 4:3):</p>
                      {q.image_url ? (
                        <img src={q.image_url} alt="Chướng ngại vật" className="w-40 aspect-[4/3] object-cover rounded-xl border border-pastel-purple-dark shadow-sm" referrerPolicy="no-referrer" />
                      ) : (
                        <p className="text-[#64748B] italic">Chưa tải hình ảnh lên</p>
                      )}
                    </div>
                    {q.media_link && (
                      <div>
                        <p className="font-bold text-accent-purple tracking-wider uppercase text-[10px] mb-0.5">Link Media khác:</p>
                        <a href={q.media_link} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline break-all inline-flex items-center gap-1">
                          {q.media_link} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-pastel-purple-dark max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-8 border-b border-pastel-purple-dark flex items-center justify-between bg-pastel-purple/30 shrink-0">
              <h3 className="text-xl md:text-2xl font-bold text-accent-purple">{editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-pastel-purple rounded-full transition-colors text-accent-purple">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Lĩnh vực</label>
                  <select 
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-4 py-2.5 md:py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                    required
                  >
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Mức độ</label>
                  <select 
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value as any})}
                    className="w-full px-4 py-2.5 md:py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                    required
                  >
                    <option value="Khởi động">Khởi động</option>
                    <option value="10 điểm">10 điểm</option>
                    <option value="20 điểm">20 điểm</option>
                    <option value="30 điểm">30 điểm</option>
                    <option value="Vượt chướng ngại vật">Vượt chướng ngại vật</option>
                    <option value="Tăng tốc">Tăng tốc</option>
                  </select>
                </div>
              </div>

              {formData.difficulty === 'Vượt chướng ngại vật' ? (
                <div className="space-y-6">
                  <div className="p-4 bg-pastel-purple/10 rounded-2xl border border-pastel-purple-dark/50 space-y-4">
                    <p className="font-bold text-accent-purple text-xs uppercase tracking-wider">Bộ 4 Câu hỏi Mảnh ghép</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.sub_questions.map((sq, sIdx) => (
                        <div key={sIdx} className="p-3 bg-white rounded-xl border border-pastel-purple-dark/30 space-y-2">
                          <p className="font-bold text-accent-purple text-[10px]">Mảnh ghép {sIdx + 1}</p>
                          <textarea
                            value={sq.content}
                            onChange={(e) => {
                              const newSubs = [...formData.sub_questions];
                              newSubs[sIdx].content = e.target.value;
                              setFormData({ ...formData, sub_questions: newSubs });
                            }}
                            className="w-full px-3 py-2 bg-pastel-blue/20 rounded-lg border border-pastel-blue-dark outline-none text-xs text-[#1E293B]"
                            placeholder={`Nội dung câu hỏi mảnh ghép ${sIdx + 1}`}
                            rows={2}
                          />
                          <input
                            type="text"
                            value={sq.answer}
                            onChange={(e) => {
                              const newSubs = [...formData.sub_questions];
                              newSubs[sIdx].answer = e.target.value;
                              setFormData({ ...formData, sub_questions: newSubs });
                            }}
                            className="w-full px-3 py-2 bg-pastel-blue/20 rounded-lg border border-pastel-blue-dark outline-none text-xs text-[#1E293B]"
                            placeholder={`Đáp án mảnh ghép ${sIdx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Câu hỏi trung tâm</label>
                      <textarea 
                        value={formData.central_question}
                        onChange={(e) => setFormData({...formData, central_question: e.target.value})}
                        className="w-full px-4 py-2.5 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                        placeholder="Nhập câu hỏi trung tâm..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Đáp án trung tâm</label>
                      <input 
                        type="text"
                        value={formData.central_answer}
                        onChange={(e) => setFormData({...formData, central_answer: e.target.value})}
                        className="w-full px-4 py-2.5 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                        placeholder="Đáp án câu hỏi trung tâm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Từ khóa (Nội dung hình ảnh)</label>
                      <input 
                        type="text"
                        value={formData.keyword}
                        onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                        className="w-full px-4 py-2.5 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                        placeholder="Từ khóa chính của chướng ngại vật"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60 flex items-center justify-between">
                        <span>Hình ảnh chướng ngại vật (Tỉ lệ 4:3)</span>
                        {uploading === 'image_url' && <span className="text-accent-blue animate-pulse text-[10px]">Đang tải lên...</span>}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={formData.image_url}
                          onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                          className="flex-1 px-4 py-2.5 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                          placeholder="Link hình ảnh tỉ lệ 4:3"
                        />
                        <label className="bg-accent-blue hover:bg-accent-blue/90 text-white p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0">
                          <Upload size={18} />
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, 'image_url')} 
                            accept="image/*"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Nội dung câu hỏi</label>
                    <textarea 
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full px-4 py-2.5 md:py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm min-h-[80px] md:min-h-[100px] text-[#1E293B]"
                      placeholder="Nhập nội dung câu hỏi..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60">Đáp án</label>
                    <input 
                      type="text"
                      value={formData.answer}
                      onChange={(e) => setFormData({...formData, answer: e.target.value})}
                      className="w-full px-4 py-2.5 md:py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      placeholder="Nhập đáp án..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-accent-purple opacity-60 flex items-center justify-between">
                      <span>Tải tệp phương tiện (Hình ảnh / Video / Audio)</span>
                      {uploading === 'media_link' && <span className="text-accent-blue animate-pulse text-[10px]">Đang tải lên...</span>}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={formData.media_link}
                        onChange={(e) => setFormData({...formData, media_link: e.target.value})}
                        className="flex-1 px-4 py-2.5 md:py-3 bg-pastel-blue/30 rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                        placeholder="Link hoặc tải tệp lên..."
                      />
                      <label className="bg-accent-blue hover:bg-accent-blue/90 text-white p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0">
                        <Upload size={18} />
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'media_link')} 
                          accept="image/*,video/*,audio/*"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 flex flex-col md:flex-row gap-3 md:gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="order-2 md:order-1 flex-1 px-6 py-3 md:py-4 rounded-full border border-pastel-purple-dark font-bold uppercase text-[10px] md:text-xs tracking-widest text-accent-purple hover:bg-pastel-purple/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="order-1 md:order-2 flex-1 bg-accent-purple text-white px-6 py-3 md:py-4 rounded-full font-bold uppercase text-[10px] md:text-xs tracking-widest hover:bg-accent-purple/90 transition-all shadow-lg"
                >
                  {editingQuestion ? 'Cập nhật' : 'Lưu câu hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-pastel-purple-dark p-6 md:p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#1E293B] mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-[#64748B] mb-8">Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-3 rounded-full border border-pastel-purple-dark font-bold uppercase text-[10px] tracking-widest text-accent-purple hover:bg-pastel-purple/10 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-red-600 transition-all shadow-lg"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
