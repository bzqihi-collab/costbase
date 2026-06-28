import { useCallback, useEffect, useState } from 'react';

export function useIPC<T>(channel: string, params?: unknown) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (args?: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke(channel, ...(args !== undefined ? [args] : []));
      setData(result as T);
      return result as T;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    if (params !== undefined) {
      execute(params);
    }
  }, []);

  return { data, loading, error, execute, refetch: execute };
}
