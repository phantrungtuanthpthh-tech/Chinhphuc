import { useState, useEffect } from 'react';
import { supabase, type Profile, type Category, type Notification } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Database, 
  Trophy, 
  Users, 
  Settings, 
  LogOut, 
  Bell, 
  ExternalLink,
  Menu,
  X,
  PlusCircle,
  Search,
  Filter,
  ChevronRight,
  Download,
  Trash2,
  Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';
import QuestionBank from './QuestionBank';
import CategoryManager from './CategoryManager';
import MatchManager from './MatchManager';
import UserManager from './UserManager';
import NotificationCenter from './NotificationCenter';

interface DashboardProps {
  user: Profile;
  onLogout: () => void;
}

type View = 'questions' | 'categories' | 'matches' | 'users' | 'notifications';

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<View>('questions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchLatestNotification();
  }, []);

  const fetchLatestNotification = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) setLatestNotification(data);
  };

  const menuItems = [
    { id: 'questions', label: 'Ngân hàng câu hỏi', icon: Database, roles: ['owner', 'admin', 'editor'] },
    { id: 'matches', label: 'Quản lý trận đấu', icon: Trophy, roles: ['owner', 'admin'] },
    { id: 'categories', label: 'Lĩnh vực', icon: Filter, roles: ['owner', 'admin'] },
    { id: 'users', label: 'Ban biên tập', icon: Users, roles: ['owner', 'admin'] },
    { id: 'notifications', label: 'Thông báo', icon: Bell, roles: ['owner', 'admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex font-sans text-[#141414]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#141414] text-[#E4E3E0] transition-all duration-300 flex flex-col",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-[#E4E3E0]/10">
          <div className="w-8 h-8 bg-[#E4E3E0] rounded flex items-center justify-center text-[#141414]">
            <Trophy size={20} />
          </div>
          {isSidebarOpen && <span className="font-bold tracking-tight uppercase text-sm">Chinh phục</span>}
        </div>

        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded transition-colors",
                    activeView === item.id 
                      ? "bg-[#E4E3E0] text-[#141414]" 
                      : "hover:bg-[#E4E3E0]/10 text-[#E4E3E0]/60 hover:text-[#E4E3E0]"
                  )}
                >
                  <item.icon size={20} />
                  {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-6 border-t border-[#E4E3E0]/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#E4E3E0]/20 flex items-center justify-center text-xs font-bold">
              {user.full_name.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user.full_name}</p>
                <p className="text-[10px] uppercase tracking-wider opacity-40">{user.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-[#E4E3E0]/60 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar / Notification */}
        <header className="bg-white border-b border-[#141414]/10 h-16 flex items-center px-8 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mr-6 p-2 hover:bg-[#141414]/5 rounded transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Admin Notification for Editors */}
          <div className="flex-1 flex items-center justify-center">
            {latestNotification && (
              <div className="bg-[#141414] text-[#E4E3E0] px-6 py-2 rounded-full flex items-center gap-3 max-w-2xl animate-in fade-in slide-in-from-top-4">
                <Bell size={14} className="text-yellow-400" />
                <span className="text-xs font-medium truncate">{latestNotification.content}</span>
                {latestNotification.link && (
                  <a 
                    href={latestNotification.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase tracking-widest font-bold hover:underline flex items-center gap-1"
                  >
                    Xem chi tiết <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="w-20" /> {/* Spacer */}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'questions' && <QuestionBank user={user} />}
            {activeView === 'categories' && <CategoryManager user={user} />}
            {activeView === 'matches' && <MatchManager user={user} />}
            {activeView === 'users' && <UserManager user={user} />}
            {activeView === 'notifications' && <NotificationCenter user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
}
