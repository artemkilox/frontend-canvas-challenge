'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TextAreaField } from '@/ui/field/Field';
import type { PromptNodeData } from '@/domain/project';
import { useCanvasActions } from '../canvasContext';
import styles from '../nodes.module.css';

export function PromptNode({ id, data }: NodeProps) {
  const actions = useCanvasActions();
  const prompt = data as PromptNodeData;
  return (
    <div className={`${styles.node} ${styles.node_prompt}`}>
      <p className={styles.node__title}>Текст</p>
      <p className={styles.node__port}>выход → генератор</p>
      <div className="nodrag nowheel">
        <TextAreaField
          id={`prompt-${id}`}
          label="Описание изображения"
          value={prompt.text}
          maxLength={2000}
          onChange={(event) => actions.setPromptText(id, event.target.value)}
        />
      </div>
      <Handle
        className={styles.node__handle}
        type="source"
        position={Position.Right}
        aria-label="Связь к генератору"
      />
    </div>
  );
}
