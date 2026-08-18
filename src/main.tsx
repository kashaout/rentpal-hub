import { createRoot } from "react-dom/client";
// Validate required public env vars before anything imports the Supabase client.
import "./lib/env";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
