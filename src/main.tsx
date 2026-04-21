import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedSampleDocuments } from "./lib/seedDocuments";

seedSampleDocuments();

createRoot(document.getElementById("root")!).render(<App />);
