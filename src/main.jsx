import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import { PRODUCT_NAME } from "./config/product";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./index.css";

document.title = PRODUCT_NAME;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
