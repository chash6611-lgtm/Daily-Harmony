
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parse,
  subMinutes
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Lightbulb, 
  CalendarCheck, 
  ListTodo, 
  User, 
  Activity,
  Sparkles,
  Moon,
  Leaf,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  Download,
  Upload,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  CalendarDays,
  Key,
  AlertCircle,
  RotateCcw,
  LogOut,
  ChevronRightCircle,
  ShieldAlert
} from 'lucide-react';
import { Lunar } from 'lunar-javascript';
import { Memo, MemoType, UserProfile, RepeatType, ReminderOffset } from './types.ts';
import { SOLAR_HOLIDAYS } from './constants.tsx';
import { 
  supabase,
  fetchMemosFromCloud, 
  getFilteredMemos, 
  saveMemoCloud, 
  deleteMemoCloud, 
  updateMemoCloud,
  isSupabaseConfigured,
  fetchProfileFromCloud,
  saveProfileCloud
} from './services/supabaseClient.ts';
import { calculateBiorhythm } from './services/biorhythmService.ts';
import { getDailyFortune } from './services/geminiService.ts';
import BiorhythmChart from './components/BiorhythmChart.tsx';
import ProfileSetup from './components/ProfileSetup.tsx';
import Auth from './components/Auth.tsx';

const JIE_QI_MAP: Record<string, string> = {
  '立春': '입춘', '雨水': '우수', '驚蟄': '경칩', '春분': '춘분', '淸明': '청명', '穀雨': '곡우',
  '立夏': '입하', '소滿': '소만', '芒종': '망종', '夏至': '하지', '소暑': '소서', '大暑': '대서',
  '立秋': '입추', '處暑': '처서', '白露': '백로', '秋분': '추분', '寒露': '한로', '霜강': '상강',
  '立冬': '입동', '소雪': '소설', '大雪': '대설', '冬至': '동지', '소寒': '소한', '大寒': '대한'
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('is_guest_mode') === 'true');
  const [apiKey, setApiKey] = useState<string>(() => {
    return process.env.API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';
  });
  const [tempKey, setTempKey] = useState('');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allMemos, setAllMemos] = useState<Memo[]>([]);
  const [loadingMemos, setLoadingMemos] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [newMemo, setNewMemo] = useState('');
  const [selectedType, setSelectedType] = useState<MemoType>(MemoType.TODO);
  
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<MemoType>(MemoType.TODO);

  const [showDataMenu, setShowDataMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fortune, setFortune] = useState<string>('');
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 세션 체크 및 데이터 로드
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setIsGuest(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        localStorage.removeItem('is_guest_mode');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeApp = useCallback(async () => {
    if (!session && !isGuest) return;
    
    setLoadingMemos(true);
    setIsSyncing(true);
    try {
      const cloudProfile = await fetchProfileFromCloud();
      if (cloudProfile) {
        setProfile(cloudProfile);
        if (cloudProfile.gemini_api_key) {
          setApiKey(cloudProfile.gemini_api_key);
          localStorage.setItem('GEMINI_API_KEY', cloudProfile.gemini_api_key);
        }
      } else if (session) {
        // 회원인데 프로필이 없으면 생성 모달
        setShowProfileModal(true);
      } else {
        // 게스트인데 로컬 프로필도 없으면 생성 모달
        const local = localStorage.getItem('user_profile');
        if (local) setProfile(JSON.parse(local));
        else setShowProfileModal(true);
      }
      
      const memos = await fetchMemosFromCloud();
      setAllMemos(memos);
    } catch (error) {
      console.error("앱 초기화 중 오류:", error);
    } finally {
      setLoadingMemos(false);
      setIsSyncing(false);
    }
  }, [session, isGuest]);

  useEffect(() => {
    if (session || isGuest) {
      initializeApp();
    }
  }, [session, isGuest, initializeApp]);

  const handleLogout = async () => {
    if (confirm('종료하시겠습니까? (비회원은 로컬 데이터가 유지됩니다)')) {
      if (session) await supabase?.auth.signOut();
      localStorage.removeItem('is_guest_mode');
      setIsGuest(false);
      setSession(null);
      window.location.reload();
    }
  };

  const handleStartGuest = () => {
    setIsGuest(true);
    localStorage.setItem('is_guest_mode', 'true');
  };

  const loadMemos = useCallback(async (showLoading = true) => {
    if (!session && !isGuest) return;
    if (showLoading) setLoadingMemos(true);
    setIsSyncing(true);
    try {
      const data = await fetchMemosFromCloud();
      setAllMemos(data);
    } catch (error) {
      console.error("메모 로드 중 오류:", error);
    } finally {
      setLoadingMemos(false);
      setIsSyncing(false);
    }
  }, [session, isGuest]);

  const handleExportData = () => {
    const data = {
      memos: JSON.stringify(allMemos),
      profile: JSON.stringify(profile),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-harmony-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDataMenu(false);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('데이터를 불러오시겠습니까? 현재 데이터는 덮어씌워집니다.')) {
           alert('현재는 백업본 확인용입니다. 수동 등록을 이용해주세요.');
        }
      } catch (err) {
        alert('유효하지 않은 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
    setShowDataMenu(false);
  };

  const fetchFortune = useCallback(async () => {
    if (apiKey && profile) {
      setLoadingFortune(true);
      try {
        const result = await getDailyFortune(
          profile.birth_date, 
          profile.birth_time, 
          format(selectedDate, 'yyyy-MM-dd'),
          apiKey
        );
        setFortune(result);
      } catch (err) {
        setFortune("ERROR: 운세를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
      } finally {
        setLoadingFortune(false);
      }
    }
  }, [selectedDate, profile, apiKey]);

  useEffect(() => {
    fetchFortune();
  }, [fetchFortune]);

  const handleSaveApiKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', tempKey.trim());
      setApiKey(tempKey.trim());
      if (profile) {
        handleSaveProfile({ ...profile, gemini_api_key: tempKey.trim() });
      }
      setTempKey('');
    }
  };

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    const added = await saveMemoCloud({
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: selectedType,
      content: newMemo,
      repeat_type: RepeatType.NONE,
    });
    if (added) {
      setAllMemos(prev => [added, ...prev]);
      setNewMemo('');
    }
  };

  const handleStartEdit = (memo: Memo) => {
    setEditingMemoId(memo.id);
    setEditContent(memo.content);
    setEditDate(memo.date);
    setEditType(memo.type);
  };

  const handleSaveEdit = async () => {
    if (!editingMemoId) return;
    const success = await updateMemoCloud(editingMemoId, {
      content: editContent,
      date: editDate,
      type: editType,
    });
    if (success) {
      setEditingMemoId(null);
      await loadMemos(false);
    }
  };

  const handleToggleMemo = async (id: string, currentStatus: boolean) => {
    const success = await updateMemoCloud(id, { completed: !currentStatus });
    if (success) {
      setAllMemos(prev => prev.map(m => m.id === id ? { ...m, completed: !currentStatus } : m));
    }
  };

  const handleDeleteMemo = async (id: string) => {
    if (confirm('정말로 이 기록을 삭제하시겠습니까?')) {
      const success = await deleteMemoCloud(id);
      if (success) {
        setAllMemos(prev => prev.filter(m => m.id !== id));
      }
    }
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    setIsSyncing(true);
    const savedProfile = await saveProfileCloud(newProfile);
    if (savedProfile) {
      setProfile(savedProfile);
      if (savedProfile.gemini_api_key) {
        setApiKey(savedProfile.gemini_api_key);
        localStorage.setItem('GEMINI_API_KEY', savedProfile.gemini_api_key);
      }
      setShowProfileModal(false);
    }
    setIsSyncing(false);
  };

  const currentDayMemos = getFilteredMemos(allMemos, selectedDate);

  const getDayDetails = useCallback((date: Date) => {
    const lunar = Lunar.fromDate(date);
    const mmdd = format(date, 'MM-dd');
    const holiday = SOLAR_HOLIDAYS[mmdd] || null;
    const rawJieQi = lunar.getJieQi() || null;
    const jieQi = rawJieQi ? (JIE_QI_MAP[rawJieQi] || rawJieQi) : null;
    let dynamicHoliday = null;
    const lm = lunar.getMonth(); const ld = lunar.getDay();
    if (lm === 1 && ld === 1) dynamicHoliday = '설날';
    else if (lm === 1 && ld === 2) dynamicHoliday = '설날 연휴';
    else if (lm === 4 && ld === 8) dynamicHoliday = '부처님오신날';
    else if (lm === 8 && ld === 15) dynamicHoliday = '추석';
    return { holiday, dynamicHoliday, jieQi, lunar };
  }, []);

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const rows = [];
    let days = [];
    let day = startDate;
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const { holiday, dynamicHoliday, jieQi, lunar } = getDayDetails(day);
        const isSunday = i === 0;
        const isSaturday = i === 6;
        const isHoliday = !!holiday || !!dynamicHoliday;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const dayMemos = getFilteredMemos(allMemos, day);
        days.push(
          <div key={day.toString()} className={`relative min-h-[85px] md:min-h-[125px] p-2 md:p-3 border-r border-b cursor-pointer transition-all duration-300 ${!isSameMonth(day, monthStart) ? "bg-gray-50/30 text-gray-300" : "text-gray-700 bg-white"} ${isSelected ? "bg-indigo-50/50 shadow-[inset_0_0_0_2px_rgba(79,70,229,0.2)] z-10" : "hover:bg-gray-50"}`} onClick={() => setSelectedDate(cloneDay)}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col items-center">
                <span className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-xl transition-all font-black text-[10px] md:text-sm ${isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : ""} ${isToday && !isSelected ? "bg-gray-100 text-gray-800" : ""} ${(isSunday || isHoliday) && !isSelected ? "text-rose-500" : ""} ${isSaturday && !isHoliday && !isSelected ? "text-blue-600" : ""}`}>{format(day, "d")}</span>
                <span className="text-[7px] md:text-[9px] text-gray-400 mt-1 font-bold">{lunar.getMonth()}.{lunar.getDay()}</span>
              </div>
              <div className="flex flex-col items-end space-y-1">
                {(holiday || dynamicHoliday) && <span className="text-[7px] md:text-[9px] text-rose-500 font-black leading-tight bg-rose-50 px-1 rounded-sm">{holiday || dynamicHoliday}</span>}
                {jieQi && <span className="flex items-center space-x-0.5 text-[7px] md:text-[9px] text-emerald-600 font-black"><Leaf size={8} /><span>{jieQi}</span></span>}
              </div>
            </div>
            <div className="mt-2 space-y-1 overflow-hidden">
               {dayMemos.slice(0, 2).map((m: Memo, idx: number) => (
                 <div key={idx} className="flex items-center space-x-1.5 animate-in fade-in slide-in-from-left-1 duration-300">
                   <div className={`shrink-0 w-1.5 h-1.5 rounded-full shadow-sm ${m.type === MemoType.IDEA ? 'bg-amber-400' : m.type === MemoType.APPOINTMENT ? 'bg-rose-400' : 'bg-blue-400'}`} />
                   <span className={`text-[8px] md:text-[11px] text-gray-600 truncate font-bold ${m.completed && m.type === MemoType.TODO ? 'line-through opacity-30 text-gray-400' : ''}`}>{m.content}</span>
                 </div>
               ))}
               {dayMemos.length > 2 && <div className="text-[7px] md:text-[9px] text-indigo-400 font-black ml-3">+{dayMemos.length - 2}</div>}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.getTime()}>{days}</div>);
      days = [];
    }
    return <div className="border-t border-l rounded-3xl overflow-hidden bg-white shadow-2xl shadow-indigo-100/50">{rows}</div>;
  };

  if (!session && !isGuest) {
    return <Auth onGuestStart={handleStartGuest} />;
  }

  const biorhythm = profile ? calculateBiorhythm(profile.birth_date, selectedDate) : null;
  const currentDayInfo = getDayDetails(selectedDate);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 animate-in fade-in duration-1000">
      <div className="flex items-center justify-between mb-6 bg-white/40 backdrop-blur-md px-6 py-3 rounded-3xl border border-white/50 text-[11px] md:text-sm shadow-sm">
         <div className="flex items-center space-x-4">
           <div className={`flex items-center space-x-2 font-black ${isGuest ? 'text-amber-500' : 'text-indigo-600'}`}>
             {isGuest ? <ShieldAlert size={16} /> : <Cloud size={16} />}
             <span className="hidden sm:inline">{isGuest ? '게스트 모드 (기기 저장)' : '실시간 클라우드 동기화'}</span>
             <span className="sm:hidden">{isGuest ? '게스트' : '동기화됨'}</span>
           </div>
           {isSyncing && <RefreshCw size={14} className="animate-spin text-indigo-400" />}
         </div>
         <div className="flex items-center space-x-3">
           <span className="text-gray-400 font-black hidden md:inline">{session ? session.user.email : 'Local Guest'}</span>
           <button onClick={handleLogout} className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl font-bold">
             <LogOut size={16} />
             <span className="text-[10px]">{session ? '로그아웃' : '모드 종료'}</span>
           </button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 space-y-6 md:space-y-0 relative z-40 px-2">
        <div className="flex flex-row items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter">
              {format(currentDate, 'yyyy년 MM월')}
            </h2>
            <p className="text-gray-400 text-xs font-bold mt-1">오늘을 특별하게 기록해보세요</p>
          </div>
          <div className="flex items-center space-x-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">오늘</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-3">
          <div className="relative" ref={dataMenuRef}>
            <button onClick={() => setShowDataMenu(!showDataMenu)} className="p-3 bg-white border border-gray-100 text-gray-400 rounded-2xl shadow-sm hover:text-indigo-600 hover:border-indigo-100 transition-all"><Database size={22} /></button>
            {showDataMenu && (
              <div className="absolute right-0 mt-4 w-52 bg-white rounded-3xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in slide-in-from-top-2 overflow-hidden">
                <button onClick={handleExportData} className="w-full flex items-center space-x-3 px-5 py-4 text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Download size={16} /><span>백업 파일 저장</span></button>
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center space-x-3 px-5 py-4 text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Upload size={16} /><span>백업 불러오기</span></button>
                <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />
              </div>
            )}
          </div>
          <button onClick={() => setShowProfileModal(true)} className="flex items-center space-x-3 bg-white border border-indigo-100/50 text-gray-800 px-6 py-3 rounded-2xl shadow-sm font-black text-sm hover:bg-indigo-50 hover:shadow-md transition-all">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <User size={18} />
            </div>
            <span className="truncate max-w-[100px]">{profile ? profile.name : '프로필 설정'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 relative z-30">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-[40px] p-4 md:p-8 shadow-2xl border border-white/50">
            <div className="min-w-0">
              <div className="grid grid-cols-7 mb-4 px-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                  <div key={day} className={`text-center font-black text-[11px] md:text-sm ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-gray-300'}`}>{day}</div>
                ))}
              </div>
              {renderCells()}
            </div>
          </div>
          
          {profile && (
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl p-6 md:p-10 border border-white/50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-rose-50 rounded-2xl text-rose-500 shadow-sm shadow-rose-100">
                    <Activity size={24} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">오늘의 바이오리듬</h3>
                </div>
                <div className="text-[11px] text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-full">상태 분석 결과</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="w-full bg-gray-50/50 p-4 rounded-[32px] border border-gray-100">
                  <BiorhythmChart birthDate={profile.birth_date} targetDate={selectedDate} />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[{ label: '신체 리듬', val: biorhythm?.physical, color: 'blue', desc: '운동 및 건강 상태' }, { label: '감성 리듬', val: biorhythm?.emotional, color: 'rose', desc: '기분 및 대인 관계' }, { label: '지성 리듬', val: biorhythm?.intellectual, color: 'emerald', desc: '집중력 및 판단력' }].map((item) => (
                    <div key={item.label} className={`group p-5 bg-white rounded-3xl border border-${item.color}-100 flex items-center justify-between hover:shadow-lg hover:shadow-${item.color}-100/50 transition-all duration-300`}>
                      <div className="flex flex-col">
                        <span className={`text-${item.color}-700 font-black text-sm md:text-base`}>{item.label}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{item.desc}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-${item.color}-800 font-black text-xl md:text-2xl tracking-tighter`}>{Math.round(item.val || 0)}%</span>
                        <div className={`w-12 h-1 bg-${item.color}-100 rounded-full mt-1 overflow-hidden`}>
                          <div className={`h-full bg-${item.color}-500 transition-all duration-1000`} style={{ width: `${Math.max(0, item.val || 0)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white rounded-[40px] p-8 md:p-10 shadow-[0_35px_60px_-15px_rgba(79,70,229,0.3)] relative overflow-hidden group">
            <p className="text-indigo-200 text-xs md:text-sm font-black tracking-widest uppercase mb-1">{format(selectedDate, "yyyy 'Year'")}</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">{format(selectedDate, 'M월 d일')}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl px-5 py-2 rounded-2xl text-xs font-black shadow-inner">{format(selectedDate, 'EEEE', { locale: ko })}</div>
              <div className="flex items-center space-x-2 text-indigo-100 font-black text-xs bg-indigo-500/30 px-4 py-2 rounded-2xl backdrop-blur-sm">
                <Moon size={14} className="animate-pulse" />
                <span>음력 {currentDayInfo.lunar.getMonth()}.{currentDayInfo.lunar.getDay()}</span>
              </div>
            </div>
            <Moon className="absolute -right-12 -bottom-12 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none" size={200} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 border border-white/50 min-h-[160px] relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-500 shadow-sm shadow-indigo-100">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">AI 오늘의 운세</h3>
              </div>
              <button onClick={fetchFortune} className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"><RotateCcw size={18} /></button>
            </div>

            {!apiKey ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                  AI 분석을 위해 Gemini API 키가 필요합니다. 설정에서 입력하거나 아래에 바로 입력해주세요.
                </p>
                <div className="flex gap-2">
                  <input type="password" value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder="API 키 입력" className="flex-1 bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                  <button onClick={handleSaveApiKey} className="bg-indigo-600 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">연결</button>
                </div>
              </div>
            ) : loadingFortune ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded-full w-full"></div>
                <div className="h-4 bg-gray-100 rounded-full w-5/6"></div>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                {fortune.startsWith("ERROR:") ? (
                  <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl space-y-4">
                    <div className="flex items-center space-x-3 text-rose-600 font-black text-sm">
                      <AlertCircle size={20} />
                      <span>운세를 불러오지 못했습니다</span>
                    </div>
                    <p className="text-rose-700 text-xs leading-relaxed font-bold opacity-80">
                      {fortune.replace("ERROR: ", "")}
                    </p>
                    <button onClick={fetchFortune} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white text-rose-600 rounded-2xl text-xs font-black hover:bg-rose-100 transition-all shadow-sm border border-rose-100">
                      <RotateCcw size={16} />
                      <span>다시 로드하기</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-600 text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap font-bold bg-indigo-50/30 p-5 rounded-3xl border border-indigo-100/50">
                    {fortune}
                  </div>
                )}
                {profile?.gemini_api_key && (
                   <div className="flex items-center justify-end text-[9px] text-indigo-400 font-black space-x-2 bg-indigo-50 px-3 py-1.5 rounded-full w-fit ml-auto">
                     <Key size={12} /><span>동기화된 AI 키 사용 중</span>
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 border border-white/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-500 shadow-sm shadow-emerald-100">
                <Plus size={20} />
              </div>
              <h3 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">새로운 기록</h3>
            </div>
            
            <div className="flex gap-2 mb-6 overflow-x-auto pb-3 scrollbar-hide">
              {[
                [MemoType.TODO, ListTodo, '할일', 'bg-blue-600', 'text-blue-600', 'bg-blue-50'], 
                [MemoType.IDEA, Lightbulb, '아이디어', 'bg-amber-500', 'text-amber-500', 'bg-amber-50'], 
                [MemoType.APPOINTMENT, CalendarCheck, '약속', 'bg-rose-500', 'text-rose-500', 'bg-rose-50']
              ].map(([type, Icon, label, activeBg, activeText, activeLight]: any) => (
                <button 
                  key={type} 
                  onClick={() => setSelectedType(type)} 
                  className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-[11px] font-black transition-all shrink-0 border-2 ${selectedType === type ? `${activeBg} text-white border-${type === MemoType.TODO ? 'blue' : type === MemoType.IDEA ? 'amber' : 'rose'}-600 shadow-lg shadow-indigo-100` : `bg-white text-gray-400 border-gray-50 hover:border-gray-100`}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="relative group">
              <input 
                type="text" 
                value={newMemo} 
                onChange={(e) => setNewMemo(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()} 
                placeholder={`${selectedType === MemoType.TODO ? '오늘의 할 일을' : selectedType === MemoType.IDEA ? '번뜩이는 생각을' : '중요한 약속을'} 적어보세요...`} 
                className="w-full bg-gray-50/50 rounded-3xl py-5 pl-6 pr-20 text-[13px] md:text-sm font-bold border border-transparent focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-100 transition-all outline-none shadow-inner" 
              />
              <button 
                onClick={handleAddMemo} 
                disabled={!newMemo.trim()}
                className={`absolute right-3 top-3 p-3 text-white rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale ${selectedType === MemoType.TODO ? 'bg-indigo-600 shadow-indigo-200' : selectedType === MemoType.IDEA ? 'bg-amber-500 shadow-amber-100' : 'bg-rose-500 shadow-rose-100'}`}
              >
                <ChevronRightCircle size={22} />
              </button>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 border border-white/50 min-h-[350px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gray-50 rounded-2xl text-gray-500 shadow-sm shadow-gray-100">
                  <ListTodo size={20} />
                </div>
                <h3 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">오늘의 기록들</h3>
              </div>
              <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-3 py-1.5 rounded-full">{currentDayMemos.length}개</span>
            </div>

            <div className="space-y-4">
              {currentDayMemos.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <Sparkles size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-sm font-black">아직 기록이 없어요.<br/>오늘을 채워보세요.</p>
                </div>
              ) : currentDayMemos.map((memo) => (
                <div key={memo.id} className={`group bg-white border-2 p-5 rounded-3xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${editingMemoId === memo.id ? 'border-indigo-500 ring-8 ring-indigo-50 shadow-inner' : 'border-gray-50 hover:border-indigo-100/50 hover:shadow-xl hover:shadow-indigo-100/30'}`}>
                  {editingMemoId === memo.id ? (
                    <div className="space-y-4">
                      <input 
                        type="text" 
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)} 
                        className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs md:text-sm font-black focus:bg-white border-none focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
                      />
                      <div className="flex gap-3">
                        <button onClick={handleSaveEdit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"><Check size={18} />완료</button>
                        <button onClick={() => setEditingMemoId(null)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"><X size={18} />취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {memo.type === MemoType.TODO ? (
                          <button onClick={() => handleToggleMemo(memo.id, memo.completed)} className="shrink-0 transition-transform active:scale-125">
                            {memo.completed ? <CheckCircle2 className="text-emerald-500" size={24} /> : <Circle className="text-gray-200 hover:text-indigo-200" size={24} />}
                          </button>
                        ) : (
                          <div className={`shrink-0 p-2 rounded-xl ${memo.type === MemoType.IDEA ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
                            {memo.type === MemoType.IDEA ? <Lightbulb size={20} /> : <CalendarCheck size={20} />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] md:text-[15px] font-black leading-snug truncate ${memo.completed && memo.type === MemoType.TODO ? 'text-gray-300 line-through decoration-2' : 'text-gray-700'}`}>{memo.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartEdit(memo)} className="p-2.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteMemo(memo.id)} className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showProfileModal && (
        <ProfileSetup 
          onSave={handleSaveProfile} 
          onClose={() => setShowProfileModal(false)}
          currentProfile={profile}
        />
      )}
    </div>
  );
};

export default App;
