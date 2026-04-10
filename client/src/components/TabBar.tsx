import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './TabBar.css';

export interface TabItem {
  id: string;
  label: string;
  icon: ReactNode;
  path?: string;
  badge?: boolean | number;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

// Бейдж уведомлений
const Badge: FC<{ count?: boolean | number }> = ({ count }) => {
  if (!count) return null;
  const label = typeof count === 'number' ? count : '';
  return (
    <span className="tab-bar__badge">
      {label && (
        <span className="tab-bar__badge-text">
          {label}
        </span>
      )}
    </span>
  );
};

export const TabBar: FC<TabBarProps> = ({ tabs, activeTab, onTabChange }) => {
  const navigate = useNavigate();

  const handleTabClick = (tab: TabItem) => {
    if (tab.path) {
      navigate(tab.path);
    }
    onTabChange?.(tab.id);
  };

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`tab-bar__item ${isActive ? 'tab-bar__item--active' : ''}`}
            type="button"
          >
            <span className="tab-bar__icon-wrapper">
              <span className="tab-bar__icon">
                {tab.icon}
              </span>
              <Badge count={tab.badge} />
            </span>
            <span className="tab-bar__label">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default TabBar;
