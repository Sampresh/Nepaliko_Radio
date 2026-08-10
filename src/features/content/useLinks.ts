import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { db } from '@/services/firebase';
import type { StationLink } from '@/types/firestore';

export function useLinks() {
  return useQuery<StationLink[]>({
    queryKey: ['links'],
    queryFn: async () => {
      const snapshot = await getDocs(
        query(collection(db, 'links'), where('isActive', '==', true), orderBy('order', 'asc'))
      );
      return snapshot.docs.map((d) => ({ ...(d.data() as Omit<StationLink, 'id'>), id: d.id }));
    },
  });
}
