import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Firestore
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Types & Interfaces
export type Role = 'owner' | 'admin' | 'editor';

export interface Category {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  username: string;
  password?: string;
  full_name: string;
  role: Role;
  assigned_category_ids: string[];
}

export interface Question {
  id: string;
  content: string;
  answer: string;
  media_link?: string;
  difficulty: 'Khởi động' | '10 điểm' | '20 điểm' | '30 điểm' | 'Vượt chướng ngại vật' | 'Tăng tốc';
  category_id: string;
  created_by: string;
  last_edited_by: string;
  used_match_ids: string[];
  created_at: string;
  
  // Vượt chướng ngại vật fields
  sub_questions?: { content: string; answer: string }[];
  central_question?: string;
  central_answer?: string;
  keyword?: string;
  image_url?: string;

  // Joined fields (resolved at runtime in Firebase Service)
  categories?: { name: string } | null;
  creator?: { full_name: string } | null;
  editor?: { full_name: string } | null;
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

export interface VCNVQuestion {
  id: string;
  name: string;
  category_id: string;
  keyword: string;
  image_url?: string;
  media_link?: string;
  sub_questions: { content: string; answer: string }[];
  central_question?: string;
  central_answer?: string;
  created_by: string;
  last_edited_by: string;
  created_at: string;
  // Joined fields
  categories?: { name: string } | null;
  creator?: { full_name: string } | null;
  editor?: { full_name: string } | null;
}

// Get Vite environment variables safely bypassing TypeScript definitions
const getEnv = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Vui lòng cấu hình đầy đủ các biến môi trường Firebase (API Key, Project ID, v.v.) trong cài đặt Secrets hoặc Vercel.');
  }
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return app;
};

export const getFirestoreInstance = (): Firestore => {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
};

// Timeout helper
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
};

const timeoutErrorMsg = (action: string) => 
  `Thao tác ${action} với Firebase Firestore đã quá thời gian chờ (8 giây).\n\n` +
  `Điều này hầu như luôn xảy ra do một trong hai nguyên nhân chính sau:\n` +
  `1. BẠN CHƯA KHỞI TẠO BẢNG CƠ SỞ DỮ LIỆU TRÊN FIREBASE: Bạn đã tạo dự án Firebase nhưng CHƯA nhấn nút "Create database" (Tạo cơ sở dữ liệu) cho Cloud Firestore trong bảng điều khiển Firebase Console. Vui lòng vào trang Firebase Console -> Dự án của bạn -> Firestore Database -> Click nút "Create database" và chọn "Start in test mode" hoặc "Production mode" thì ứng dụng mới kết nối thành công.\n` +
  `2. CẤU HÌNH SAI BIẾN MÔI TRƯỜNG: Vui lòng kiểm tra lại cấu hình các khóa VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID trong cài đặt Secrets xem có dư khoảng trắng, kí tự lạ hoặc sai ký tự nào không.`;

// Auto-seed a default owner if database is completely empty
let isSeeded = false;
export const seedDefaultOwner = async () => {
  if (isSeeded) return;
  try {
    const firestore = getFirestoreInstance();
    const snap = await withTimeout(
      getDocs(collection(firestore, 'profiles')),
      5000,
      'Không thể kết nối đến Firestore để kiểm tra dữ liệu gốc (quá thời gian).'
    );
    if (snap.empty) {
      await withTimeout(
        setDoc(doc(firestore, 'profiles', 'admin_default'), {
          username: 'admin',
          password: 'adminpassword',
          full_name: 'Administrator',
          role: 'owner',
          assigned_category_ids: [],
          created_at: new Date().toISOString()
        }),
        4000,
        'Không thể thiết lập tài khoản admin mặc định.'
      );
      console.log('Seeded default owner: admin / adminpassword');
    }
    isSeeded = true;
  } catch (err) {
    console.warn('Seed default owner error:', err);
  }
};

// Helper to get Cloudinary settings with LocalStorage override support
export const getCloudinaryConfig = () => {
  const localCloudName = localStorage.getItem('cloudinary_cloud_name');
  const localPreset = localStorage.getItem('cloudinary_upload_preset');
  
  return {
    cloudName: localCloudName || getEnv('VITE_CLOUDINARY_CLOUD_NAME') || 'hckpdc6f',
    uploadPreset: localPreset || getEnv('VITE_CLOUDINARY_UPLOAD_PRESET') || 'ml_default'
  };
};

// File Upload helper to Cloudinary (using unsigned upload)
export const uploadFile = async (file: File, folder: string = 'media'): Promise<string> => {
  try {
    const { cloudName, uploadPreset } = getCloudinaryConfig();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Lỗi từ phía Cloudinary API khi tải lên.');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    throw new Error(
      `Không thể tải tệp lên Cloudinary (Vui lòng kiểm tra lại cấu hình Cloud Name & Preset).\nChi tiết lỗi: ${err.message || err}`
    );
  }
};

