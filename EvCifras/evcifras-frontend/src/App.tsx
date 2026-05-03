import { BrowserRouter } from "react-router-dom";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AudioPlayerProvider>
          <AppRoutes />
        </AudioPlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;