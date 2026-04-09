import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, AlertTriangle, Search, Wifi, ChevronUp, Disc3, CircleDot, Square, Layout as LayoutIcon } from 'lucide-react';

export interface ActionModalsProps {
  showReportIssue: boolean;
  setShowReportIssue: (val: boolean) => void;
  showReportAbuse: boolean;
  setShowReportAbuse: (val: boolean) => void;
  showHelp: boolean;
  setShowHelp: (val: boolean) => void;
  showLivestream: boolean;
  setShowLivestream: (val: boolean) => void;
  showRecordingModal: boolean;
  setShowRecordingModal: (val: boolean) => void;
  showLayoutSettings: boolean;
  setShowLayoutSettings: (val: boolean) => void;
  
  isRecording: boolean;
  toggleRecording: () => void;
}

export const ActionModals: React.FC<ActionModalsProps> = ({
  showReportIssue, setShowReportIssue,
  showReportAbuse, setShowReportAbuse,
  showHelp, setShowHelp,
  showLivestream, setShowLivestream,
  showRecordingModal, setShowRecordingModal,
  showLayoutSettings, setShowLayoutSettings,
  isRecording, toggleRecording
}) => {
  return (
    <AnimatePresence>
      {showReportIssue && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2"><MessageSquare size={24} className="text-gray-400" /> Báo cáo sự cố</h2>
              <button onClick={() => setShowReportIssue(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <p className="text-gray-400 mb-4 text-sm">Vui lòng mô tả chi tiết sự cố bạn đang gặp phải. Phản hồi của bạn sẽ giúp chúng tôi cải thiện hệ thống.</p>
            <textarea className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 min-h-[120px] resize-none mb-6" placeholder="Bắt đầu nhập nội dung..."></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReportIssue(false)} className="px-5 py-2.5 rounded-full text-brand-400 font-medium hover:bg-brand-500/10 transition-colors">Huỷ</button>
              <button onClick={() => { setShowReportIssue(false); alert('Cảm ơn bạn đã gửi báo cáo!'); }} className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors">Gửi báo cáo</button>
            </div>
          </motion.div>
        </div>
      )}

      {showReportAbuse && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-red-400 flex items-center gap-2"><AlertTriangle size={24} /> Báo cáo lạm dụng</h2>
              <button onClick={() => setShowReportAbuse(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <p className="text-gray-400 mb-4 text-sm">Chúng tôi xem xét nghiêm túc các hành vi vi phạm. Vui lòng chọn lý do phù hợp nhất:</p>
            <div className="flex flex-col gap-2 mb-4">
              {['Ngôn từ kích động và quấy rối', 'Nội dung phản cảm', 'Hành vi lừa đảo', 'Khác'].map(opt => (
                <label key={opt} className="flex items-center gap-3 p-3 bg-[#111] rounded-xl border border-gray-700 cursor-pointer hover:border-gray-500">
                  <input type="radio" name="abuse-type" className="w-5 h-5 accent-red-500" />
                  <span className="text-white text-sm">{opt}</span>
                </label>
              ))}
            </div>
            <textarea className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 min-h-[80px] resize-none mb-6" placeholder="Cung cấp thêm ngữ cảnh (nếu có)..."></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReportAbuse(false)} className="px-5 py-2.5 rounded-full text-gray-300 font-medium hover:bg-white/5 transition-colors">Huỷ</button>
              <button onClick={() => { setShowReportAbuse(false); alert('Báo cáo của bạn đã được ghi nhận.'); }} className="px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Gửi báo cáo</button>
            </div>
          </motion.div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2"><Search size={24} className="text-brand-400" /> Khắc phục sự cố và trợ giúp</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="bg-[#111] border border-gray-700 rounded-xl p-4 mb-5">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Wifi size={16} className="text-green-400" /> Tình trạng kết nối: Ổn định</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Độ trễ tín hiệu (Ping)</span> <span className="text-green-400">~24ms</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Băng thông Video</span> <span className="text-white">1.2 Mbps</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Máy chủ</span> <span className="text-white">Asia-East-1 (WebRTC)</span></div>
              </div>
            </div>
            
            <h3 className="text-white font-medium mb-3">Vấn đề thường gặp</h3>
            <div className="space-y-2 mb-6">
              <button className="w-full text-left p-3.5 rounded-xl border border-gray-700 hover:bg-[#111] transition-colors text-gray-300 text-sm flex justify-between items-center">
                Không nghe được người khác nói? <ChevronUp size={16} className="rotate-90"/>
              </button>
              <button className="w-full text-left p-3.5 rounded-xl border border-gray-700 hover:bg-[#111] transition-colors text-gray-300 text-sm flex justify-between items-center">
                Camera của tôi bị đen/không hoạt động? <ChevronUp size={16} className="rotate-90"/>
              </button>
              <button className="w-full text-left p-3.5 rounded-xl border border-gray-700 hover:bg-[#111] transition-colors text-gray-300 text-sm flex justify-between items-center">
                Cách bật/tắt phông nền AI <ChevronUp size={16} className="rotate-90"/>
              </button>
            </div>

            <div className="flex justify-end pr-2">
              <button onClick={() => setShowHelp(false)} className="px-8 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">Đóng</button>
            </div>
          </motion.div>
        </div>
      )}
      
      {showLivestream && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2"><Wifi size={24} className="text-brand-400" /> Phát trực tuyến</h2>
              <button onClick={() => setShowLivestream(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <p className="text-gray-400 mb-4 text-sm">Phát sóng trực tiếp cuộc họp của bạn tới các nền tảng có hỗ trợ RTMP.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Nền tảng</label>
                <select className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 cursor-pointer">
                  <option>YouTube Live</option>
                  <option>Facebook Live</option>
                  <option>Tuỳ chỉnh (Custom RTMP)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Khoá phát luồng (Stream Key)</label>
                <input type="password" placeholder="Nhập Stream Key" className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLivestream(false)} className="px-5 py-2.5 rounded-full text-brand-400 font-medium hover:bg-brand-500/10 transition-colors">Đóng</button>
              <button onClick={() => { setShowLivestream(false); alert('Đang kết nối tới máy chủ phát trực tuyến...'); }} className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors">Bắt đầu phát</button>
            </div>
          </motion.div>
        </div>
      )}

      {showRecordingModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700 text-center">
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowRecordingModal(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="w-20 h-20 rounded-full bg-[#111] border border-gray-700 mx-auto flex items-center justify-center mb-4">
              {isRecording ? <Disc3 size={40} className="text-red-500 animate-spin-slow" /> : <CircleDot size={40} className="text-gray-400" />}
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Ghi hình cuộc họp</h2>
            <p className="text-gray-400 mb-6 text-sm">Bản ghi của bạn sẽ được lưu cục bộ trên máy tính dưới dạng file WebM.</p>
            
            {isRecording ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-400 font-medium flex items-center justify-center gap-2"><Disc3 size={16} className="animate-spin-slow" /> Đang ghi hình (Lưu cục bộ)</p>
              </div>
            ) : (
               <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700 border-dashed">
                <p className="text-gray-500 text-sm">Chưa có tiến trình ghi hình nào đang diễn ra.</p>
              </div>
            )}
            
            <div className="flex justify-center gap-3">
              <button onClick={() => { toggleRecording(); setShowRecordingModal(false); }} className={`px-8 py-3 rounded-full text-white font-medium transition-all shadow-lg w-full flex items-center justify-center gap-2 ${isRecording ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600 ring-2 ring-transparent hover:ring-red-500/50'}`}>
                {isRecording ? <><Square size={18} fill="currentColor"/> Dừng ghi</> : <><CircleDot size={18} /> Bắt đầu ghi hình</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showLayoutSettings && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2"><LayoutIcon size={24} className="text-brand-400" /> Bố cục màn hình</h2>
              <button onClick={() => setShowLayoutSettings(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-3 mb-6">
               {['Tự động', 'Xếp kề (Tiled)', 'Điểm nhấn (Spotlight)', 'Thanh bên (Sidebar)'].map((l, i) => (
                  <label key={l} className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${i === 0 ? 'bg-brand-500/20 border-brand-500' : 'bg-[#111] border-gray-700 hover:border-gray-500'}`}>
                    <span className={`text-sm ${i === 0 ? 'text-brand-300 font-medium' : 'text-white'}`}>{l}</span>
                    <input type="radio" name="layout" defaultChecked={i === 0} className="w-4 h-4 accent-brand-500" />
                  </label>
               ))}
            </div>
            <p className="text-gray-400 text-xs mb-2 text-center">Bố cục `Tự động` sẽ ưu tiên hiển thị người đang phát biểu và người được Share Screen.</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
