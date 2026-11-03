import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app/styles.css";
import { SessionProvider } from "./app/SessionContext.tsx";
import { AppRoutes } from "./routes/AppRoutes.tsx";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemen root tidak ditemukan.");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
