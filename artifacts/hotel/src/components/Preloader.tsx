import { useEffect, useState } from "react";

export function Preloader() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`preloader ${hidden ? "hidden" : ""}`} aria-hidden={hidden}>
      <div className="logo-mark">M</div>
      <div className="text-cream tracking-widest text-xs uppercase">Nuzul Al-Ma'ali</div>
    </div>
  );
}
