import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Play } from './pages/Play';
import { TabBar } from './components/TabBar';
import { ComingSoon } from './components/ComingSoon';
import { GiftsIcon, GameIcon, ProfileIcon } from './components/icons';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="giveaways" element={<ComingSoon title="Розыгрыши" subtitle="Участвуй в розыгрышах и получай подарки!" icon="🎁" />} />
          <Route path="play" element={<Play />} />
          <Route path="tasks" element={<ComingSoon title="Задания" subtitle="Выполняй задания и зарабатывай звёзды!" icon="✅" />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="giveaways" element={<ComingSoon title="Розыгрыши" subtitle="Участвуй в розыгрышах и получай подарки!" icon="🎁" />} />
          <Route path="play" element={<Play />} />
          <Route path="tasks" element={<ComingSoon title="Задания" subtitle="Выполняй задания и зарабатывай звёзды!" icon="✅" />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      </div>
      <BottomBar />
    </div>
  );
}

function BottomBar() {
  return (
    <TabBar
      activeTab="home"
      onTabChange={(tabId) => {
        console.log('Active tab:', tabId);
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
