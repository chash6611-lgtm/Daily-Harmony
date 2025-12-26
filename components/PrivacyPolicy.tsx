
import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20">
        {/* 헤더 */}
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-indigo-50/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">개인정보 처리방침</h2>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Privacy Policy for Daily Harmony</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide text-gray-600 text-sm leading-relaxed font-medium">
          <section className="space-y-3">
            <h3 className="text-gray-900 font-black flex items-center space-x-2">
              <Lock size={18} className="text-indigo-500" />
              <span>1. 수집하는 개인정보 항목</span>
            </h3>
            <p>본 앱은 원활한 서비스 제공을 위해 아래와 같은 정보를 수집합니다.</p>
            <ul className="list-disc ml-5 space-y-1 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <li><strong>구글 로그인 정보:</strong> 이메일 주소, 이름, 프로필 사진 (사용자 식별용)</li>
              <li><strong>사용자 입력 정보:</strong> 생년월일, 태어난 시간 (바이오리듬 및 운세 계산용)</li>
              <li><strong>서비스 설정:</strong> Gemini API 키 (AI 운세 기능 연동용)</li>
              <li><strong>콘텐츠:</strong> 사용자가 작성한 일별 메모 및 기록 (서비스 본연의 기능)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 font-black flex items-center space-x-2">
              <EyeOff size={18} className="text-indigo-500" />
              <span>2. 개발자의 데이터 접근 및 관리 (중요)</span>
            </h3>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-2 text-[13px]">
              <p className="text-amber-800 font-bold">"데이터베이스 관리자로서의 책임"</p>
              <p className="text-amber-700">
                본 앱의 데이터베이스(Supabase) 관리 권한은 개발자에게 있으며, 기술적으로 저장된 데이터의 구조와 내용을 확인할 수 있습니다. 하지만 개발자는 다음 사항을 엄격히 준수할 것을 약속합니다.
              </p>
              <ul className="list-disc ml-5 space-y-1 text-amber-900/70 text-xs">
                <li>사용자의 동의 없이 개인적인 데이터를 열람하거나 복제하지 않습니다.</li>
                <li>저장된 정보(생년월일, 메모 등)를 외부 제3자에게 판매하거나 공유하지 않습니다.</li>
                <li>API 키와 같은 민감 정보는 시스템 운영 및 동기화 목적으로만 사용되며, 개발자가 이를 사적으로 도용하지 않습니다.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 font-black flex items-center space-x-2">
              <Trash2 size={18} className="text-indigo-500" />
              <span>3. 데이터의 보관 및 파기</span>
            </h3>
            <p>사용자의 정보는 서비스 이용 기간 동안 안전하게 보관되며, 다음의 경우 지체 없이 파기합니다.</p>
            <ul className="list-disc ml-5 space-y-1 text-xs">
              <li>사용자가 회원 탈퇴를 요청하거나 계정을 삭제하는 경우</li>
              <li>수집 및 이용 목적이 달성된 경우</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 font-black">4. 보안 대책</h3>
            <p>본 앱은 Supabase의 강력한 보안 프로토콜을 사용하여 데이터를 보호합니다. 모든 통신은 SSL로 암호화되며, 데이터베이스는 물리적으로 분리된 안전한 클라우드 환경에서 관리됩니다.</p>
          </section>

          <div className="pt-8 border-t border-gray-50 text-[11px] text-gray-400 text-center">
            본 방침은 2024년 5월 20일부터 적용됩니다.
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="p-6 bg-gray-50 text-center">
          <button 
            onClick={onClose}
            className="w-full max-w-xs bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
