import { useState, useCallback } from 'react';
import type { Region } from '../../shared/types';

export function useRegions() {
  const [tree, setTree] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTree = useCallback(async () => {
    setLoading(true);
    const data = await window.electronAPI.invoke('regions:tree') as Region[];
    setTree(data);
    setLoading(false);
    return data;
  }, []);

  const buildNodeMap = useCallback(() => {
    const map = new Map<number, Region[]>();
    for (const r of tree) {
      const parentId = r.parent_id ?? 0;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(r);
    }
    return map;
  }, [tree]);

  return { tree, loading, loadTree, buildNodeMap };
}
