
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient.ts';
import { Sparkles, AlertCircle, ShieldCheck, UserCircle, Settings } from 'lucide-react';
import PrivacyPolicy from './PrivacyPolicy.tsx';

interface AuthProps {
  onGuestStart: () => void;
}

const Auth: React.FC<AuthProps> = ({ onGuestStart }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Auth Error:", error);
      let errorMsg = error.message || '로그인 중 오류가 발생했습니다.';
      
      if (errorMsg.includes("provider is not enabled")) {
        errorMsg = "백엔드(Supabase) 설정에서 Google 로그인 기능이 꺼져 있습니다. 관리자 설정을 확인해주세요.";
      }
      
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-rose-50 px-6">
      <div className="max-w-sm w-full bg-white/70 backdrop-blur-2xl rounded-[48px] shadow-2xl p-10 md:p-14 border border-white/60 animate-in fade-in zoom-in duration-700">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200/50 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Sparkles className="text-white" size={48} />
            </div>
          </div>

          <div className="space-y-3 mb-10">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Daily Harmony</h1>
            <p className="text-gray-500 text-sm font-medium leading-relaxed px-2">
              가장 아름다운 방법으로<br />나의 하루를 기록해보세요
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group w-full bg-white text-gray-700 font-bold py-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:bg-gray-50 transition-all flex items-center justify-center space-x-4 active:scale-[0.98] relative overflow-hidden"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>구글 계정으로 시작하기</span>
                </>
              )}
            </button>

            <button 
              onClick={onGuestStart}
              className="w-full bg-gray-50 text-gray-500 font-bold py-4 rounded-3xl border border-transparent hover:bg-gray-100 transition-all flex items-center justify-center space-x-3 active:scale-[0.98]"
            >
              <UserCircle size={20} />
              <span className="text-sm">비회원으로 체험하기</span>
            </button>
          </div>

          {error && (
            <div className="mt-8 p-5 bg-rose-50 text-rose-600 rounded-[32px] border border-rose-100 animate-in slide-in-from-top-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle size={18} className="shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Configuration Issue</span>
              </div>
              <p className="text-[11px] font-bold text-left leading-relaxed">{error}</p>
              <div className="mt-3 pt-3 border-t border-rose-100/50 flex items-center space-x-2 text-[10px] font-black text-rose-400">
                <Settings size={12} />
                <span>Supabase Dashboard &gt; Auth &gt; Providers</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-4 text-[11px] font-bold text-gray-400 uppercase tracking-tight">
              <button onClick={() => setShowPrivacy(true)} className="hover:text-indigo-600 transition-colors underline underline-offset-4 decoration-indigo-200">개인정보 처리방침</button>
            </div>
            <p className="text-[10px] text-gray-300 text-center leading-relaxed">
              로그인은 데이터 동기화 용도로만 사용됩니다.<br />
              비회원 모드는 현재 브라우저에만 데이터가 저장됩니다.
            </p>
          </div>
        </div>
      </div>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};

export default Auth;
