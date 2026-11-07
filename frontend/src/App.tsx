import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { OperatorPanel } from './pages/OperatorPanel';
import { PublicScoreboard } from './pages/PublicScoreboard';
import { HistoryPage } from './pages/HistoryPage';
import { StandingsPage } from './pages/StandingsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'arena' | 'standings' | 'matches' | 'history' | 'settings' | 'public'>('arena');

  // Detect URL path on mount
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path.includes('/public') || hash === '#public') {
      setCurrentView('public');
    } else if (path.includes('/standings') || hash === '#standings') {
      setCurrentView('standings');
    } else if (path.includes('/history') || hash === '#history') {
      setCurrentView('history');
    }
  }, []);

  // Update browser history when view changes
  const handleSelectTab = (tab: 'arena' | 'standings' | 'matches' | 'history' | 'settings') => {
    if (tab === 'matches') {
      // Switches to arena kontrol with match switcher
      setCurrentView('arena');
    } else {
      setCurrentView(tab);
    }
    window.history.pushState({}, '', tab === 'arena' ? '/' : `/${tab}`);
  };

  const handleOpenPublic = () => {
    // If user holds Ctrl or wants new tab, window.open; otherwise switch view
    window.open('/public', '_blank');
  };

  // If public scoreboard is requested, render it full screen
  if (currentView === 'public') {
    return (
      <PublicScoreboard
        onBackToOperator={() => {
          setCurrentView('arena');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070e1e] font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentView as any}
        onSelectTab={handleSelectTab}
        onOpenPublic={() => setCurrentView('public')}
      />

      {/* Main Content View */}
      {currentView === 'arena' && (
        <OperatorPanel onOpenPublic={() => setCurrentView('public')} />
      )}

      {currentView === 'standings' && (
        <StandingsPage />
      )}

      {currentView === 'history' && (
        <HistoryPage />
      )}

      {currentView === 'settings' && (
        <SettingsPage />
      )}
    </div>
  );
};

export default App;

