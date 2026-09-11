import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Check({ tone, children }: { tone: 'ok' | 'warn' | 'err'; children: ReactNode }) {
  return <p className={`check ${tone}`}>{children}</p>;
}
