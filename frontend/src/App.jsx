import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AppRoutes } from "./routes/AppRoutes";
import { AutoTranslate } from "./components/AutoTranslate";

export function App() {
  return (
    <AppProvider>
      <AutoTranslate />
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

export default App;
