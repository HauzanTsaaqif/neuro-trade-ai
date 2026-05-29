'use client';
import { useState, useEffect } from 'react';

interface Props {
  text: string;
  spd?: number;
}

export default function TypewriterText({ text, spd = 18 }: Props) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setOut('');
    setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        clearInterval(t);
      }
    }, spd);
    return () => clearInterval(t);
  }, [text, spd]);

  return (
    <>
      {out}
      {!done && (
        <span
          className="cursor"
          style={{
            display: 'inline-block',
            width: '2px',
            height: '13px',
            background: 'rgba(255,255,255,.5)',
            marginLeft: '2px',
            verticalAlign: 'middle',
          }}
        />
      )}
    </>
  );
}
