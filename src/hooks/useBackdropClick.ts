import { useEffect, useRef } from 'react';

export function useBackdropClick(onClose: () => void, isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && e.target === ref.current) {
        onClose();
      }
    };

    const el = ref.current;
    if (el) {
      el.addEventListener('click', handleClick);
      return () => el.removeEventListener('click', handleClick);
    }
  }, [isOpen, onClose]);

  return ref;
}
