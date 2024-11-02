export interface AuthUser {
    name: string;
    email: string;
    groups: string[];
    org_name: string;
    user_type: "admin" | "viewer";
    admin: boolean;
    user_id?: number;
    accounts?: { [key: string]: string }[];
    roles?: string[];
  }