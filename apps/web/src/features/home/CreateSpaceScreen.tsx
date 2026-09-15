'use client';

import { messageForApiError } from '@/domain/apiMessages';
import { startHomeSpace } from '@/features/canvas/spaceBootstrap';
import { Notice } from '@/ui/notice/Notice';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../canvas/canvas.module.css';

export function CreateSpaceScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void startHomeSpace()
      .then((id) => {
        if (!cancelled) {
          router.replace(`/spaces/${id}`);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(messageForApiError(cause, 'Не удалось создать пространство. Запущен ли API?'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className={styles.center}>
        <Notice tone="error">{error}</Notice>
      </div>
    );
  }

  return (
    <div className={styles.center}>
      <p>Создаём пространство…</p>
    </div>
  );
}
