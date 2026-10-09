// Standalone entry for the Variant 2 artifact build (scripts/artifact_v2.py): the same <SiteV2 /> the Next
// app renders at /v2, mounted without the Next runtime so every asset path can be relative to the page.
import { createRoot } from "react-dom/client";
import SiteV2 from "@/v2/SiteV2";

createRoot(document.getElementById("ora-root")!).render(<SiteV2 />);
