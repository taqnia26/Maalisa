import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make all fetch calls send cookies — needed for session-based auth.
const _origFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  _origFetch(input, { credentials: "include", ...init, ...(init.credentials ? {} : { credentials: "include" }) });

createRoot(document.getElementById("root")!).render(<App />);
