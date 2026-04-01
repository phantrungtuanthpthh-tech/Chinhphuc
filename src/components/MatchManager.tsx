import React, { useState, useEffect } from 'react';
import { supabase, type Match, type Category, type Question, type Profile, type MatchMatrix } from '../lib/supabase';
import { 
  Plus, 
  Trophy, 
  Download, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Filter,
  X,
  Save,
  Check,
  FileSpreadsheet,
  HelpCircle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

interface MatchManagerProps {
  user: Profile;
}

const INITIAL_MATRIX: MatchMatrix = {
  khoi_dong: {
    private: Array.from({ length: 4 }, (_, i) => ({ contestant_id: i + 1, question_ids: Array(6).fill(''), category_ids: Array(6).fill('') })),
    common: { question_ids: Array(12).fill(''), category_ids: Array(12).fill('') }
  },
  ve_dich: {
    question_ids: Array(6).fill(''),
    category_ids: Array(6).fill('')
  },
  ve_dich_full: {
    contestants: Array.from({ length: 4 }, (_, i) => ({ contestant_id: i + 1, question_ids: Array(9).fill(''), category_ids: Array(9).fill('') }))
  }
};

export default function MatchManager({ user }: MatchManagerProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1: Matrix, 2: Selection
  const [matchName, setMatchName] = useState('');
  const [matrix, setMatrix] = useState<MatchMatrix>(INITIAL_MATRIX);
  
  // Selection state
  const [activeSlot, setActiveSlot] = useState<{ section: string; index: number; contestantIdx?: number } | null>(null);
  const [selectionQuestions, setSelectionQuestions] = useState<Question[]>([]);
  const [selectionLoading, setSelectionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [mRes, cRes] = await Promise.all([
      supabase.from('matches').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name')
    ]);
    if (mRes.data) setMatches(mRes.data);
    if (cRes.data) setCategories(cRes.data);
    setLoading(false);
  };

  const handleSaveMatch = async () => {
    if (!matchName.trim()) return alert('Vui lòng nhập tên trận đấu.');
    
    if (editingMatch) {
      const { error } = await supabase.from('matches').update({
        name: matchName,
        matrix: matrix
      }).eq('id', editingMatch.id);

      if (error) return alert('Lỗi khi cập nhật trận đấu.');
    } else {
      const { error } = await supabase.from('matches').insert([{
        name: matchName,
        matrix: matrix,
        is_published: false
      }]);

      if (error) return alert('Lỗi khi tạo trận đấu.');
    }
    
    fetchData();
    setIsCreating(false);
    setEditingMatch(null);
    setMatchName('');
    setMatrix(INITIAL_MATRIX);
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setMatchName(match.name);
    setMatrix(match.matrix);
    setIsCreating(false);
  };

  const handleDeleteMatch = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa trận đấu này?')) {
      await supabase.from('matches').delete().eq('id', id);
      fetchData();
    }
  };

  const togglePublish = async (match: Match) => {
    const newStatus = !match.is_published;
    const { error } = await supabase.from('matches').update({ is_published: newStatus }).eq('id', match.id);
    if (!error) {
      // If publishing, update questions with this match ID
      if (newStatus) {
        const questionIds = extractAllQuestionIds(match.matrix);
        // This is a simplified update, in production you'd use a RPC or multiple updates
        for (const qid of questionIds) {
          if (qid) {
            const { data: q } = await supabase.from('questions').select('used_match_ids').eq('id', qid).single();
            if (q && !q.used_match_ids.includes(match.id)) {
              await supabase.from('questions').update({ used_match_ids: [...q.used_match_ids, match.id] }).eq('id', qid);
            }
          }
        }
      }
      fetchData();
      if (editingMatch && editingMatch.id === match.id) {
        setEditingMatch({ ...editingMatch, is_published: newStatus });
      }
    }
  };

  const extractAllQuestionIds = (m: MatchMatrix): string[] => {
    const ids: string[] = [];
    m.khoi_dong.private.forEach(c => ids.push(...c.question_ids));
    ids.push(...m.khoi_dong.common.question_ids);
    ids.push(...m.ve_dich.question_ids);
    m.ve_dich_full.contestants.forEach(c => ids.push(...c.question_ids));
    return Array.from(new Set(ids.filter(id => id)));
  };

  const getCompletionStats = (m: MatchMatrix) => {
    const total = 78;
    const filled = extractAllQuestionIds(m).length;
    const percentage = Math.round((filled / total) * 100);
    return { total, filled, percentage };
  };

  const handleExportExcel = (match: Match) => {
    const data: any[] = [];
    // Add Khoi Dong
    data.push(["PHẦN KHỞI ĐỘNG"]);
    match.matrix.khoi_dong.private.forEach(c => {
      data.push([`Thí sinh ${c.contestant_id}`]);
      c.question_ids.forEach((qid, idx) => {
        data.push([`Câu ${idx + 1}`, qid || "Chưa chọn"]);
      });
    });
    // ... add more sections ...
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trận đấu");
    XLSX.writeFile(wb, `${match.name}.xlsx`);
  };

  const openSelection = async (section: string, index: number, contestantIdx?: number) => {
    setActiveSlot({ section, index, contestantIdx });
    setSelectionLoading(true);
    
    let categoryId = '';
    let difficulty = '';

    if (section === 'khoi_dong_private') {
      categoryId = matrix.khoi_dong.private[contestantIdx!].category_ids[index];
      difficulty = 'Khởi động';
    } else if (section === 'khoi_dong_common') {
      categoryId = matrix.khoi_dong.common.category_ids[index];
      difficulty = 'Khởi động';
    } else if (section === 've_dich') {
      categoryId = matrix.ve_dich.category_ids[index];
      difficulty = '20 điểm';
    } else if (section === 've_dich_full') {
      categoryId = matrix.ve_dich_full.contestants[contestantIdx!].category_ids[index];
      // 3x10, 3x20, 3x10
      difficulty = index < 3 ? '10 điểm' : index < 6 ? '20 điểm' : '10 điểm';
    }

    const query = supabase.from('questions').select('*');
    if (categoryId) query.eq('category_id', categoryId);
    if (difficulty) query.eq('difficulty', difficulty);

    const { data } = await query;
    if (data) setSelectionQuestions(data);
    setSelectionLoading(false);
  };

  const selectQuestion = (q: Question) => {
    if (!activeSlot) return;
    const { section, index, contestantIdx } = activeSlot;
    const newMatrix = { ...matrix };

    if (section === 'khoi_dong_private') {
      newMatrix.khoi_dong.private[contestantIdx!].question_ids[index] = q.id;
    } else if (section === 'khoi_dong_common') {
      newMatrix.khoi_dong.common.question_ids[index] = q.id;
    } else if (section === 've_dich') {
      newMatrix.ve_dich.question_ids[index] = q.id;
    } else if (section === 've_dich_full') {
      newMatrix.ve_dich_full.contestants[contestantIdx!].question_ids[index] = q.id;
    }

    setMatrix(newMatrix);
    setActiveSlot(null);
  };

  const updateMatrixCategory = (section: string, index: number, catId: string, contestantIdx?: number) => {
    const newMatrix = { ...matrix };
    if (section === 'khoi_dong_private') {
      newMatrix.khoi_dong.private[contestantIdx!].category_ids[index] = catId;
    } else if (section === 'khoi_dong_common') {
      newMatrix.khoi_dong.common.category_ids[index] = catId;
    } else if (section === 've_dich') {
      newMatrix.ve_dich.category_ids[index] = catId;
    } else if (section === 've_dich_full') {
      newMatrix.ve_dich_full.contestants[contestantIdx!].category_ids[index] = catId;
    }
    setMatrix(newMatrix);
  };

  if (isCreating || editingMatch) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => { setIsCreating(false); setEditingMatch(null); }} className="p-2 hover:bg-pastel-purple rounded-full transition-colors text-accent-purple">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-accent-purple">
                {editingMatch ? 'Quản lý trận đấu' : 'Tạo trận đấu mới'}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-[#64748B] italic font-serif">
                  {editingMatch ? `Đang chỉnh sửa: ${editingMatch.name}` : `Bước ${step}: ${step === 1 ? 'Thiết lập ma trận lĩnh vực' : 'Lấy câu hỏi chi tiết'}`}
                </p>
                <div className="h-4 w-px bg-pastel-purple-dark" />
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-white rounded-full overflow-hidden border border-pastel-purple-dark">
                    <div 
                      className="h-full bg-accent-purple transition-all duration-500" 
                      style={{ width: `${getCompletionStats(matrix).percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent-purple opacity-60">
                    {getCompletionStats(matrix).filled}/78 câu hỏi đã chọn
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <input 
              type="text" 
              placeholder="Tên trận đấu (VD: Trận 1 - Tháng 1)"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              className="px-4 py-3 bg-white rounded-xl border border-pastel-purple-dark focus:ring-2 focus:ring-accent-purple outline-none text-sm w-64 shadow-sm"
            />
            {editingMatch && (
              <>
                <button 
                  onClick={() => togglePublish(editingMatch)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-md flex items-center gap-2",
                    editingMatch.is_published 
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  )}
                >
                  <CheckCircle2 size={16} />
                  {editingMatch.is_published ? "Hủy công khai" : "Công khai"}
                </button>
                <button 
                  onClick={() => handleExportExcel(editingMatch)}
                  className="bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-200 transition-all shadow-md flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} /> Xuất Excel
                </button>
              </>
            )}
            <button 
              onClick={handleSaveMatch}
              className="bg-accent-purple text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-accent-purple/90 transition-all shadow-lg flex items-center gap-2"
            >
              <Save size={16} /> {editingMatch ? 'Cập nhật' : 'Lưu trận đấu'}
            </button>
          </div>
        </div>

        {/* Matrix Editor */}
        <div className="space-y-12">
          {/* Section: Khoi Dong */}
          <section className="bg-white p-8 rounded-3xl border border-pastel-purple-dark shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-pastel-purple-dark pb-4">
              <div className="w-10 h-10 bg-pastel-blue text-accent-blue rounded-xl flex items-center justify-center font-bold">1</div>
              <h3 className="text-xl font-bold text-accent-blue">Phần Khởi động</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-[#64748B] opacity-60 ml-auto">36 câu hỏi mức Khởi động</span>
            </div>

            <div className="space-y-8">
              {matrix.khoi_dong.private.map((c, cIdx) => (
                <div key={cIdx} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-accent-purple opacity-50">Thí sinh {c.contestant_id} (6 câu riêng)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {c.category_ids.map((catId, qIdx) => (
                      <div key={qIdx} className="space-y-2">
                        <select 
                          value={catId}
                          onChange={(e) => updateMatrixCategory('khoi_dong_private', qIdx, e.target.value, cIdx)}
                          className="w-full text-[10px] p-2 bg-pastel-blue/30 rounded-lg border border-pastel-blue-dark focus:ring-1 focus:ring-accent-blue outline-none"
                        >
                          <option value="">Lĩnh vực</option>
                          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button 
                          onClick={() => openSelection('khoi_dong_private', qIdx, cIdx)}
                          className={cn(
                            "w-full py-2 rounded-lg text-[10px] font-bold border transition-all",
                            c.question_ids[qIdx] ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-pastel-purple-dark text-[#64748B] hover:border-accent-purple"
                          )}
                        >
                          {c.question_ids[qIdx] ? "Đã chọn" : "Chọn câu"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-3 pt-4 border-t border-pastel-purple-dark">
                <h4 className="text-xs font-bold uppercase tracking-widest text-accent-purple opacity-50">12 câu hỏi chung</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {matrix.khoi_dong.common.category_ids.map((catId, qIdx) => (
                    <div key={qIdx} className="space-y-2">
                      <select 
                        value={catId}
                        onChange={(e) => updateMatrixCategory('khoi_dong_common', qIdx, e.target.value)}
                        className="w-full text-[10px] p-2 bg-pastel-blue/30 rounded-lg border border-pastel-blue-dark focus:ring-1 focus:ring-accent-blue outline-none"
                      >
                        <option value="">Lĩnh vực</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <button 
                        onClick={() => openSelection('khoi_dong_common', qIdx)}
                        className={cn(
                          "w-full py-2 rounded-lg text-[10px] font-bold border transition-all",
                          matrix.khoi_dong.common.question_ids[qIdx] ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-pastel-purple-dark text-[#64748B] hover:border-accent-purple"
                        )}
                      >
                        {matrix.khoi_dong.common.question_ids[qIdx] ? "Đã chọn" : "Chọn câu"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Ve Dich */}
          <section className="bg-white p-8 rounded-3xl border border-pastel-purple-dark shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-pastel-purple-dark pb-4">
              <div className="w-10 h-10 bg-pastel-purple text-accent-purple rounded-xl flex items-center justify-center font-bold">2</div>
              <h3 className="text-xl font-bold text-accent-purple">Phần Về đích</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-[#64748B] opacity-60 ml-auto">6 câu hỏi mức 20 điểm</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {matrix.ve_dich.category_ids.map((catId, qIdx) => (
                <div key={qIdx} className="space-y-2">
                  <select 
                    value={catId}
                    onChange={(e) => updateMatrixCategory('ve_dich', qIdx, e.target.value)}
                    className="w-full text-[10px] p-2 bg-pastel-purple/30 rounded-lg border border-pastel-purple-dark focus:ring-1 focus:ring-accent-purple outline-none"
                  >
                    <option value="">Lĩnh vực</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  <button 
                    onClick={() => openSelection('ve_dich', qIdx)}
                    className={cn(
                      "w-full py-2 rounded-lg text-[10px] font-bold border transition-all",
                      matrix.ve_dich.question_ids[qIdx] ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-pastel-purple-dark text-[#64748B] hover:border-accent-purple"
                    )}
                  >
                    {matrix.ve_dich.question_ids[qIdx] ? "Đã chọn" : "Chọn câu"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Ve Dich Full */}
          <section className="bg-white p-8 rounded-3xl border border-pastel-purple-dark shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-pastel-purple-dark pb-4">
              <div className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center font-bold">3</div>
              <h3 className="text-xl font-bold text-red-700">Phần Về đích Full</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-[#64748B] opacity-60 ml-auto">36 câu hỏi (10-20-10)</span>
            </div>
            <div className="space-y-8">
              {matrix.ve_dich_full.contestants.map((c, cIdx) => (
                <div key={cIdx} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-accent-purple opacity-50">Thí sinh {c.contestant_id} (9 câu)</h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                    {c.category_ids.map((catId, qIdx) => (
                      <div key={qIdx} className="space-y-2">
                        <div className={cn(
                          "text-[8px] text-center font-bold uppercase",
                          qIdx < 3 || qIdx >= 6 ? "text-green-600" : "text-yellow-600"
                        )}>
                          {qIdx < 3 || qIdx >= 6 ? "10đ" : "20đ"}
                        </div>
                        <select 
                          value={catId}
                          onChange={(e) => updateMatrixCategory('ve_dich_full', qIdx, e.target.value, cIdx)}
                          className="w-full text-[8px] p-1 bg-pastel-blue/30 rounded border border-pastel-blue-dark focus:ring-1 focus:ring-accent-blue outline-none"
                        >
                          <option value="">Lĩnh vực</option>
                          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button 
                          onClick={() => openSelection('ve_dich_full', qIdx, cIdx)}
                          className={cn(
                            "w-full py-1 rounded text-[8px] font-bold border transition-all",
                            c.question_ids[qIdx] ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-pastel-purple-dark text-[#64748B] hover:border-accent-purple"
                          )}
                        >
                          {c.question_ids[qIdx] ? "Đã chọn" : "Chọn"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Selection Modal */}
        {activeSlot && (
          <div className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-pastel-purple-dark">
              <div className="p-8 border-b border-pastel-purple-dark flex items-center justify-between bg-pastel-purple/30">
                <div>
                  <h3 className="text-2xl font-bold text-accent-purple">Chọn câu hỏi</h3>
                  <p className="text-xs text-[#64748B] uppercase tracking-widest font-bold mt-1">
                    {activeSlot.section.replace('_', ' ')} - Vị trí {activeSlot.index + 1}
                  </p>
                </div>
                <button onClick={() => setActiveSlot(null)} className="p-2 hover:bg-pastel-purple rounded-full transition-colors text-accent-purple">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-white">
                {selectionLoading ? (
                  <div className="h-full flex items-center justify-center italic text-[#64748B] opacity-60">Đang tìm kiếm câu hỏi phù hợp...</div>
                ) : selectionQuestions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <HelpCircle size={48} className="text-pastel-purple-dark" />
                    <p className="italic text-[#64748B] opacity-60">Không tìm thấy câu hỏi nào phù hợp với lĩnh vực và mức độ này.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {selectionQuestions.map((q) => (
                      <button 
                        key={q.id}
                        onClick={() => selectQuestion(q)}
                        className="text-left p-6 rounded-2xl border border-pastel-purple-dark hover:border-accent-purple hover:bg-pastel-purple/10 transition-all group relative shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-purple opacity-60">
                            {categories.find(c => c.id === q.category_id)?.name} • {q.difficulty}
                          </span>
                          {q.used_match_ids.length > 0 && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold uppercase">
                              Đã dùng {q.used_match_ids.length} lần
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-2 text-[#1E293B]">{q.content}</p>
                        <p className="text-xs italic text-[#64748B]">Đáp án: {q.answer}</p>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 bg-accent-purple text-white rounded-full flex items-center justify-center shadow-md">
                            <Check size={20} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1 text-accent-purple">Quản lý Trận đấu</h2>
          <p className="text-sm text-[#64748B] italic font-serif">Tạo ma trận, chọn câu hỏi và công khai các trận thi đấu.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-accent-purple text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-accent-purple/90 transition-all shadow-lg hover:shadow-xl font-bold"
        >
          <Plus size={20} />
          <span>Tạo trận đấu mới</span>
        </button>
      </div>

      {/* Match List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-[#64748B] opacity-60 italic">Đang tải dữ liệu...</div>
        ) : matches.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[#64748B] opacity-60 italic">Chưa có trận đấu nào được tạo.</div>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="bg-white rounded-[32px] border border-pastel-purple-dark shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    match.is_published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {match.is_published ? "Đã công khai" : "Bản nháp"}
                  </div>
                  <div className="text-[10px] text-[#64748B] opacity-60 font-mono">
                    {new Date(match.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <button 
                  onClick={() => handleEditMatch(match)}
                  className="text-xl font-bold mb-2 text-accent-purple hover:text-accent-purple/70 transition-colors text-left w-full"
                >
                  {match.name}
                </button>
                <div className="flex items-center gap-4 text-xs text-[#64748B] opacity-60">
                  <div className="flex items-center gap-1">
                    <FileText size={14} /> {extractAllQuestionIds(match.matrix).length}/78 câu
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-pastel-purple/20 flex items-center justify-between gap-2 border-t border-pastel-purple-dark">
                <div className="flex gap-1">
                  <button 
                    onClick={() => togglePublish(match)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      match.is_published ? "text-green-600 hover:bg-green-100" : "text-yellow-600 hover:bg-yellow-100"
                    )}
                    title={match.is_published ? "Hủy công khai" : "Công khai trận đấu"}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleExportExcel(match)}
                    className="p-2 text-accent-blue hover:bg-pastel-blue rounded-lg transition-all"
                    title="Tải xuống Excel"
                  >
                    <FileSpreadsheet size={18} />
                  </button>
                </div>
                <button 
                  onClick={() => handleDeleteMatch(match.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Xóa trận đấu"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
