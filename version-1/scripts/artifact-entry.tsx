// Standalone entry for the Claude artifact build (scripts/artifact.py): the same <Site /> the Next app
// renders, mounted without the Next runtime so every asset path can be relative to the page.
import { createRoot } from "react-dom/client";
import Site from "@/components/Site";

createRoot(document.getElementById("ora-root")!).render(<Site />);
