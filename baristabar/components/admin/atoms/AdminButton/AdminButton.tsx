import { Button } from "@/components/admin/ui/button";
import type { ComponentProps } from "react";

export function AdminButton({
  ...props
}: ComponentProps<typeof Button>) {
  return <Button {...props} />;
}