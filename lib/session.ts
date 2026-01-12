import { SessionOptions } from 'iron-session';

export interface SessionData {
    user: {
        _id: string;
        username: string;
        email: string;
        role: 'user' | 'admin'; // Add role field
        avatar?: string;
    };
    isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
    password: process.env.SECRET_COOKIE_PASSWORD as string,
    cookieName: 'iron-session-cookie',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
    },
};
