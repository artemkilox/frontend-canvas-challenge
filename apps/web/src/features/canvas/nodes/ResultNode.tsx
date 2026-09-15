'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TextField } from '@/ui/field/Field';
import type { ResultNodeData } from '@/domain/project';
import { useCanvasActions, useResultOverlay } from '../canvasContext';
import styles from '../nodes.module.css';

export function ResultNode({ id, data }: NodeProps) {
  const actions = useCanvasActions();
  const result = data as ResultNodeData;
  const overlay = useResultOverlay(id);
  return (
    <div className={`${styles.node} ${styles.node_result}`}>
      <Handle
        className={styles.node__handle}
        type="target"
        position={Position.Left}
        aria-label="Вход от генератора"
      />
      <p className={styles.node__title}>Результат</p>
      <p className={styles.node__port}>вход от генератора</p>
      <div className="nodrag nowheel">
        <TextField
          id={`result-label-${id}`}
          label="Подпись"
          value={result.label}
          maxLength={80}
          onChange={(event) => actions.setResultLabel(id, event.target.value)}
        />
      </div>
      {overlay?.status === 'processing' ? (
        <p className={styles.node__status}>Ожидание изображения…</p>
      ) : null}
      {overlay?.status === 'failed' ? (
        <p className={styles.node__status} role="alert">
          Генерация не удалась. Включите или выключите «имитировать отказ» и нажмите «Запустить»
          снова.
        </p>
      ) : null}
      {overlay?.status === 'succeeded' && overlay.imageUrl ? (
        <img
          className={styles.node__image}
          src={overlay.imageUrl}
          alt="Сгенерированное изображение"
        />
      ) : null}
    </div>
  );
}
