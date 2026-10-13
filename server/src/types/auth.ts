export type AuthUser = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  birthDate: Date | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};
