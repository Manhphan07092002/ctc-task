const fs = require('fs');
const path = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/index.tsx';
let src = fs.readFileSync(path, 'utf8');

// Replace from tabClass definition to just before <ReportModal
const startMarker = '  const tabClass = (tab: string) =>';
const endMarker = '      <ReportModal';

const si = src.indexOf(startMarker);
const ei = src.indexOf(endMarker);
if (si === -1 || ei === -1) { console.error('Markers not found', si, ei); process.exit(1); }

const newSection = `  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Báo cáo</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gửi, theo dõi và xuất báo cáo công việc hàng tuần</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={16}/> Xuất CSV
          </button>
          {(canCreate || canApprove) && !canViewAll && (
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">
              <PlusCircle size={16}/>
              {canApprove ? 'Tạo báo cáo tổng hợp phòng' : 'Tạo báo cáo tuần này'}
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS (non-director) */}
      {!canViewAll && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tổng báo cáo', value: myStats.total,    bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100',   icon: <FileText size={22}/> },
            { label: 'Chờ duyệt',    value: myStats.pending,  bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', icon: <Clock size={22}/> },
            { label: 'Đã duyệt',     value: myStats.approved, bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100',  icon: <CheckCircle size={22}/> },
            { label: 'Từ chối',      value: myStats.rejected, bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100',    icon: <XCircle size={22}/> },
          ].map(s => (
            <div key={s.label} className={\`rounded-2xl border \${s.bg} \${s.border} p-4 flex items-center gap-3\`}>
              <div className={\`\${s.text} opacity-80\`}>{s.icon}</div>
              <div>
                <p className={\`text-2xl font-bold \${s.text}\`}>{s.value}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {!canViewAll && (
          <button
            className={\`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 \${activeTab==='mine'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}\`}
            onClick={() => setActiveTab('mine')}
          >
            <FileText size={15}/> Báo cáo của tôi
            <span className="bg-gray-100 text-gray-600 text-[11px] px-1.5 py-0.5 rounded-full">{myStats.total}</span>
          </button>
        )}
        {!canViewAll && canApprove && (
          <button
            className={\`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 \${activeTab==='pending'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}\`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={15}/> Cần duyệt
            {pendingList.length > 0 && <span className="bg-red-500 text-white text-[11px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingList.length}</span>}
          </button>
        )}
        {canViewAll && (
          <>
            <button className={\`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 \${activeTab==='pending'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}\`} onClick={()=>setActiveTab('pending')}>
              <Clock size={15}/> Chưa duyệt
              {pendingDirectorReports.length>0&&<span className="bg-red-500 text-white text-[11px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingDirectorReports.length}</span>}
            </button>
            <button className={\`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 \${activeTab==='all'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}\`} onClick={()=>setActiveTab('all')}>
              <CheckCircle size={15}/> Đã duyệt
              {directorReports.length>0&&<span className="bg-green-100 text-green-700 text-[11px] px-1.5 py-0.5 rounded-full">{directorReports.length}</span>}
            </button>
            <button className={\`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 \${activeTab==='weekly_summary'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}\`} onClick={()=>setActiveTab('weekly_summary')}>
              <CalendarDays size={15}/> Tổng hợp tuần
            </button>
          </>
        )}
      </div>

      {/* DEPT FILTER */}
      {activeTab==='all'&&canViewAll&&(
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 font-medium">Phòng:</span>
          {['all',...departments.filter(d=>!['GIÁM ĐỐC','ADMIN'].includes(d.name)).map(d=>d.name)].map(n=>(
            <button key={n} onClick={()=>setFilterDept(n)}
              className={\`px-3 py-1.5 text-xs font-medium rounded-full transition-colors \${filterDept===n?'bg-blue-600 text-white shadow-sm':'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}\`}>
              {n==='all'?'Tất cả':n}
            </button>
          ))}
        </div>
      )}

      {/* WEEKLY SUMMARY */}
      {activeTab==='weekly_summary'&&canViewAll?(
        <div className="space-y-5">
          {Object.entries(
            [...directorReports,...pendingDirectorReports].reduce((acc,r)=>{
              let k='Tuần không xác định';
              try{const c=JSON.parse(r.content||'{}');if(c.weekStart&&c.weekEnd)k=\`Tuần \${c.weekStart} – \${c.weekEnd}\`;}catch{}
              if(!acc[k])acc[k]=[];acc[k].push(r);return acc;
            },{} as Record<string,Report[]>)
          ).sort((a,b)=>b[0].localeCompare(a[0])).map(([week,rpts])=>(
            <div key={week} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                <h3 className="font-bold text-blue-800 flex items-center gap-2"><CalendarDays size={16}/>{week}</h3>
                <span className="text-xs font-medium text-blue-600 bg-white px-2.5 py-1 rounded-full border border-blue-200">{rpts.length} phòng</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {departments.filter(d=>!['GIÁM ĐỐC','ADMIN'].includes(d.name)).map(dept=>{
                  const rpt=rpts.find(r=>r.department===dept.name);
                  return(
                    <div key={dept.id} onClick={()=>rpt&&handleOpenView(rpt)}
                      className={\`p-4 rounded-xl border-2 transition-all \${rpt?'border-green-200 bg-green-50/40 hover:bg-green-50 cursor-pointer shadow-sm hover:shadow':'border-dashed border-gray-200 bg-gray-50/50'}\`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={\`w-9 h-9 rounded-lg flex items-center justify-center \${rpt?'bg-green-100 text-green-600':'bg-gray-100 text-gray-400'}\`}><Building2 size={18}/></div>
                        <div className="flex-1 min-w-0">
                          <h4 className={\`font-semibold text-sm \${rpt?'text-gray-800':'text-gray-400'}\`}>{dept.name}</h4>
                          {rpt&&<div className="mt-0.5">{renderStatusBadge(rpt.status)}</div>}
                        </div>
                      </div>
                      {rpt?<p className="text-xs text-gray-500 line-clamp-2">{rpt.title}</p>:<p className="text-xs text-gray-400 flex items-center gap-1"><XCircle size={12}/>Chưa nộp</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {directorReports.length===0&&pendingDirectorReports.length===0&&(
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              <FileText size={40} className="mx-auto mb-3 opacity-20"/><p className="font-medium">Không có dữ liệu tổng hợp</p>
            </div>
          )}
        </div>
      ):(
        /* REPORT LIST */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 grid grid-cols-12 gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-6 md:col-span-5">Báo cáo</div>
            <div className="col-span-3 hidden md:block text-center">Người duyệt</div>
            <div className="col-span-2 text-center">Trạng thái</div>
            <div className="col-span-6 md:col-span-2 text-right">Ngày</div>
          </div>
          <div className="divide-y divide-gray-100">
            {displayedReports.length===0?(
              <div className="py-16 text-center text-gray-400">
                <FileText size={44} className="mx-auto mb-3 opacity-20"/>
                <p className="font-medium text-gray-500">Không có báo cáo nào</p>
                <p className="text-sm mt-1 text-gray-400">{activeTab==='pending'?'Tất cả báo cáo đã được xử lý ✓':'Nhấn nút tạo báo cáo để bắt đầu'}</p>
              </div>
            ):displayedReports.map(report=>{
              const author=getUserDetails(report.authorId);
              let approver=report.approvedBy?getUserDetails(report.approvedBy):null;
              if(!approver&&report.status==='Pending'){const dept=departments.find(d=>d.name===report.department);if(dept?.managerId)approver=getUserDetails(dept.managerId);}
              const lColor=report.status==='Approved'?'border-l-green-400':report.status==='Pending'?'border-l-yellow-400':report.status==='Rejected'?'border-l-red-400':'border-l-gray-200';
              const iColor=report.status==='Approved'?'bg-green-100 text-green-600':report.status==='Pending'?'bg-yellow-100 text-yellow-600':report.status==='Rejected'?'bg-red-100 text-red-500':'bg-gray-100 text-gray-400';
              const d=new Date(report.approvedAt||report.submittedAt||report.createdAt);
              return(
                <div key={report.id} onClick={()=>handleOpenView(report)}
                  className={\`px-5 py-4 grid grid-cols-12 gap-3 items-center hover:bg-blue-50/40 transition-colors cursor-pointer group border-l-4 \${lColor}\`}>
                  <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                    <div className={\`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center \${iColor}\`}><FileText size={18}/></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate text-sm group-hover:text-blue-600 transition-colors">{report.title}</p>
                      {(canViewAll||canApprove)&&author&&(
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Avatar src={author.avatar} alt={author.name} size={4}/>{author.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 hidden md:flex items-center justify-center">
                    {approver?(<div className="flex items-center gap-2"><Avatar src={approver.avatar} alt={approver.name} size={6}/><span className="truncate max-w-[90px] text-xs text-gray-600">{approver.name}</span></div>):<span className="text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 flex justify-center">{renderStatusBadge(report.status)}</div>
                  <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">{d.toLocaleDateString('vi-VN')}</p>
                      <p className="text-[11px] text-gray-400">{d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    {report.authorId===user.id&&(
                      <button onClick={e=>{e.stopPropagation();setDeleteConfirmId(report.id);}} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      `;

const result = src.slice(0, si) + newSection + src.slice(ei);
fs.writeFileSync(path, result, 'utf8');
console.log('Done! Lines:', result.split('\n').length);
