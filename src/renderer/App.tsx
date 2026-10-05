import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Spin } from 'antd';
import SetupMaster from './components/Auth/SetupMaster';
import UnlockVault from './components/Auth/UnlockVault';
import MainLayout from './components/Common/Layout';
import { useAuthStore } from './store/auth.store';
import { useVaultStore } from './store/vault.store';

export default function App(): JSX.Element {
  const initialized = useAuthStore((state) => state.initialized);
  const unlocked = useAuthStore((state) => state.unlocked);
  const loading = useAuthStore((state) => state.loading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const handleLocked = useAuthStore((state) => state.handleLocked);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = window.securepass.events.onLocked(() => {
      handleLocked();
      useVaultStore.getState().clear();
    });
    return unsubscribe;
  }, [bootstrap, handleLocked]);

  if (loading) {
    return (
      <div className="app-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!initialized) {
    return <SetupMaster />;
  }

  if (!unlocked) {
    return <UnlockVault />;
  }

  return (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  );
}
