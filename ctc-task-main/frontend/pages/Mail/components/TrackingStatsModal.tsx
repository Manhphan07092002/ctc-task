import React, { useState, useEffect } from 'react';
import { MailOpen, MailX, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '../../../services/api';

interface TrackingStatsModalProps {
  onClose: () => void;
}

export default function TrackingStatsModal({ onClose }: TrackingStatsModalProps) {
  const [trackingStats, setTrackingStats] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchTrackingStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await apiFetch('/api/mail/tracking-stats');
      if (res.ok) {
        const data = await res.json();
        setTrackingStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTrackingStats();
  }, []);

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <MailOpen size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Thống Kê Lượt Đọc Email</h3>
              <p className="text-xs text-gray-500">Xem trạng thái các email đã gửi có đính kèm tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm border border-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          {isLoadingStats ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <RefreshCw className="animate-spin mb-3" size={24} />
              <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : trackingStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MailX size={36} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">Chưa có dữ liệu thống kê</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trackingStats.map(stat => (
                <div key={stat.id} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-amber-200 hover:shadow-sm transition-all">
                  <div className="min-w-0 pr-4">
                    <h4 className="font-semibold text-gray-800 text-sm truncate mb-1" title={stat.subject}>{stat.subject || '(Không có tiêu đề)'}</h4>
                    <p className="text-xs text-gray-500 mb-2 truncate">Đến: {stat.to}</p>
                    <p className="text-[10px] text-gray-400">Gửi lúc: {new Date(stat.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${stat.opens > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {stat.opens > 0 ? `Đã mở (${stat.opens} lần)` : 'Chưa mở'}
                    </div>
                    {stat.lastOpen && (
                      <span className="text-[10px] text-gray-400">Lần cuối: {new Date(stat.lastOpen).toLocaleString('vi-VN')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
