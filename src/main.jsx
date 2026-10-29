import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { PRODUCT_NAME } from "./config/product";
import { isDemoPath, loadApp } from "./lib/loadApp";
import Root from "./Root";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./index.css";

// Anywhere but /demo, start fetching the signed-in app as soon as this file
// runs, not when React first renders. If it fails, the error screen says so
// once the route asks for it.
if (!isDemoPath(window.location.pathname)) loadApp().catch(() => {});

document.title = PRODUCT_NAME;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
);
