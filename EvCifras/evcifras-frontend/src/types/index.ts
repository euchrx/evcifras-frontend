export type UserRole = "ADMIN" | "EDITOR" | "USER";

export type SongStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
};

export type Artist = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  bio?: string | null;
  mainGenre?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    songs: number;
  };
  songs?: Song[];
};

export type Song = {
  id: string;
  title: string;
  slug: string;
  lyrics: string;
  chords: string;
  originalKey?: string | null;
  currentKey?: string | null;
  capo?: string | null;
  genre?: string | null;
  difficulty: Difficulty;
  status: SongStatus;
  youtubeUrl?: string | null;
  views: number;
  artistId: string;
  artist?: Artist;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
