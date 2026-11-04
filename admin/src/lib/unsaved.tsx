import { createContext, useContext, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';

const UnsavedContext = createContext<MutableRefObject<number> | null>(null);

export function UnsavedProvider({ children }: { children: ReactNode }) {
  const dirtyEditors = useRef(0);
  return <UnsavedContext.Provider value={dirtyEditors}>{children}</UnsavedContext.Provider>;
}

export function useUnsavedGuard(isDirty: boolean): void {
  const dirtyEditors = useContext(UnsavedContext);

  useEffect(() => {
    if (!isDirty) return undefined;
    if (dirtyEditors) dirtyEditors.current += 1;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => {
      if (dirtyEditors) dirtyEditors.current -= 1;
      window.removeEventListener('beforeunload', warn);
    };
  }, [isDirty, dirtyEditors]);
}

export function useConfirmLeave(): () => boolean {
  const { t } = useTranslation();
  const dirtyEditors = useContext(UnsavedContext);
  return () => !dirtyEditors?.current || window.confirm(t('common.confirmLeave'));
}

// Covers every move to another screen, including the browser's Back button. Logging out asks by itself.
export function LeaveGuard() {
  const { t } = useTranslation();
  const dirtyEditors = useContext(UnsavedContext);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      Boolean(dirtyEditors?.current) && currentLocation.pathname !== nextLocation.pathname && nextLocation.pathname !== '/login'
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(t('common.confirmLeave'))) blocker.proceed();
    else blocker.reset();
  }, [blocker, t]);

  return null;
}
