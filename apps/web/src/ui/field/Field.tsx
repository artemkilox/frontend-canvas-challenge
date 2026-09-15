import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

type Common = {
  label: string;
  id: string;
};

export function TextField({ label, id, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.field}>
      <label className={styles.field__label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={styles.field__control} {...props} />
    </div>
  );
}

export function TextAreaField({
  label,
  id,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={styles.field}>
      <label className={styles.field__label} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={`${styles.field__control} ${styles.field__control_area}`}
        {...props}
      />
    </div>
  );
}
