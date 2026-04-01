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
import ChangePasswordModal from './ChangePasswordModal';

interface DashboardProps {
  user: Profile;
  onLogout: () => void;
}

type View = 'questions' | 'categories' | 'matches' | 'users' | 'notifications';

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<View>('questions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    fetchLatestNotification();
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    <div className="min-h-screen bg-pastel-blue flex font-sans text-[#1E293B] relative overflow-hidden">
      {/* Sidebar Backdrop (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-accent-purple/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-pastel-purple-dark transition-all duration-300 flex flex-col shadow-lg z-50",
          "fixed md:relative inset-y-0 left-0",
          isSidebarOpen 
            ? "translate-x-0 w-64" 
            : "-translate-x-full md:translate-x-0 md:w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-pastel-purple-dark">
          <div className="w-8 h-8 bg-pastel-purple text-accent-purple rounded-lg flex items-center justify-center shadow-sm">
            <Trophy size={20} />
          </div>
          {isSidebarOpen && <span className="font-bold tracking-tight uppercase text-sm text-accent-purple">Chinh phục</span>}
        </div>

        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                    activeView === item.id 
                      ? "bg-pastel-purple text-accent-purple shadow-sm font-bold" 
                      : "hover:bg-pastel-blue text-[#64748B] hover:text-accent-blue"
                  )}
                >
                  <item.icon size={20} />
                  {isSidebarOpen && <span className="text-sm">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-6 border-t border-pastel-purple-dark">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-pastel-purple flex items-center justify-center text-xs font-bold text-accent-purple">
              {user.full_name.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user.full_name}</p>
                <p className="text-[10px] uppercase tracking-wider opacity-40">{user.role}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-[#64748B] hover:text-accent-purple transition-colors"
            >
              <Settings size={20} />
              {isSidebarOpen && <span className="text-sm font-medium">Đổi mật khẩu</span>}
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-[#64748B] hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
              {isSidebarOpen && <span className="text-sm font-medium">Đăng xuất</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar / Notification */}
        <header className="bg-white/80 backdrop-blur-md border-b border-pastel-blue-dark h-16 flex items-center px-4 md:px-8 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mr-4 md:mr-6 p-2 hover:bg-pastel-blue rounded-xl transition-colors text-accent-blue"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Admin Notification for Editors */}
          <div className="flex-1 flex items-center justify-center">
            {latestNotification && (
              <div className="bg-pastel-purple text-accent-purple px-6 py-2 rounded-full flex items-center gap-3 max-w-2xl shadow-sm border border-pastel-purple-dark animate-in fade-in slide-in-from-top-4">
                <Bell size={14} className="text-accent-purple" />
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'questions' && <QuestionBank user={user} />}
            {activeView === 'categories' && <CategoryManager user={user} />}
            {activeView === 'matches' && <MatchManager user={user} />}
            {activeView === 'users' && <UserManager user={user} />}
            {activeView === 'notifications' && <NotificationCenter user={user} />}
          </div>
        </div>
      </main>

      {isChangePasswordOpen && (
        <ChangePasswordModal 
          user={user} 
          onClose={() => setIsChangePasswordOpen(false)} 
        />
      )}
    </div>
  );
}
