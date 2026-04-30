import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.FC;
}

interface AdminTabGroupProps {
  title: string;
  description: string;
  icon: React.ElementType;
  tabs: TabItem[];
}

export const AdminTabGroup: React.FC<AdminTabGroupProps> = ({ title, description, icon: Icon, tabs }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabId = searchParams.get('tab') || tabs[0]?.id;

  // Ensure valid tab
  useEffect(() => {
    if (!tabs.find(t => t.id === currentTabId) && tabs.length > 0) {
      setSearchParams({ tab: tabs[0].id });
    }
  }, [currentTabId, tabs, setSearchParams]);

  const activeTab = tabs.find(t => t.id === currentTabId) || tabs[0];
  const ActiveComponent = activeTab?.component;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Tab Group Header */}
      <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-lg shadow-brand-200">
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative border-b-2
                  ${isActive 
                    ? 'text-brand-600 border-brand-500' 
                    : 'text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-200'}
                `}
              >
                <tab.icon size={16} className={isActive ? 'text-brand-500' : 'opacity-60'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-visible relative min-h-0">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};
