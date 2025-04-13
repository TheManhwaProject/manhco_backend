export interface SessionUser {
    id: number;
    firstName: string;
    secondName: string | null;
    email: string;
    profilePic: string | null;
    role: {
      name: string;
      priority: number;
    };
  }
  