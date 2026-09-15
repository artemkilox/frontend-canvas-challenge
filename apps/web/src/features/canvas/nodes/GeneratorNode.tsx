'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '@/ui/button/Button';
import { TextField } from '@/ui/field/Field';
import type { GeneratorNodeData } from '@/domain/project';
import { useCanvasActions } from '../canvasContext';
import styles from '../nodes.module.css';

export function GeneratorNode({ id, data }: NodeProps) {
  const actions = useCanvasActions();
  const generator = data as GeneratorNodeData;
  const busy = actions.busyGeneratorIds.has(id);
  return (
    <div className={`${styles.node} ${styles.node_generator}`}>
      <Handle
        className={styles.node__handle}
        type="target"
        position={Position.Left}
        aria-label="Вход от текста"
      />
      <p className={styles.node__title}>Генератор</p>
      <p className={styles.node__port}>вход от текста · выход к результату</p>
      <div className="nodrag nowheel">
        <TextField
          id={`generator-label-${id}`}
          label="Подпись"
          value={generator.label}
          maxLength={80}
          onChange={(event) => actions.setGeneratorLabel(id, event.target.value)}
        />
        <label className={styles.node__check} htmlFor={`fail-${id}`}>
          <input
            id={`fail-${id}`}
            type="checkbox"
            checked={generator.simulateFailure}
            onChange={(event) => actions.setSimulateFailure(id, event.target.checked)}
          />
          Имитировать отказ
        </label>
        <Button type="button" disabled={busy} onClick={() => actions.runGeneration(id)}>
          {busy ? 'Генерация…' : 'Запустить'}
        </Button>
      </div>
      <Handle
        className={styles.node__handle}
        type="source"
        position={Position.Right}
        aria-label="Связь к результату"
      />
    </div>
  );
}
