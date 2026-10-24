import { AuthTemplate } from "@/components/templates/AuthTemplate/AuthTemplate";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const params = await searchParams;

  const nextPath =
    params.next === "/checkout" ? "/checkout" : undefined;

  return <AuthTemplate mode="sign-in" nextPath={nextPath} />;
}