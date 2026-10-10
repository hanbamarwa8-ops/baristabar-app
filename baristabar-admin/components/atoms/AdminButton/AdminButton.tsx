import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

export function AdminButton({
  ...props
}: ComponentProps<typeof Button>) {
  return <Button {...props} />;
}