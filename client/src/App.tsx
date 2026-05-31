import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Profile } from './pages/Profile';
import { Play } from './pages/Play';
import { CasesPage } from './pages/CasesPage';
import { CasePage } from './pages/CasePage';
import { Crash } from './pages/Crash';
import { Mines } from './pages/Mines';
import { Plinko } from './pages/Plinko';
import { Inventory } from './pages/Inventory';
import { Leaderboard } from './pages/Leaderboard';
import { TabBar } from './components/TabBar';
import { AppHeader } from './components/AppHeader';
import { LiveFeed } from './components/LiveFeed';
import { ComingSoon } from './components/ComingSoon';
import { LeaderboardIcon, GameIcon, InventoryIcon, ProfileIcon } from './components/icons';
import { LiveFeedProvider, useLiveFeed } from './contexts/LiveFeedContext';

function App() {
  return (
    <BrowserRouter>
      <LiveFeedProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Play />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="play" element={<Play />} />
            <Route path="play/crash" element={<Crash />} />
            <Route path="play/mines" element={<Mines />} />
            <Route path="play/plinko" element={<Plinko />} />
            <Route path="play/cases" element={<CasesPage />} />
            <Route path="play/:cost" element={<CasePage />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="tasks" element={<ComingSoon title="Задания" subtitle="Выполняй задания и зарабатывай звёзды!" icon="✅" />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </LiveFeedProvider>
    </BrowserRouter>
  );
}

function Layout() {
  const location = useLocation();
  const isCrash = location.pathname === '/play/crash';
  const { liveWins, connectionState } = useLiveFeed();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {!isCrash && <AppHeader />}
      {!isCrash && <LiveFeed wins={liveWins} connectionState={connectionState} />}
      <div style={{ flex: 1, overflow: isCrash ? 'hidden' : 'auto', paddingTop: isCrash ? '0' : '104px' }}>
        <Outlet />
      </div>
      {!isCrash && <BottomBar />}
    </div>
  );
}

function BottomBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('leaderboard')) return 'leaderboard';
    if (path.includes('inventory')) return 'inventory';
    if (path.includes('profile')) return 'profile';
    return 'play';
  };

  return (
      <TabBar
      activeTab={getActiveTab()}
      onTabChange={(tabId) => {
        const tab = [
          { id: 'leaderboard', path: '/leaderboard' },
          { id: 'play', path: '/play' },
          { id: 'inventory', path: '/inventory' },
          { id: 'profile', path: '/profile' },
        ].find(t => t.id === tabId);
        if (tab) navigate(tab.path);
      }}
      tabs={[
        {
          id: 'leaderboard',
          label: 'Лидеры',
          path: '/leaderboard',
          icon: <LeaderboardIcon />,
        },
        {
          id: 'play',
          label: 'Играть',
          path: '/play',
          icon: <GameIcon />,
        },
        {
          id: 'inventory',
          label: 'Инвентарь',
          path: '/inventory',
          icon: <InventoryIcon />,
        },
        {
          id: 'profile',
          label: 'Профиль',
          path: '/profile',
          icon: <ProfileIcon />,
        },
      ]}
    />
  );
}

export default App;
