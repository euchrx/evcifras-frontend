import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../contexts/AuthContext";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SearchPage } from "../pages/SearchPage";
import SongPage from "../pages/SongPage";
import ArtistPage from "../pages/ArtistPage";
import FavoritesPage from "../pages/FavoritesPage";
import RepertoiresPage from "../pages/RepertoiresPage";
import RepertoireDetailPage from "../pages/RepertoireDetailPage";
import AdminArtistsPage from "../pages/AdminArtistsPage";
import AdminSongsPage from "../pages/AdminSongsPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminAudioTracksPage from "../pages/AdminAudioTracksPage";
import ListenPage from "../pages/ListenPage";
import ListenTrackPage from "../pages/ListenTrackPage";
import OfflinePage from "../pages/OfflinePage";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function EditorRoute({ children }: { children: ReactElement }) {
  const { isEditor, loading } = useAuth();

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando...</p>;
  }

  if (!isEditor) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />

        <Route path="busca" element={<SearchPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />

        <Route path="artistas/:artistSlug" element={<ArtistPage />} />
        <Route path="cifras/:artistSlug/:songSlug" element={<SongPage />} />

        <Route path="ouvir" element={<ListenPage />} />
        <Route path="ouvir/:trackId" element={<ListenTrackPage />} />
        <Route path="offline" element={<OfflinePage />} />

        <Route
          path="favoritas"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="repertorios"
          element={
            <ProtectedRoute>
              <RepertoiresPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="repertorios/:id"
          element={
            <ProtectedRoute>
              <RepertoireDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <EditorRoute>
              <AdminDashboardPage />
            </EditorRoute>
          }
        />

        <Route
          path="admin/artistas"
          element={
            <EditorRoute>
              <AdminArtistsPage />
            </EditorRoute>
          }
        />

        <Route
          path="admin/cifras"
          element={
            <EditorRoute>
              <AdminSongsPage />
            </EditorRoute>
          }
        />

        <Route
          path="admin/audios"
          element={
            <EditorRoute>
              <AdminAudioTracksPage />
            </EditorRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}