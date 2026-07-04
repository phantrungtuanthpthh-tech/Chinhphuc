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

export const getFirebaseApp = () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Vui lòng cấu hình đầy đủ các biến môi trường Firebase (API Key, Project ID, v.v.) trong cài đặt Secrets hoặc Vercel.');
  }
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return app;
};

export const getFirestoreInstance = () => {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
};

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
};

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

// File Upload helper to Firebase Storage
export const uploadFile = async (file: File, folder: string = 'media'): Promise<string> => {
  try {
    const firebaseApp = getFirebaseApp();
    const storage = getStorage(firebaseApp);
    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folder}/${uniqueName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (err: any) {
    console.error('Firebase Storage upload error:', err);
    throw new Error(
      `Không thể tải tệp lên Cloud Storage (Gói miễn phí Firebase đôi khi chưa kích hoạt Storage hoặc bị giới hạn quyền).\n\n` +
      `Giải pháp: Bạn hoàn toàn có thể tự tải ảnh/video lên các trang lưu trữ miễn phí bên ngoài (như Imgur, Google Drive ở chế độ công khai, v.v.) rồi DÁN trực tiếp đường link đó vào ô nhập liệu bên cạnh nút tải lên.`
    );
  }
};

// Supabase Mock API
class SupabaseQueryBuilder {
  private tableName: string;
  private filters: { field: string; op: string; value: any }[] = [];
  private orderField: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
    // Trigger seed check as a side effect
    seedDefaultOwner();
  }

  select(fields?: string) {
    this.action = 'select';
    return this;
  }

  insert(rows: any[]) {
    this.action = 'insert';
    this.payload = rows;
    return this;
  }

  update(values: any) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: '==', value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ field, op: 'in', value: values });
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    if (opts && opts.ascending !== undefined) {
      this.orderAscending = opts.ascending;
    }
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async executeSelect() {
    try {
      const firestore = getFirestoreInstance();
      const colRef = collection(firestore, this.tableName);
      let q = query(colRef);

      // Direct document fetch by ID if possible
      const idFilter = this.filters.find(f => f.field === 'id');
      if (idFilter && this.filters.length === 1) {
        const docRef = doc(firestore, this.tableName, idFilter.value);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const item = { id: docSnap.id, ...docSnap.data() };
          
          // Apply questions join if needed
          if (this.tableName === 'questions') {
            const catsSnap = await getDocs(collection(firestore, 'categories'));
            const catsMap = new Map(catsSnap.docs.map(d => [d.id, d.data()]));

            const profsSnap = await getDocs(collection(firestore, 'profiles'));
            const profsMap = new Map(profsSnap.docs.map(d => [d.id, d.data()]));

            const category = catsMap.get((item as any).category_id);
            const creator = profsMap.get((item as any).created_by);
            const editor = profsMap.get((item as any).last_edited_by);

            return {
              data: [{
                ...item,
                categories: category ? { name: (category as any).name } : null,
                creator: creator ? { full_name: (creator as any).full_name } : null,
                editor: editor ? { full_name: (editor as any).full_name } : null
              }],
              error: null
            };
          }
          
          return { data: [item], error: null };
        } else {
          return { data: [], error: null };
        }
      }

      // Apply standard equality or list filters
      for (const filter of this.filters) {
        const fieldName = filter.field === 'id' ? '__name__' : filter.field;
        if (filter.op === 'in') {
          // If empty array for IN query, Firestore throws, so we bypass or use empty list
          const arrVal = Array.isArray(filter.value) ? filter.value : [filter.value];
          if (arrVal.length === 0) {
            return { data: [], error: null };
          }
          // Firestore has a limit of 10 items in 'in' filter. We handle larger in-memory or up to 10
          q = query(q, where(fieldName, 'in', arrVal.slice(0, 10)));
        } else {
          q = query(q, where(fieldName, '==', filter.value));
        }
      }

      // Apply order if specified
      if (this.orderField) {
        q = query(q, orderBy(this.orderField, this.orderAscending ? 'asc' : 'desc'));
      }

      // Apply limit if specified
      if (this.limitCount) {
        q = query(q, limit(this.limitCount));
      }

      const snap = await getDocs(q);
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Emulate Joins if tableName is 'questions'
      if (this.tableName === 'questions') {
        const catsSnap = await getDocs(collection(firestore, 'categories'));
        const catsMap = new Map(catsSnap.docs.map(d => [d.id, d.data()]));

        const profsSnap = await getDocs(collection(firestore, 'profiles'));
        const profsMap = new Map(profsSnap.docs.map(d => [d.id, d.data()]));

        data = data.map((q: any) => {
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
      }

      return { data, error: null };
    } catch (err: any) {
      console.error(`Firestore executeSelect error for ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async executeInsert() {
    try {
      const firestore = getFirestoreInstance();
      const insertedRows: any[] = [];
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];

      for (const row of rows) {
        let docData = { ...row };
        if (!docData.created_at) {
          docData.created_at = new Date().toISOString();
        }

        // Clean up joins fields before saving to Firestore
        delete docData.categories;
        delete docData.creator;
        delete docData.editor;

        let docId = docData.id;
        if (docId) {
          delete docData.id;
          await setDoc(doc(firestore, this.tableName, docId), docData);
          insertedRows.push({ id: docId, ...docData });
        } else {
          const docRef = await addDoc(collection(firestore, this.tableName), docData);
          insertedRows.push({ id: docRef.id, ...docData });
        }
      }

      return { data: insertedRows, error: null };
    } catch (err: any) {
      console.error(`Firestore insert error for ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async executeUpdate() {
    try {
      const firestore = getFirestoreInstance();
      const cleanValues = { ...this.payload };
      delete cleanValues.categories;
      delete cleanValues.creator;
      delete cleanValues.editor;

      const idFilter = this.filters.find(f => f.field === 'id');
      if (idFilter) {
        const docRef = doc(firestore, this.tableName, idFilter.value);
        await updateDoc(docRef, cleanValues);
        return { data: [{ id: idFilter.value, ...cleanValues }], error: null };
      }

      const { data } = await this.executeSelect();
      if (data && data.length > 0) {
        for (const item of data) {
          const docRef = doc(firestore, this.tableName, item.id);
          await updateDoc(docRef, cleanValues);
        }
      }
      return { data: null, error: null };
    } catch (err: any) {
      console.error(`Firestore update error for ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async executeDelete() {
    try {
      const firestore = getFirestoreInstance();
      const idFilter = this.filters.find(f => f.field === 'id');
      if (idFilter) {
        const docRef = doc(firestore, this.tableName, idFilter.value);
        await deleteDoc(docRef);
        return { error: null };
      }

      const { data } = await this.executeSelect();
      if (data && data.length > 0) {
        for (const item of data) {
          const docRef = doc(firestore, this.tableName, item.id);
          await deleteDoc(docRef);
        }
      }
      return { error: null };
    } catch (err: any) {
      console.error(`Firestore delete error for ${this.tableName}:`, err);
      return { error: err };
    }
  }

  async execute() {
    const errorMsg = 
      `Thao tác với Firebase Firestore đã quá thời gian chờ (8 giây).\n\n` +
      `Điều này hầu như luôn xảy ra do một trong hai nguyên nhân chính sau:\n` +
      `1. BẠN CHƯA KHỞI TẠO BẢNG CƠ SỞ DỮ LIỆU TRÊN FIREBASE: Bạn đã tạo dự án Firebase nhưng CHƯA nhấn nút "Create database" (Tạo cơ sở dữ liệu) cho Cloud Firestore trong bảng điều khiển Firebase Console. Vui lòng vào trang Firebase Console -> Dự án của bạn -> Firestore Database -> Click nút "Create database" và chọn "Start in test mode" hoặc "Production mode" thì ứng dụng mới kết nối thành công.\n` +
      `2. CẤU HÌNH SAI BIẾN MÔI TRƯỜNG: Vui lòng kiểm tra lại cấu hình các khóa VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID trong cài đặt Secrets xem có dư khoảng trắng, kí tự lạ hoặc sai ký tự nào không.`;

    const runWithTimeout = async () => {
      if (this.action === 'select') {
        return this.executeSelect();
      } else if (this.action === 'insert') {
        return this.executeInsert();
      } else if (this.action === 'update') {
        return this.executeUpdate();
      } else if (this.action === 'delete') {
        return this.executeDelete();
      }
      return { data: null, error: null };
    };

    try {
      return await withTimeout(runWithTimeout(), 8000, errorMsg);
    } catch (err: any) {
      console.error('Firestore operation timed out or failed:', err);
      return { data: null, error: err.message || err };
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (value: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  async single() {
    const { data, error } = await this.execute() as any;
    return {
      data: data && data.length > 0 ? data[0] : null,
      error
    };
  }
}

// Interface types
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

// Emulate supabase client
export const supabase = {
  from(tableName: string) {
    return new SupabaseQueryBuilder(tableName);
  }
};