// Native Firebase service implementation
export const firebaseService = {
  categories: {
    getAll: async (): Promise<Category[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const snap = await withTimeout(
        getDocs(query(collection(firestore, 'categories'), orderBy('name'))),
        8000,
        timeoutErrorMsg('Lấy danh sách lĩnh vực')
      );
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    },
    create: async (category: Omit<Category, 'id'> & { id?: string }): Promise<Category> => {
      const firestore = getFirestoreInstance();
      const data = { ...category };
      const docId = data.id;
      if (docId) {
        delete data.id;
        await withTimeout(
          setDoc(doc(firestore, 'categories', docId), data),
          8000,
          timeoutErrorMsg('Thêm lĩnh vực')
        );
        return { id: docId, ...data } as Category;
      } else {
        const docRef = await withTimeout(
          addDoc(collection(firestore, 'categories'), data),
          8000,
          timeoutErrorMsg('Thêm lĩnh vực')
        );
        return { id: docRef.id, ...data } as Category;
      }
    },
    update: async (id: string, fields: Partial<Category>): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        updateDoc(doc(firestore, 'categories', id), fields),
        8000,
        timeoutErrorMsg('Cập nhật lĩnh vực')
      );
    },
    delete: async (id: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        deleteDoc(doc(firestore, 'categories', id)),
        8000,
        timeoutErrorMsg('Xóa lĩnh vực')
      );
    }
  },

  notifications: {
    getAll: async (): Promise<Notification[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const snap = await withTimeout(
        getDocs(query(collection(firestore, 'notifications'), orderBy('created_at', 'desc'))),
        8000,
        timeoutErrorMsg('Lấy danh sách thông báo')
      );
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    },
    create: async (notification: Omit<Notification, 'id'> & { id?: string }): Promise<Notification> => {
      const firestore = getFirestoreInstance();
      const data = { ...notification };
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      const docId = data.id;
      if (docId) {
        delete data.id;
        await withTimeout(
          setDoc(doc(firestore, 'notifications', docId), data),
          8000,
          timeoutErrorMsg('Thêm thông báo')
        );
        return { id: docId, ...data } as Notification;
      } else {
        const docRef = await withTimeout(
          addDoc(collection(firestore, 'notifications'), data),
          8000,
          timeoutErrorMsg('Thêm thông báo')
        );
        return { id: docRef.id, ...data } as Notification;
      }
    },
    delete: async (id: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        deleteDoc(doc(firestore, 'notifications', id)),
        8000,
        timeoutErrorMsg('Xóa thông báo')
      );
    }
  },

  profiles: {
    getAll: async (): Promise<Profile[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const snap = await withTimeout(
        getDocs(query(collection(firestore, 'profiles'), orderBy('role'))),
        8000,
        timeoutErrorMsg('Lấy danh sách ban biên tập')
      );
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
    },
    getById: async (id: string): Promise<Profile | null> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const docSnap = await withTimeout(
        getDoc(doc(firestore, 'profiles', id)),
        8000,
        timeoutErrorMsg('Lấy thông tin người dùng')
      );
      return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Profile) : null;
    },
    authenticate: async (username: string, password: string): Promise<Profile | null> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const snap = await withTimeout(
        getDocs(query(collection(firestore, 'profiles'), where('username', '==', username), where('password', '==', password))),
        8000,
        timeoutErrorMsg('Đăng nhập')
      );
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Profile;
    },
    create: async (profile: Omit<Profile, 'id'> & { id?: string; password?: string }): Promise<Profile> => {
      const firestore = getFirestoreInstance();
      const data = { ...profile };
      const docId = data.id;
      if (docId) {
        delete data.id;
        await withTimeout(
          setDoc(doc(firestore, 'profiles', docId), data),
          8000,
          timeoutErrorMsg('Thêm tài khoản')
        );
        return { id: docId, ...data } as Profile;
      } else {
        const docRef = await withTimeout(
          addDoc(collection(firestore, 'profiles'), data),
          8000,
          timeoutErrorMsg('Thêm tài khoản')
        );
        return { id: docRef.id, ...data } as Profile;
      }
    },
    update: async (id: string, fields: Partial<Profile>): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        updateDoc(doc(firestore, 'profiles', id), fields),
        8000,
        timeoutErrorMsg('Cập nhật tài khoản')
      );
    },
    updatePassword: async (id: string, newPassword: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        updateDoc(doc(firestore, 'profiles', id), { password: newPassword }),
        8000,
        timeoutErrorMsg('Đổi mật khẩu')
      );
    },
    delete: async (id: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        deleteDoc(doc(firestore, 'profiles', id)),
        8000,
        timeoutErrorMsg('Xóa tài khoản')
      );
    }
  },

  questions: {
    getAll: async (): Promise<Question[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const qSnap = await withTimeout(
        getDocs(query(collection(firestore, 'questions'), orderBy('created_at', 'desc'))),
        8000,
        timeoutErrorMsg('Lấy danh sách câu hỏi')
      );
      const questionsList = qSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          used_match_ids: data.used_match_ids || []
        } as Question;
      });
      
      try {
        const catsSnap = await getDocs(collection(firestore, 'categories'));
        const catsMap = new Map(catsSnap.docs.map(d => [d.id, d.data()]));

        const profsSnap = await getDocs(collection(firestore, 'profiles'));
        const profsMap = new Map(profsSnap.docs.map(d => [d.id, d.data()]));

        return questionsList.map(q => {
          const category = catsMap.get(q.category_id);
          const creator = profsMap.get(q.created_by);
          const editor = profsMap.get(q.last_edited_by);

          return {
            ...q,
            categories: category ? { name: (category as any).name } : null,
            creator: creator ? { full_name: (creator as any).full_name } : null,
            editor: editor ? { full_name: (editor as any).full_name } : null
          };
        });
      } catch (err) {
        console.warn('Lỗi khi lấy thông tin liên kết cho câu hỏi, trả về danh sách cơ bản:', err);
        return questionsList;
      }
    },
    create: async (question: Omit<Question, 'id'> & { id?: string }): Promise<Question> => {
      const firestore = getFirestoreInstance();
      const data = { ...question };
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      
      delete (data as any).categories;
      delete (data as any).creator;
      delete (data as any).editor;

      const docId = data.id;
      if (docId) {
        delete data.id;
        await withTimeout(
          setDoc(doc(firestore, 'questions', docId), data),
          8000,
          timeoutErrorMsg('Thêm câu hỏi')
        );
        return { id: docId, ...data } as Question;
      } else {
        const docRef = await withTimeout(
          addDoc(collection(firestore, 'questions'), data),
          8000,
          timeoutErrorMsg('Thêm câu hỏi')
        );
        return { id: docRef.id, ...data } as Question;
      }
    },
    update: async (id: string, fields: Partial<Question>): Promise<void> => {
      const firestore = getFirestoreInstance();
      const cleanFields = { ...fields };
      delete (cleanFields as any).categories;
      delete (cleanFields as any).creator;
      delete (cleanFields as any).editor;

      await withTimeout(
        updateDoc(doc(firestore, 'questions', id), cleanFields),
        8000,
        timeoutErrorMsg('Cập nhật câu hỏi')
      );
    },
    delete: async (id: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        deleteDoc(doc(firestore, 'questions', id)),
        8000,
        timeoutErrorMsg('Xóa câu hỏi')
      );
    },
    getUsedMatches: async (id: string): Promise<{ used_match_ids: string[] }> => {
      const firestore = getFirestoreInstance();
      const docSnap = await getDoc(doc(firestore, 'questions', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { used_match_ids: data?.used_match_ids || [] };
      }
      return { used_match_ids: [] };
    },
    updateUsedMatches: async (id: string, usedMatchIds: string[]): Promise<void> => {
      const firestore = getFirestoreInstance();
      await updateDoc(doc(firestore, 'questions', id), { used_match_ids: usedMatchIds });
    },
    updateCategoryForQuestions: async (oldCategoryId: string, newCategoryId: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      const qSnap = await getDocs(query(collection(firestore, 'questions'), where('category_id', '==', oldCategoryId)));
      for (const d of qSnap.docs) {
        await updateDoc(doc(firestore, 'questions', d.id), { category_id: newCategoryId });
      }
    },
    filter: async (categoryId?: string, difficulty?: string): Promise<Question[]> => {
      const firestore = getFirestoreInstance();
      let q = query(collection(firestore, 'questions'));
      if (categoryId) {
        q = query(q, where('category_id', '==', categoryId));
      }
      if (difficulty) {
        q = query(q, where('difficulty', '==', difficulty));
      }
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
    }
  },

  matches: {
    getAll: async (): Promise<Match[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const snap = await withTimeout(
        getDocs(query(collection(firestore, 'matches'), orderBy('created_at', 'desc'))),
        8000,
        timeoutErrorMsg('Lấy danh sách trận đấu')
      );
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
    },
    getMinimalList: async (): Promise<{ id: string; name: string; is_published: boolean }[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const snap = await withTimeout(
        getDocs(query(collection(firestore, 'matches'), orderBy('created_at', 'desc'))),
        8000,
        timeoutErrorMsg('Lấy danh sách trận đấu tối giản')
      );
      return snap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, name: data.name || '', is_published: !!data.is_published };
      });
    },
    create: async (match: Omit<Match, 'id'> & { id?: string }): Promise<Match> => {
      const firestore = getFirestoreInstance();
      const data = { ...match };
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      const docId = data.id;
      if (docId) {
        delete data.id;
        await withTimeout(
          setDoc(doc(firestore, 'matches', docId), data),
          8000,
          timeoutErrorMsg('Thêm trận đấu')
        );
        return { id: docId, ...data } as Match;
      } else {
        const docRef = await withTimeout(
          addDoc(collection(firestore, 'matches'), data),
          8000,
          timeoutErrorMsg('Thêm trận đấu')
        );
        return { id: docRef.id, ...data } as Match;
      }
    },
    update: async (id: string, fields: Partial<Match>): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        updateDoc(doc(firestore, 'matches', id), fields),
        8000,
        timeoutErrorMsg('Cập nhật trận đấu')
      );
    },
    delete: async (id: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        deleteDoc(doc(firestore, 'matches', id)),
        8000,
        timeoutErrorMsg('Xóa trận đấu')
      );
    }
  },

  vcnv: {
    getAll: async (): Promise<VCNVQuestion[]> => {
      await seedDefaultOwner();
      const firestore = getFirestoreInstance();
      const qSnap = await withTimeout(
        getDocs(query(collection(firestore, 'vcnv_questions'), orderBy('created_at', 'desc'))),
        8000,
        'Không thể kết nối đến Firestore để lấy danh sách câu hỏi VCNV.'
      );
      const list = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VCNVQuestion));
      try {
        const catsSnap = await getDocs(collection(firestore, 'categories'));
        const catsMap = new Map(catsSnap.docs.map(d => [d.id, d.data()]));

        const profsSnap = await getDocs(collection(firestore, 'profiles'));
        const profsMap = new Map(profsSnap.docs.map(d => [d.id, d.data()]));

        return list.map(q => {
          const category = catsMap.get(q.category_id);
          const creator = profsMap.get(q.created_by);
          const editor = profsMap.get(q.last_edited_by);

          return {
            ...q,
            categories: category ? { name: (category as any).name } : null,
            creator: creator ? { full_name: (creator as any).full_name } : null,
            editor: editor ? { full_name: (editor as any).full_name } : null
          };
        });
      } catch (err) {
        console.warn('Lỗi khi liên kết câu hỏi VCNV:', err);
        return list;
      }
    },
    create: async (vcnvQuestion: Omit<VCNVQuestion, 'id'> & { id?: string }): Promise<VCNVQuestion> => {
      const firestore = getFirestoreInstance();
      const data = { ...vcnvQuestion };
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      delete (data as any).categories;
      delete (data as any).creator;
      delete (data as any).editor;

      const docId = data.id;
      if (docId) {
        delete data.id;
        await withTimeout(
          setDoc(doc(firestore, 'vcnv_questions', docId), data),
          8000,
          'Không thể lưu câu hỏi VCNV.'
        );
        return { id: docId, ...data } as VCNVQuestion;
      } else {
        const docRef = await withTimeout(
          addDoc(collection(firestore, 'vcnv_questions'), data),
          8000,
          'Không thể thêm câu hỏi VCNV.'
        );
        return { id: docRef.id, ...data } as VCNVQuestion;
      }
    },
    update: async (id: string, fields: Partial<VCNVQuestion>): Promise<void> => {
      const firestore = getFirestoreInstance();
      const cleanFields = { ...fields };
      delete (cleanFields as any).categories;
      delete (cleanFields as any).creator;
      delete (cleanFields as any).editor;

      await withTimeout(
        updateDoc(doc(firestore, 'vcnv_questions', id), cleanFields),
        8000,
        'Không thể cập nhật câu hỏi VCNV.'
      );
    },
    delete: async (id: string): Promise<void> => {
      const firestore = getFirestoreInstance();
      await withTimeout(
        deleteDoc(doc(firestore, 'vcnv_questions', id)),
        8000,
        'Không thể xóa câu hỏi VCNV.'
      );
    }
  },

  importRecord: async (tableName: string, record: any): Promise<void> => {
    const firestore = getFirestoreInstance();
    const data = { ...record };
    
    delete data.categories;
    delete data.creator;
    delete data.editor;

    const docId = data.id;
    if (!data.created_at) {
      data.created_at = new Date().toISOString();
    }

    if (docId) {
      delete data.id;
      await withTimeout(
        setDoc(doc(firestore, tableName, docId), data),
        8000,
        timeoutErrorMsg(`Nhập dữ liệu vào bảng ${tableName}`)
      );
    } else {
      await withTimeout(
        addDoc(collection(firestore, tableName), data),
        8000,
        timeoutErrorMsg(`Nhập dữ liệu vào bảng ${tableName}`)
      );
    }
  }
};
