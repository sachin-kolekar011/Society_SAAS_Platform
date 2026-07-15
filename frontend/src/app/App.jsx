import Providers from './providers';
import AppRouter from './router';
import '../styles/tailwind.css';

export default function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
