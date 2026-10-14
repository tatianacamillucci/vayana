import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initializeDatabase, type Database } from '../lib/db/index';

interface DatabaseContextType {
  db: Database | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  isLoading: true,
  error: null,
});

export function useDatabase(): DatabaseContextType {
  return useContext(DatabaseContext);
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps): React.ReactElement {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const database = await initializeDatabase();
        if (mounted) {
          setDb(database);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize database');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        db,
        isReady: !!db,
        isLoading,
        error,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
