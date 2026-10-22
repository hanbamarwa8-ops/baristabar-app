import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

const supabase =
  supabaseUrl && publishableKey
    ? createClient(supabaseUrl, publishableKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!supabase || !adminEmail) {
    res.status(500).json({
      success: false,
      message:
        "Admin API is not configured. Check SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and ADMIN_EMAIL in backend/.env.",
    });
    return;
  }

  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1]?.trim();

  if (!accessToken) {
    res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });
    return;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: "The authentication session is invalid or expired.",
      });
      return;
    }

    if ((user.email ?? "").trim().toLowerCase() !== adminEmail) {
      res.status(403).json({
        success: false,
        message: "This account is not authorized to manage the catalogue.",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin authentication verification failed:", error);
    res.status(401).json({
      success: false,
      message: "Unable to verify the authentication session.",
    });
  }
}
