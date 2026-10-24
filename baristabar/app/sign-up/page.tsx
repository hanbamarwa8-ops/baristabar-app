import { AuthTemplate } from "@/components/templates/AuthTemplate/AuthTemplate";

type SignUpPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps) {
  const params = await searchParams;

  const nextPath =
    params.next === "/checkout" ? "/checkout" : undefined;

  return <AuthTemplate mode="sign-up" nextPath={nextPath} />;
}