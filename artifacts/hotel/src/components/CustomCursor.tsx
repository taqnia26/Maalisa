import { useEffect, useRef } from "react";

export function CustomCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const el = ref.current;
    if (!el) return;
    let x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener("mousemove", onMove);
    const setHover = (on: boolean) => el.classList.toggle("hover", on);
    const overEnter = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest("a,button,[role='button'],.tilt-card,.btn-gold,.btn-outline-gold")) setHover(true);
    };
    const overLeave = () => setHover(false);
    document.addEventListener("mouseover", overEnter);
    document.addEventListener("mouseout", overLeave);
    let raf = 0;
    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", overEnter);
      document.removeEventListener("mouseout", overLeave);
    };
  }, []);
  return <div ref={ref} className="cursor-dot" aria-hidden />;
}
