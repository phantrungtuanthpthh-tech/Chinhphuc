import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle2, AlertTriangle, RefreshCw, FileCode, Server } from 'lucide-react';

interface DataImporterProps {
  user: { role: string };
}

type TableType = 'profiles' | 'categories' | 'questions' | 'matches' | 'notifications';

export default function DataImporter({ user }: DataImporterProps) {
  const [selectedTable, setSelectedTable] = useState<TableType>('questions');
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [importCount, setImportCount] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Verify it is valid JSON
        JSON.parse(text);
        setJsonText(text);
        setStatus({ type: 'idle', message: `Đã tải tệp "${file.name}" thành công!` });
      } catch (err: any) {
        setStatus({ type: 'error', message: 'Tệp tải lên không đúng định dạng JSON hợp lệ: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setStatus({ type: 'error', message: 'Vui lòng dán nội dung JSON hoặc tải tệp lên trước.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Đang xử lý và lưu dữ liệu vào Firebase Firestore...' });
    setImportCount(0);

    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      if (items.length === 0) {
        setStatus({ type: 'error', message: 'Dữ liệu JSON là mảng rỗng, không có gì để nhập.' });
        return;
      }

      // Perform the upload batch-by-batch
      let successCount = 0;
      for (const item of items) {
        // Prepare clean item for Firestore (remove metadata if present)
        const cleanItem = { ...item };
        
        // Ensure id is present or let firestore auto-generate
        const id = cleanItem.id || undefined;
        
        // Save to target collection
        const { error } = await supabase.from(selectedTable).insert([cleanItem]);
        if (error) {
          throw new Error(`Lỗi ở dòng dữ liệu thứ ${successCount + 1}: ${error.message || error}`);
        }
        successCount++;
        setImportCount(successCount);
      }

      setStatus({ 
        type: 'success', 
        message: `Đã nhập thành công ${successCount} bản ghi vào bộ sưu tập "${selectedTable}" trên Firebase!` 
      });
      setJsonText('');
    } catch (err: any) {
      console.error('Import error:', err);
      setStatus({ 
        type: 'error', 
        message: 'Có lỗi xảy ra trong quá trình nhập dữ liệu: ' + err.message 
      });
    }
  };

  if (user.role !== 'owner' && user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-[#64748B] bg-white rounded-3xl border border-pastel-purple-dark">
        Quyền truy cập bị từ chối. Chỉ Quản trị viên mới được phép sử dụng công cụ này.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-pastel-purple-dark shadow-sm p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pastel-purple-dark/50 pb-5">
        <div>
          <h2 className="text-xl font-bold text-accent-purple flex items-center gap-2">
            <Server size={22} /> Nhập dữ liệu từ Supabase sang Firebase
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Công cụ hỗ trợ chuyển đổi dữ liệu nhanh chóng bằng cách tải lên tệp JSON xuất ra từ Supabase.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Options Card */}
        <div className="space-y-4 bg-pastel-blue/20 p-5 rounded-2xl border border-pastel-blue-dark">
          <p className="font-bold text-accent-blue text-xs uppercase tracking-wider">Cấu hình Nhập liệu</p>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#64748B]">Bộ sưu tập đích (Table)</label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value as TableType)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-pastel-blue-dark focus:ring-2 focus:ring-accent-blue outline-none text-sm"
            >
              <option value="categories">Lĩnh vực (categories)</option>
              <option value="questions">Ngân hàng Câu hỏi (questions)</option>
              <option value="matches">Trận đấu (matches)</option>
              <option value="profiles">Ban biên tập (profiles)</option>
              <option value="notifications">Thông báo (notifications)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#64748B] block">Tải tệp JSON</label>
            <label className="w-full flex flex-col items-center justify-center py-4 bg-white rounded-xl border border-dashed border-accent-blue cursor-pointer hover:bg-pastel-blue/30 transition-all text-center">
              <Upload size={24} className="text-accent-blue mb-2 animate-bounce" />
              <span className="text-xs font-medium text-accent-blue">Chọn tệp .json từ thiết bị</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-pastel-purple-dark text-[11px] text-[#64748B] space-y-1">
            <p className="font-bold text-accent-purple">⚠️ Lưu ý quan trọng:</p>
            <ul className="list-disc pl-3 space-y-1">
              <li>Đảm bảo định dạng JSON là một mảng các đối tượng (array of objects).</li>
              <li>Nhập <strong>Lĩnh vực (categories)</strong> và <strong>Ban biên tập (profiles)</strong> trước khi nhập câu hỏi để giữ đúng liên kết quan hệ dữ liệu.</li>
              <li>Hệ thống tự động đồng bộ hóa với Firestore theo cấu hình của bạn.</li>
            </ul>
          </div>
        </div>

        {/* Right Editor/Input Card */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-accent-purple text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileCode size={16} /> Dán nội dung JSON trực tiếp
            </p>
            {jsonText && (
              <button 
                onClick={() => setJsonText('')}
                className="text-xs text-[#64748B] hover:text-red-500 font-medium"
              >
                Xóa sạch
              </button>
            )}
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-64 p-4 font-mono text-xs bg-[#1E293B] text-emerald-400 rounded-2xl border border-[#334155] focus:ring-2 focus:ring-accent-blue outline-none"
            placeholder={`[\n  {\n    "id": "q1",\n    "content": "Câu hỏi mẫu",\n    "answer": "Đáp án mẫu",\n    "difficulty": "Khởi động",\n    "category_id": "cat_id"\n  }\n]`}
          />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              {status.type === 'loading' && (
                <div className="flex items-center gap-2 text-xs text-accent-blue">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{status.message} ({importCount} bản ghi đã xử lý)</span>
                </div>
              )}
              {status.type === 'success' && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 size={16} />
                  <span>{status.message}</span>
                </div>
              )}
              {status.type === 'error' && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-200">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span className="line-clamp-2">{status.message}</span>
                </div>
              )}
              {status.type === 'idle' && status.message && (
                <div className="flex items-center gap-2 text-xs text-accent-purple bg-pastel-purple/30 px-3 py-2 rounded-xl">
                  <span>{status.message}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={status.type === 'loading'}
              className="bg-accent-purple hover:bg-accent-purple/90 disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              {status.type === 'loading' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Đang nhập...
                </>
              ) : (
                <>Nhập dữ liệu vào Firebase</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
