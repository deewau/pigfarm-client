import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { TabBar } from './components/TabBar';
import { TrophyIcon, GiftsIcon, GameIcon, TasksIcon, ProfileIcon } from './components/icons';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tournaments" element={<PlaceholderPage title="Турниры" />} />
          <Route path="giveaways" element={<PlaceholderPage title="Розыгрыши" />} />
          <Route path="play" element={<PlaceholderPage title="Играть" />} />
          <Route path="tasks" element={<PlaceholderPage title="Задания" />} />
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
          <Route path="tournaments" element={<PlaceholderPage title="Турниры" />} />
          <Route path="giveaways" element={<PlaceholderPage title="Розыгрыши" />} />
          <Route path="play" element={<PlaceholderPage title="Играть" />} />
          <Route path="tasks" element={<PlaceholderPage title="Задания" />} />
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
          id: 'tasks',
          label: 'Задания',
          path: '/tasks',
          icon: <TasksIcon />,
          badge: true,
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

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>{title}</h1>
      <p>Страница в разработке</p>
    </div>
  );
}

export default App;
