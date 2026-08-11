"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/paths";
import { getPublicEnv, hasSupabasePublicConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_CONFIG_MISSING,
  AUTH_ERROR_GENERIC,
  AUTH_RESET_EMAIL_SENT,
  AUTH_SIGNUP_SUCCESS_CONFIRM,
} from "@/features/auth/messages";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabasePublicConfig()) {
    return { error: AUTH_CONFIG_MISSING };
  }

  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_GENERIC };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: AUTH_ERROR_GENERIC };
  }

  redirect(safeNextPath(formString(formData, "next")));
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabasePublicConfig()) {
    return { error: AUTH_CONFIG_MISSING };
  }

  const parsed = signUpSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_GENERIC };
  }

  const env = getPublicEnv();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/app`,
    },
  });

  if (error) {
    return { error: AUTH_ERROR_GENERIC };
  }

  // When email confirmation is disabled, a session is returned immediately.
  if (data.session) {
    redirect("/app");
  }

  return { success: AUTH_SIGNUP_SUCCESS_CONFIRM };
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabasePublicConfig()) {
    return { error: AUTH_CONFIG_MISSING };
  }

  const parsed = forgotPasswordSchema.safeParse({
    email: formString(formData, "email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_GENERIC };
  }

  const env = getPublicEnv();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // Still return a generic success-style message to avoid enumeration.
    return { success: AUTH_RESET_EMAIL_SENT };
  }

  return { success: AUTH_RESET_EMAIL_SENT };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabasePublicConfig()) {
    return { error: AUTH_CONFIG_MISSING };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_GENERIC };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: AUTH_ERROR_GENERIC };
  }

  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  if (!hasSupabasePublicConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
