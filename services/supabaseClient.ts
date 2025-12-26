
import { createClient } from '@supabase/supabase-js';
import { Memo, RepeatType, UserProfile } from '../types.ts';
import { parseISO, isSameDay, getDay, getDate, getMonth } from 'date-fns';
import { Lunar } from 'lunar-javascript';

const supabaseUrl = 'https://klarhvoglyapszhdwabp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYXJodm9nbHlhcHN6aGR3YWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjE4NTcsImV4cCI6MjA4MjAzNzg1N30.3V2bkP4Xg9kazzlkgdSm_fTGVPCBt4tgqjhfchac7UI';

export const isSupabaseConfigured = 
  supabaseUrl.includes('supabase.co') && 
  supabaseAnonKey.length > 20;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const LOCAL_STORAGE_KEY = 'daily_harmony_memos_v2';
const PROFILE_STORAGE_KEY = 'user_profile';

// 현재 로그인한 사용자의 ID를 가져오는 헬퍼 함수
const getUserId = async () => {
  if (!supabase) return 'local_user';
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || 'local_user';
};

const getErrorMessage = (err: any): string => {
  if (typeof err === 'string') return err;
  if (err && err.message) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
};

// --- 프로필 관련 기능 ---

export const fetchProfileFromCloud = async (): Promise<UserProfile | null> => {
  if (!supabase) {
    const local = localStorage.getItem(PROFILE_STORAGE_KEY);
    return local ? JSON.parse(local) : null;
  }

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    
    if (data) {
      const formattedProfile: UserProfile = { ...data, id: data.user_id };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(formattedProfile));
      return formattedProfile;
    }
    
    return null;
  } catch (err) {
    console.warn("프로필 로드 실패:", getErrorMessage(err));
    return null;
  }
};

export const saveProfileCloud = async (profile: UserProfile): Promise<UserProfile | null> => {
  if (!supabase) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return profile;
  }

  try {
    const userId = await getUserId();
    const { id, ...rest } = profile;
    const profileData = {
      ...rest,
      user_id: userId, 
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select();
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const saved: UserProfile = { ...data[0], id: data[0].user_id };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(saved));
      return saved;
    }
  } catch (err) {
    console.error("클라우드 프로필 저장 실패:", getErrorMessage(err));
  }
  return profile;
};

// --- 메모 관련 기능 ---

export const fetchMemosFromCloud = async (): Promise<Memo[]> => {
  if (!supabase) {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  }

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("메모 로드 실패:", getErrorMessage(err));
    return [];
  }
};

export const getFilteredMemos = (allMemos: Memo[], targetDate: Date): Memo[] => {
  const targetDay = getDay(targetDate);
  const targetDateNum = getDate(targetDate);
  const targetMonth = getMonth(targetDate);
  const targetLunar = Lunar.fromDate(targetDate);

  return allMemos.filter(memo => {
    const memoDate = parseISO(memo.date);
    if (memo.repeat_type === RepeatType.NONE || !memo.repeat_type) {
      return isSameDay(memoDate, targetDate);
    }
    if (targetDate < memoDate && !isSameDay(memoDate, targetDate)) return false;

    switch (memo.repeat_type) {
      case RepeatType.WEEKLY: return getDay(memoDate) === targetDay;
      case RepeatType.MONTHLY: return getDate(memoDate) === targetDateNum;
      case RepeatType.YEARLY_SOLAR: return getMonth(memoDate) === targetMonth && getDate(memoDate) === targetDateNum;
      case RepeatType.YEARLY_LUNAR:
        const memoLunar = Lunar.fromDate(memoDate);
        return memoLunar.getMonth() === targetLunar.getMonth() && memoLunar.getDay() === targetLunar.getDay();
      default: return false;
    }
  });
};

export const saveMemoCloud = async (memo: Partial<Memo>): Promise<Memo | null> => {
  if (!supabase) return null;

  try {
    const userId = await getUserId();
    const newMemo = {
      user_id: userId,
      date: memo.date!,
      type: memo.type!,
      content: memo.content!,
      completed: false,
      created_at: new Date().toISOString(),
      repeat_type: memo.repeat_type || RepeatType.NONE,
      reminder_time: memo.reminder_time || null,
      reminder_offsets: memo.reminder_offsets || null,
    };

    const { data, error } = await supabase.from('memos').insert([newMemo]).select();
    if (error) throw error;
    if (data) return data[0];
  } catch (err) { 
    console.error("클라우드 메모 저장 실패:", getErrorMessage(err)); 
  }
  return null;
};

export const deleteMemoCloud = async (id: string): Promise<boolean> => {
  if (supabase) {
    try {
      const { error } = await supabase.from('memos').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("클라우드 삭제 실패:", getErrorMessage(err));
    }
  }
  return false;
};

export const updateMemoCloud = async (id: string, updates: Partial<Memo>): Promise<boolean> => {
  if (supabase) {
    try {
      const { error } = await supabase.from('memos').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("클라우드 업데이트 실패:", getErrorMessage(err));
    }
  }
  return false;
};
