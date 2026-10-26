
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import type { LucideIcon } from "lucide-react";
   
  type StatCardProps = {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    iconClassName?: string;
  };
  
  export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    iconClassName = "text-primary",
  }: StatCardProps) {
    return (
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="rounded-xl bg-muted p-2">
            <Icon className={`h-5 w-5 ${iconClassName}`} />
          </div>
        </CardHeader>
  
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    );
  }
  