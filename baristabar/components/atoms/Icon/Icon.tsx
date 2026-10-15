import {
  Search,
  UserRound,
  ShoppingBag,
  Menu,
  X,
  Heart,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  Coffee,
  Check,
} from "lucide-react";
  
  import type { LucideIcon, LucideProps } from "lucide-react";
  
  const icons = {
    search: Search,
    user: UserRound,
    cart: ShoppingBag,
    menu: Menu,
    close: X,
    heart: Heart,
    chevronDown: ChevronDown,
    plus: Plus,
    minus: Minus,
    trash: Trash2,
    coffee: Coffee,
    check: Check,
  } satisfies Record<string, LucideIcon>;
  
  export type IconName = keyof typeof icons;
  
  interface IconProps extends LucideProps {
    name: IconName;
  }
  
  export function Icon({
    name,
    size = 20,
    strokeWidth = 1.7,
    ...props
  }: IconProps) {
    const IconComponent = icons[name];
  
    return (
      <IconComponent
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        {...props}
      />
    );
  }
  