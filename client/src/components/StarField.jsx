import { useEffect, useRef } from 'react';

export default function StarField() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const count = 120;
    const stars = [];
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 2.5 + 0.5;
      star.className = 'star';
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        --duration: ${Math.random() * 4 + 2}s;
        --delay: ${Math.random() * 4}s;
        opacity: ${Math.random() * 0.6 + 0.2};
      `;
      container.appendChild(star);
      stars.push(star);
    }
    return () => stars.forEach((s) => s.remove());
  }, []);

  return <div ref={containerRef} className="stars-bg" />;
}
