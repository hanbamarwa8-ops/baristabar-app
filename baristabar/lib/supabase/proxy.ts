import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // En développement, les pages publiques et le build peuvent fonctionner
  // sans configuration. Les pages protégées doivent toujours vérifier l'accès.
  if (!supabaseUrl || !publishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          // Transmettre les nouveaux cookies aux composants serveur
          // de la requête en cours.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Créer la réponse avec la requête mise à jour.
          supabaseResponse = NextResponse.next({ request });

          // Transmettre les nouveaux cookies au navigateur.
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          // Préserver les en-têtes associés à la mise à jour de session.
          for (const [name, value] of Object.entries(headers ?? {})) {
            supabaseResponse.headers.set(name, value);
          }
        },
      },
    },
  );

  // Vérifie les claims et permet au SDK de renouveler la session si nécessaire.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
