import { createClient, SupabaseClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong phần Secrets.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
};

// Export a proxy or a getter-based object to maintain compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const instance = getSupabase();
    return (instance as any)[prop];
  }
});

export type Role = 'owner' | 'admin' | 'editor';

export interface Category {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  assigned_category_ids: string[];
}

export interface Question {
  id: string;
  content: string;
  answer: string;
  media_link?: string;
  difficulty: 'Khởi động' | '10 điểm' | '20 điểm' | '30 điểm';
  category_id: string;
  created_by: string;
  last_edited_by: string;
  used_match_ids: string[];
  created_at: string;
}

export interface Match {
  id: string;
  name: string;
  is_published: boolean;
  matrix: MatchMatrix;
  created_at: string;
}

export interface MatchMatrix {
  khoi_dong: {
    private: { contestant_id: number; question_ids: string[]; category_ids: string[] }[];
    common: { question_ids: string[]; category_ids: string[] };
  };
  ve_dich: {
    question_ids: string[];
    category_ids: string[];
  };
  ve_dich_full: {
    contestants: { contestant_id: number; question_ids: string[]; category_ids: string[] }[];
  };
}

export interface Notification {
  id: string;
  content: string;
  link?: string;
  created_at: string;
}
