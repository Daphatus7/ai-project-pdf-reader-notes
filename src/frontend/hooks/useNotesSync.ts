import { useEffect, useRef } from 'react';
import { useAuth } from '../features/auth';
import { useNotesStore } from '../context/store.tsx';

/**
 * Hook to sync notes when user authenticates.
 * Call this in a component that renders after auth.
 */
export function useNotesSync() {
  const { session } = useAuth();
  const fetchNotes = useNotesStore((state) => state.fetchNotes);
  const isLoading = useNotesStore((state) => state.isLoading);
  const error = useNotesStore((state) => state.error);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Fetch notes when session becomes available
    if (session && !hasFetched.current) {
      hasFetched.current = true;
      fetchNotes().catch(console.error);
    }

    // Reset flag when session is cleared (logout)
    if (!session) {
      hasFetched.current = false;
    }
  }, [session, fetchNotes]);

  return { isLoading, error };
}
