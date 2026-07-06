import React, { useState, useEffect } from 'react';
import { firebaseService, uploadFile, type VCNVQuestion, type Category, type Profile } from '../lib/firebaseService';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  X, 
  Check, 
  HelpCircle, 
  FileText, 
  Download, 
  Upload, 
  Layers, 
  Image as ImageIcon,
  Video,
  Music,
  Eye,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { renderMediaPreview } from './QuestionBank';

interface VCNVManagerProps {
  user: Profile;
}

export default function VCNVManager({ user }: VCNVManagerProps) {
  const [questions, setQuestions] = useState<VCNVQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<VCNVQuestion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    keyword: '',
    image_url: '',
    media_link: '',
    central_question: '',
    central_answer: '',
    sub_questions: [
      { content: '', answer: '' },
      { content: '', answer: '' },
      { content: '', answer: '' },
      { content: '', answer: '' }
    ]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vcnvData, categoriesData] = await Promise.all([
        firebaseService.vcnv.getAll(),
        firebaseService.categories.getAll()
      ]);
      setQuestions(vcnvData);
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setFormData(prev => ({ ...prev, category_id: categoriesData[0].id }));
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu câu hỏi VCNV:', err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      keyword: '',
      image_url: '',
      media_link: '',
      central_question: '',
      central_answer: '',
      sub_questions: [
        { content: '', answer: '' },
        { content: '', answer: '' },
        { content: '', answer: '' },
        { content: '', answer: '' }
      ]
    });
    setEditingQuestion(null);
  };

  const openAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (q: VCNVQuestion) => {
    setEditingQuestion(q);
    setFormData({
      name: q.name || '',
      category_id: q.category_id || '',
      keyword: q.keyword || '',
      image_url: q.image_url || '',
      media_link: q.media_link || '',
      central_question: q.central_question || '',
      central_answer: q.central_answer || '',
      sub_questions: q.sub_questions && q.sub_questions.length === 4 
        ? q.sub_questions.map(sq => ({ content: sq.content || '', answer: sq.answer || '' }))
        : [
            { content: '', answer: '' },
            { content: '', answer: '' },
            { content: '', answer: '' },
            { content: '', answer: '' }
          ]
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'image_url' | 'media_link') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(targetField);
    try {
      const url = await uploadFile(file, 'cloudinary_vcnv');
      setFormData(prev => ({ ...prev, [targetField]: url }));
      alert('Tải lên Cloudinary thành công!');
    } catch (err: any) {
      alert('Lỗi tải tệp: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.keyword.trim()) {
      alert('Vui lòng điền đầy đủ tên và từ khóa chướng ngại vật.');
      return;
    }

    const payload = {
      ...formData,
      last_edited_by: user.id,
      created_by: editingQuestion ? editingQuestion.created_by : user.id
    };

    try {
      if (editingQuestion) {
        await firebaseService.vcnv.update(editingQuestion.id, payload);
        alert('Cập nhật câu hỏi VCNV thành công!');
      } else {
        await firebaseService.vcnv.create(payload);
        alert('Thêm câu hỏi VCNV thành công!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert('Lỗi khi lưu câu hỏi: ' + err.message);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await firebaseService.vcnv.delete(deleteConfirmId);
        setDeleteConfirmId(null);
        fetchData();
        alert('Xóa thành công!');
      } catch (err: any) {
        alert('Lỗi khi xóa câu hỏi: ' + err.message);
      }
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      q.keyword?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.central_question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.sub_questions?.some(sq => sq.content?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || q.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-accent-purple tracking-tight flex items-center gap-2">
            <Layers className="text-accent-purple shrink-0" size={28} />
            Bộ Câu Hỏi Vượt Chướng Ngại Vật
          </h2>
          <p className="text-[#64748B] text-xs md:text-sm mt-1">
            Thiết lập các bộ câu hỏi vượt chướng ngại vật độc lập (gồm 4 hàng ngang và từ khóa trung tâm). Phương tiện được lưu trữ trực tiếp trên Cloudinary.
          </p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-accent-purple text-white px-6 py-3 rounded-full font-bold uppercase text-[10px] md:text-xs tracking-widest hover:bg-accent-purple/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-accent-purple/20 shadow-accent-purple/10 self-start md:self-auto"
        >
          <Plus size={16} /> Thêm Bộ VCNV
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-pastel-purple-dark shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input 
            type="text"
            placeholder="Tìm kiếm bộ VCNV theo tên, từ khóa hoặc câu hỏi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-pastel-blue/30 rounded-2xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B] transition-all placeholder:text-[#94A3B8]"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative shrink-0 w-44">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-pastel-blue/30 rounded-2xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B] appearance-none cursor-pointer"
            >
              <option value="all">Tất cả lĩnh vực</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 border-4 border-pastel-purple border-t-accent-purple rounded-full animate-spin" />
          <span className="text-sm font-semibold text-accent-purple animate-pulse">Đang tải dữ liệu VCNV...</span>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-pastel-purple-dark p-12 md:p-20 text-center space-y-4">
          <div className="w-16 h-16 bg-pastel-purple/10 text-accent-purple rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Layers size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#1E293B]">Không tìm thấy bộ câu hỏi VCNV nào</h3>
            <p className="text-xs text-[#64748B]">Hãy tạo mới bộ câu hỏi Vượt chướng ngại vật đầu tiên của bạn bằng cách bấm nút "Thêm Bộ VCNV" ở góc trên bên phải.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredQuestions.map((q) => {
            const catName = categories.find(c => c.id === q.category_id)?.name || 'Chưa phân loại';
            return (
              <div 
                key={q.id} 
                className="bg-white rounded-3xl border border-pastel-purple-dark/80 p-5 md:p-8 hover:shadow-xl transition-all relative group overflow-hidden"
              >
                {/* Visual Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent-purple" />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-pastel-purple text-accent-purple text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {catName}
                      </span>
                      <span className="px-3 py-1 bg-[#F1F5F9] text-[#475569] text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Layers size={10} /> VCNV Separate
                      </span>
                    </div>

                    <h4 className="text-lg md:text-xl font-bold text-accent-purple tracking-tight">{q.name}</h4>
                    <p className="text-sm font-medium text-[#1E293B]">Từ khóa chính: <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md font-mono text-xs font-bold">{q.keyword}</span></p>
                  </div>

                  <div className="flex md:self-start gap-2 self-end">
                    <button 
                      onClick={() => openEdit(q)} 
                      className="p-2.5 bg-pastel-purple/20 hover:bg-pastel-purple text-accent-purple rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                    >
                      <Edit2 size={14} /> Chỉnh sửa
                    </button>
                    <button 
                      onClick={() => handleDelete(q.id)} 
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>

                {/* Sub Questions and Details Grid */}
                <div className="mt-6 pt-6 border-t border-pastel-purple-dark/50 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: 4 Sub Questions */}
                  <div className="lg:col-span-7 space-y-3">
                    <h5 className="text-[10px] uppercase tracking-widest font-bold text-accent-purple/80">4 Hàng Ngang Mảnh Ghép</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {q.sub_questions?.map((sq, idx) => (
                        <div key={idx} className="p-3 bg-pastel-blue/10 rounded-xl border border-pastel-blue-dark/30 text-xs">
                          <p className="font-semibold text-accent-blue mb-0.5">Hàng ngang {idx + 1}:</p>
                          <p className="text-[#1E293B] italic">{sq.content || '(Chưa cấu hình câu hỏi)'}</p>
                          <p className="font-bold font-mono text-accent-purple mt-1 flex items-center gap-1">
                            <span>Đáp án:</span>
                            <span className="bg-white border border-pastel-purple-dark/40 px-1.5 py-0.5 rounded text-[10px]">
                              {sq.answer || '(Trống)'}
                            </span>
                            {sq.answer && (
                              <span className="text-[9px] text-[#64748B] font-sans font-normal ml-1">
                                ({sq.answer.replace(/\s+/g, '').length} chữ cái)
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Central question and Cloudinary assets */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Central Question */}
                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-pastel-purple-dark/40 space-y-1.5 text-xs">
                      <h5 className="text-[10px] uppercase tracking-widest font-bold text-accent-purple">Gợi ý / Câu hỏi trung tâm</h5>
                      <p className="text-[#1E293B] italic">{q.central_question || '(Không có câu hỏi trung tâm)'}</p>
                      {q.central_answer && (
                        <p className="font-bold text-accent-purple">Đáp án trung tâm: <span className="bg-white border border-pastel-purple-dark/50 px-2 py-0.5 rounded font-mono text-xs">{q.central_answer}</span></p>
                      )}
                    </div>

                    {/* Image Suggestion */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-[#64748B] block mb-1">Hình ảnh đính kèm (Cloudinary)</span>
                        {q.image_url ? (
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-pastel-purple-dark">
                            <img src={q.image_url} alt="Gợi ý VCNV" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="aspect-[4/3] rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50 flex flex-col items-center justify-center text-[10px] text-[#64748B] p-2 text-center">
                            <ImageIcon size={20} className="opacity-40 mb-1" />
                            <span>Không có hình ảnh</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-[#64748B] block mb-1">Phương tiện bổ sung (Cloudinary)</span>
                        {q.media_link ? (
                          <div className="h-[75px] flex flex-col justify-between p-2 rounded-xl border border-pastel-purple-dark bg-slate-50 text-[10px]">
                            <div className="truncate font-semibold text-accent-blue flex items-center gap-1">
                              {q.media_link.toLowerCase().match(/\.(mp3|wav|m4a)/) ? <Music size={12} /> : <Video size={12} />}
                              <span>Tệp phương tiện</span>
                            </div>
                            <a 
                              href={q.media_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-accent-purple hover:underline truncate block"
                            >
                              {q.media_link}
                            </a>
                            <button 
                              onClick={() => window.open(q.media_link)} 
                              className="w-full text-[9px] font-bold uppercase bg-white border border-pastel-purple-dark rounded py-1 hover:bg-slate-100 transition-colors"
                            >
                              Mở tệp tin
                            </button>
                          </div>
                        ) : (
                          <div className="aspect-[4/3] rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50 flex flex-col items-center justify-center text-[10px] text-[#64748B] p-2 text-center">
                            <Music size={20} className="opacity-40 mb-1" />
                            <span>Không có âm thanh/video</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-[10px] text-[#94A3B8] font-semibold space-y-0.5">
                      <p>Ngày tạo: {q.created_at ? new Date(q.created_at).toLocaleDateString('vi-VN') : 'Không rõ'}</p>
                      {q.creator && <p>Người tạo: {q.creator.full_name}</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-pastel-purple-dark max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-pastel-purple-dark flex items-center justify-between bg-pastel-purple/30 shrink-0">
              <h3 className="text-xl md:text-2xl font-bold text-accent-purple flex items-center gap-2">
                <Layers size={24} />
                {editingQuestion ? 'Chỉnh Sửa Bộ Câu Hỏi VCNV' : 'Tạo Bộ Câu Hỏi VCNV Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-pastel-purple rounded-full transition-colors text-accent-purple">
                <X size={24} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Core Information Section */}
              <div className="bg-pastel-purple/5 p-4 md:p-6 rounded-2xl border border-pastel-purple-dark/50 space-y-4">
                <h4 className="font-bold text-accent-purple text-xs uppercase tracking-widest">1. Thông tin chung</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Tên bộ câu hỏi (Ví dụ: Chướng ngại vật trận 1)</label>
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark/80 focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      placeholder="Nhập tên bộ câu hỏi VCNV..."
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Lĩnh vực</label>
                    <select 
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark/80 focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      required
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Từ khóa CNV chính</label>
                    <input 
                      type="text"
                      value={formData.keyword}
                      onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark/80 focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B] font-bold text-accent-purple"
                      placeholder="Đáp án từ khóa CNV"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Câu hỏi gợi ý trung tâm</label>
                    <input 
                      type="text"
                      value={formData.central_question}
                      onChange={(e) => setFormData({...formData, central_question: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark/80 focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      placeholder="Gợi ý/Câu hỏi mảnh trung tâm"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Đáp án trung tâm</label>
                    <input 
                      type="text"
                      value={formData.central_answer}
                      onChange={(e) => setFormData({...formData, central_answer: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark/80 focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                      placeholder="Đáp án trung tâm"
                    />
                  </div>
                </div>
              </div>

              {/* Media assets Upload (Cloudinary) */}
              <div className="bg-pastel-blue/10 p-4 md:p-6 rounded-2xl border border-pastel-blue-dark/50 space-y-4">
                <h4 className="font-bold text-accent-blue text-xs uppercase tracking-widest flex items-center gap-1.5">
                  <ImageIcon size={14} /> 2. Upload file gợi ý lên Cloudinary (Hình ảnh & Âm thanh/Video)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B] flex items-center justify-between">
                      <span>Hình ảnh CNV (Cloudinary URL)</span>
                      {uploading === 'image_url' && <span className="text-accent-blue animate-pulse text-[10px]">Đang tải lên...</span>}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                        className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                        placeholder="Link ảnh gợi ý..."
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
                    {formData.image_url && renderMediaPreview(formData.image_url)}
                  </div>

                  {/* Audio/Video/Other field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B] flex items-center justify-between">
                      <span>File Media phụ trợ (Cloudinary URL)</span>
                      {uploading === 'media_link' && <span className="text-accent-blue animate-pulse text-[10px]">Đang tải lên...</span>}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={formData.media_link}
                        onChange={(e) => setFormData({...formData, media_link: e.target.value})}
                        className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
                        placeholder="Link video/âm thanh..."
                      />
                      <label className="bg-accent-purple hover:bg-accent-purple/90 text-white p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0">
                        <Upload size={18} />
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'media_link')} 
                          accept="audio/*,video/*"
                        />
                      </label>
                    </div>
                    {formData.media_link && renderMediaPreview(formData.media_link)}
                  </div>
                </div>
              </div>

              {/* 4 Sub Questions (Mảnh Ghép) Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-accent-purple text-xs uppercase tracking-widest border-b border-pastel-purple-dark/40 pb-2">
                  3. Bộ 4 hàng ngang / Mảnh ghép chi tiết
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.sub_questions.map((sq, sIdx) => (
                    <div key={sIdx} className="p-4 bg-slate-50 rounded-2xl border border-[#E2E8F0] space-y-3 relative">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                        <span className="font-bold text-accent-purple text-xs">HÀNG NGANG {sIdx + 1}</span>
                        {sq.answer && (
                          <span className="text-[10px] text-[#475569] font-mono font-bold bg-white border border-[#CBD5E1] px-1.5 py-0.5 rounded">
                            {sq.answer.replace(/\s+/g, '').length} CHỮ CÁI
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-bold text-[#64748B]">Câu hỏi hàng ngang {sIdx + 1}</label>
                        <textarea
                          value={sq.content}
                          onChange={(e) => {
                            const newSubs = [...formData.sub_questions];
                            newSubs[sIdx].content = e.target.value;
                            setFormData({ ...formData, sub_questions: newSubs });
                          }}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-accent-blue outline-none text-xs text-[#1E293B]"
                          placeholder={`Nội dung câu hỏi hàng ngang ${sIdx + 1}`}
                          rows={2}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-bold text-[#64748B]">Đáp án hàng ngang {sIdx + 1}</label>
                        <input
                          type="text"
                          value={sq.answer}
                          onChange={(e) => {
                            const newSubs = [...formData.sub_questions];
                            newSubs[sIdx].answer = e.target.value;
                            setFormData({ ...formData, sub_questions: newSubs });
                          }}
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-accent-blue outline-none text-xs text-[#1E293B] font-bold text-accent-blue"
                          placeholder={`Đáp án hàng ngang ${sIdx + 1} (Không dấu/có dấu đều được)`}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-pastel-purple-dark/40 flex flex-col md:flex-row gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="order-2 md:order-1 flex-1 px-6 py-3.5 rounded-full border border-pastel-purple-dark font-bold uppercase text-[10px] md:text-xs tracking-widest text-accent-purple hover:bg-pastel-purple/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="order-1 md:order-2 flex-1 bg-accent-purple text-white px-6 py-3.5 rounded-full font-bold uppercase text-[10px] md:text-xs tracking-widest hover:bg-accent-purple/90 transition-all shadow-lg hover:shadow-accent-purple/20 shadow-accent-purple/10"
                >
                  {editingQuestion ? 'Cập nhật bộ VCNV' : 'Tạo mới bộ VCNV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full border border-pastel-purple-dark text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-lg text-[#1E293B]">Xác nhận xóa bộ VCNV?</h4>
              <p className="text-xs text-[#64748B]">Bạn có chắc muốn xóa bộ câu hỏi Vượt chướng ngại vật này? Hành động này sẽ không thể khôi phục lại.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-full border border-slate-300 text-xs font-bold text-[#64748B] hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-full text-xs font-bold text-white transition-colors shadow-md shadow-red-500/10"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
