import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { TabBar } from './components/TabBar';
import { ComingSoon } from './components/ComingSoon';
import { TrophyIcon, GiftsIcon, GameIcon, ProfileIcon } from './components/icons';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tournaments" element={<ComingSoon title="Турниры" subtitle="Соревнуйся с другими игроками и выигрывай призы!" icon="🏆" />} />
          <Route path="giveaways" element={<ComingSoon title="Розыгрыши" subtitle="Участвуй в розыгрышах и получай подарки!" icon="🎁" />} />
          <Route path="play" element={<ComingSoon title="Играть" subtitle="Увлекательные мини-игры уже скоро!" icon="🎮" />} />
          <Route path="tasks" element={<ComingSoon title="Задания" subtitle="Выполняй задания и зарабатывай звёзды!" icon="✅" />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, paddingBottom: 80 }}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="tournaments" element={<ComingSoon title="Турниры" subtitle="Соревнуйся с другими игроками и выигрывай призы!" icon="🏆" />} />
          <Route path="giveaways" element={<ComingSoon title="Розыгрыши" subtitle="Участвуй в розыгрышах и получай подарки!" icon="🎁" />} />
          <Route path="play" element={<ComingSoon title="Играть" subtitle="Увлекательные мини-игры уже скоро!" icon="🎮" />} />
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
          id: 'tournaments',
          label: 'Турниры',
          path: '/tournaments',
          icon: <TrophyIcon />,
        },
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
