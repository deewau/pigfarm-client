import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Profile } from './pages/Profile';
import { Play } from './pages/Play';
import { Inventory } from './pages/Inventory';
import { TabBar } from './components/TabBar';
import { AppHeader } from './components/AppHeader';
import { ComingSoon } from './components/ComingSoon';
import { GiftsIcon, GameIcon, InventoryIcon, ProfileIcon } from './components/icons';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Play />} />
          <Route path="giveaways" element={<ComingSoon title="Розыгрыши" subtitle="Участвуй в розыгрышах и получай подарки!" icon="🎁" />} />
          <Route path="play" element={<Play />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="tasks" element={<ComingSoon title="Задания" subtitle="Выполняй задания и зарабатывай звёзды!" icon="✅" />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <AppHeader />
      <div style={{ flex: 1, overflow: 'auto', paddingTop: '72px' }}>
        <Outlet />
      </div>
      <BottomBar />
    </div>
  );
}

function BottomBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('giveaways')) return 'giveaways';
    if (path.includes('inventory')) return 'inventory';
    if (path.includes('profile')) return 'profile';
    return 'play';
  };

  return (
      <TabBar
      activeTab={getActiveTab()}
      onTabChange={(tabId) => {
        const tab = [
          { id: 'giveaways', path: '/giveaways' },
          { id: 'play', path: '/play' },
          { id: 'inventory', path: '/inventory' },
          { id: 'profile', path: '/profile' },
        ].find(t => t.id === tabId);
        if (tab) navigate(tab.path);
      }}
      tabs={[
        {
          id: 'giveaways',
          label: 'Розыгрыши',
          path: '/giveaways',
          icon: <GiftsIcon />,
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
