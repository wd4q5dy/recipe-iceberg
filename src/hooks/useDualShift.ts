import { useEffect, useState } from 'react';

/** True only while both Shift keys are held down together. */
export function useDualShift(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const held = new Set<string>();
    const sync = () => setActive(held.has('ShiftLeft') && held.has('ShiftRight'));

    const down = (event: KeyboardEvent) => {
      if (event.code !== 'ShiftLeft' && event.code !== 'ShiftRight') return;
      held.add(event.code);
      sync();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'ShiftLeft' && event.code !== 'ShiftRight') return;
      held.delete(event.code);
      sync();
    };
    const reset = () => {
      held.clear();
      sync();
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);

  return active;
}
