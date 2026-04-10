import { useTelegram } from '../hooks/useTelegram';

export function Home() {
  const { user } = useTelegram();

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>👋 Привет{user?.first_name ? `, ${user.first_name}` : ''}!</h1>
      <p>ID: {user?.id}</p>
    </div>
  );
}