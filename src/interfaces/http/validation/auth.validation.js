import { z } from 'zod';

export const registerSchema = { body: z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) }) };
export const loginSchema = { body: z.object({ email: z.string().email(), password: z.string().min(6) }) };
export const refreshSchema = { body: z.object({ refreshToken: z.string() }) };
export const forgotSchema = { body: z.object({ email: z.string().email(), baseUrl: z.string().url().optional() }) };
export const resetSchema = { body: z.object({ token: z.string(), password: z.string().min(6) }) };
export const prefsSchema = { body: z.object({ locale: z.string().min(2).max(10).optional(), notifications: z.object({ email: z.coerce.boolean().optional(), sms: z.coerce.boolean().optional(), push: z.coerce.boolean().optional() }).partial().optional() }) };
export const emailReqSchema = { body: z.object({ baseUrl: z.string().url().optional() }) };
export const emailVerifySchema = { body: z.object({ token: z.string() }) };
export const emailChangeSchema = { body: z.object({ newEmail: z.string().email(), baseUrl: z.string().url().optional() }) };
export const updateProfileSchema = { body: z.object({ name: z.string().min(2) }) };
export const changePasswordSchema = { body: z.object({ currentPassword: z.string().min(6), newPassword: z.string().min(6) }) };
