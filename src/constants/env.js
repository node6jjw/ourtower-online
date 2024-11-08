import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 6666;
export const HOST = process.env.HOST || '127.0.0.1';
export const CLIENT_VERSION = process.env.CLIENT_VERSION || '1.0.0';
