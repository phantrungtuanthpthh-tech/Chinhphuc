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
  AlertCircle,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { renderMediaPreview } from './QuestionBank';

export const renderVCNVMediaPreview = (url: string, showRedGrid = false) => {
  if (!url) return null;
  const lowercaseUrl = url.toLowerCase();
  
  const isImage = lowercaseUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || lowercaseUrl.includes('image/upload') || (lowercaseUrl.includes('res.cloudinary.com') && !lowercaseUrl.includes('/video/') && !lowercaseUrl.includes('/raw/'));
  const isVideo = lowercaseUrl.match(/\.(mp4|webm|ogg|mov)/i) || lowercaseUrl.includes('video/upload');
  const isAudio = lowercaseUrl.match(/\.(mp3|wav|ogg|m4a|flac)/i) || lowercaseUrl.includes('raw/upload') || lowercaseUrl.includes('.mp3') || lowercaseUrl.includes('.wav') || lowercaseUrl.includes('.m4a');

  if (isImage) {
    if (showRedGrid) {
      return (
        <div className="mt-3 relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-2 border-red-500 bg-black shadow-md">
          <img src={url} alt="Bản xem trước hình ảnh" className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 pointer-events-none">
            {/* Center rectangle */}
            <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] border-2 border-red-500 bg-red-500/15 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.5)] rounded-md">
              <span className="text-white bg-red-600 px-2 py-0.5 rounded font-bold text-[9px] md:text-xs shadow border border-white/10 uppercase tracking-wider">Trung tâm</span>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            <div className="absolute top-3 left-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow border border-white/20">1</div>
            <div className="absolute top-3 right-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow border border-white/20">2</div>
            <div className="absolute bottom-3 right-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow border border-white/20">3</div>
            <div className="absolute bottom-3 left-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow border border-white/20">4</div>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-2 relative rounded-xl overflow-hidden border border-pastel-blue-dark max-h-48 flex justify-center bg-black/5 p-1">
        <img src={url} alt="Bản xem trước hình ảnh" className="object-contain max-h-40 rounded-lg" referrerPolicy="no-referrer" />
      </div>
    );
  } else if (isVideo) {
    return (
      <div className="mt-2 relative rounded-xl overflow-hidden border border-pastel-blue-dark max-h-48 flex justify-center bg-black">
        <video src={url} controls className="w-full max-h-40 rounded-lg" />
      </div>
    );
  } else if (isAudio) {
    return (
      <div className="mt-2 p-3 rounded-xl border border-pastel-blue-dark bg-white/50 flex flex-col gap-1">
        <span className="text-[10px] text-accent-purple font-semibold">Xem trước âm thanh:</span>
        <audio src={url} controls className="w-full" />
      </div>
    );
  } else {
    return (
      <div className="mt-2 p-2 rounded-xl bg-pastel-blue/20 border border-dashed border-pastel-blue-dark text-center text-xs text-[#1E293B]">
        <p className="font-semibold text-accent-blue mb-1">Tệp đính kèm:</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-purple break-all">{url}</a>
      </div>
    );
  }
};

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

  // Cloudinary Settings States
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);
  const [cloudNameInput, setCloudNameInput] = useState(() => localStorage.getItem('cloudinary_cloud_name') || '');
  const [uploadPresetInput, setUploadPresetInput] = useState(() => localStorage.getItem('cloudinary_upload_preset') || '');

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

  const handleSaveCloudinary = (e: React.FormEvent) => {
    e.preventDefault();
    if (cloudNameInput.trim()) {
      localStorage.setItem('cloudinary_cloud_name', cloudNameInput.trim());
    } else {
      localStorage.removeItem('cloudinary_cloud_name');
    }
    if (uploadPresetInput.trim()) {
      localStorage.setItem('cloudinary_upload_preset', uploadPresetInput.trim());
    } else {
      localStorage.removeItem('cloudinary_upload_preset');
    }
    alert('Đã lưu cấu hình Cloudinary thành công! Các lượt tải lên tiếp theo sẽ sử dụng cấu hình mới này.');
    setShowCloudinaryConfig(false);
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
        <div className="flex gap-2 self-start md:self-auto">
          <button 
            onClick={() => setShowCloudinaryConfig(!showCloudinaryConfig)}
            className="px-4 py-3 rounded-full border border-pastel-purple-dark text-accent-purple font-bold text-xs tracking-wider hover:bg-pastel-purple/10 transition-all flex items-center gap-2 bg-white shadow-sm"
          >
            <Settings size={16} /> Cấu hình Cloudinary
          </button>
          <button 
            onClick={openAdd}
            className="bg-accent-purple text-white px-6 py-3 rounded-full font-bold uppercase text-[10px] md:text-xs tracking-widest hover:bg-accent-purple/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-accent-purple/20 shadow-accent-purple/10"
          >
            <Plus size={16} /> Thêm Bộ VCNV
          </button>
        </div>
      </div>

      {/* Cloudinary Settings Panel */}
      {showCloudinaryConfig && (
        <form 
          onSubmit={handleSaveCloudinary}
          className="bg-gradient-to-br from-pastel-purple/20 to-white p-5 md:p-6 rounded-3xl border border-pastel-purple-dark shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-2 border-b border-pastel-purple-dark/40 pb-2">
            <Settings size={18} className="text-accent-purple" />
            <h3 className="font-bold text-sm text-[#1E293B] uppercase tracking-wider">Cấu hình tải ảnh/video/âm thanh lên Cloudinary của bạn</h3>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Nếu bạn gặp lỗi khi tải phương tiện lên, vui lòng kiểm tra và dán thông tin Cloud Name và tên <strong>Unsigned Upload Preset</strong> từ tài khoản Cloudinary của bạn bên dưới. Hệ thống sẽ ghi nhớ cấu hình này trực tiếp trên trình duyệt của bạn.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Cloud name (Tên đám mây)</label>
              <input 
                type="text"
                value={cloudNameInput}
                onChange={(e) => setCloudNameInput(e.target.value)}
                placeholder="Ví dụ: hckpdc6f"
                className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Unsigned Upload Preset (Tên bộ cài đặt không ký danh)</label>
              <input 
                type="text"
                value={uploadPresetInput}
                onChange={(e) => setUploadPresetInput(e.target.value)}
                placeholder="Mặc định: ml_default (Hãy tạo một Unsigned Preset trong Settings -> Upload)"
                className="w-full px-4 py-2.5 bg-white rounded-xl border border-pastel-purple-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm text-[#1E293B]"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              type="button"
              onClick={() => {
                setCloudNameInput('');
                setUploadPresetInput('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl"
            >
              Đặt lại mặc định
            </button>
            <button 
              type="submit"
              className="bg-accent-purple text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-accent-purple/90 transition-all shadow shadow-accent-purple/10"
            >
              Lưu cài đặt
            </button>
          </div>
        </form>
      )}

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

                    {/* Image Suggestion with 5-part red line grid (Larger image) */}
                    <div className="space-y-3">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-[#64748B] block mb-1">
                        Hình ảnh gợi ý VCNV (Phân chia 5 phần)
                      </span>
                      {q.image_url ? (
                        <div className="relative w-full aspect-[4/3] md:aspect-[16/10] rounded-2xl overflow-hidden border-2 border-red-500/30 bg-black shadow-md group/preview">
                          <img 
                            src={q.image_url} 
                            alt="Gợi ý VCNV" 
                            className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover/preview:scale-105" 
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Red grid lines overlay */}
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Center rectangle */}
                            <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] border-2 border-red-500 bg-red-500/10 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.4)] rounded-md">
                              <span className="text-white bg-red-600 px-2 py-0.5 rounded font-bold text-[9px] md:text-xs shadow border border-white/10 uppercase tracking-wider">
                                Trung tâm
                              </span>
                            </div>

                            {/* Top vertical line */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />

                            {/* Bottom vertical line */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />

                            {/* Left horizontal line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />

                            {/* Right horizontal line */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-[30%] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />

                            {/* Labels for the corners */}
                            <div className="absolute top-3 left-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-white/20 animate-pulse">
                              1
                            </div>
                            <div className="absolute top-3 right-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-white/20 animate-pulse">
                              2
                            </div>
                            <div className="absolute bottom-3 right-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-white/20 animate-pulse">
                              3
                            </div>
                            <div className="absolute bottom-3 left-3 bg-red-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-white/20 animate-pulse">
                              4
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-[16/10] rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50 flex flex-col items-center justify-center text-[10px] text-[#64748B] p-4 text-center">
                          <ImageIcon size={28} className="opacity-40 mb-1" />
                          <span>Không có hình ảnh đính kèm</span>
                        </div>
                      )}
                    </div>

                    {/* Extra media (Music / Video) - displayed only as an icon and small info */}
                    {q.media_link && (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center shrink-0">
                            {q.media_link.toLowerCase().match(/\.(mp3|wav|m4a|ogg|flac)/) || q.media_link.includes('audio/') ? (
                              <Music size={18} />
                            ) : (
                              <Video size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1E293B] truncate">Phương tiện bổ trợ</p>
                            <p className="text-[10px] text-[#64748B] truncate">{q.media_link}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => window.open(q.media_link)}
                          className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-lg text-[10px] font-bold uppercase transition-all shrink-0 flex items-center gap-1 text-[#475569]"
                        >
                          <ExternalLink size={10} /> Mở tệp
                        </button>
                      </div>
                    )}

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
                    {formData.image_url && renderVCNVMediaPreview(formData.image_url, true)}
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
                    {formData.media_link && renderVCNVMediaPreview(formData.media_link)}
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
