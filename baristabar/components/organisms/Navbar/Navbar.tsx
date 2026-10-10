import { Search, User, ShoppingBag } from "lucide-react";

import { Logo } from "@/components/atoms/Logo/Logo";
import { Button } from "@/components/atoms/IconButton/Button";
import { NavItem } from "@/components/molecules/NavItem/NavItem";

export function Navbar() {
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Logo />

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <NavItem href="/" label="Home" />
          <NavItem href="/shop" label="Shop" />
          <NavItem href="/coffee" label="Coffee" />
          <NavItem href="/discovery" label="Discovery" />
          <NavItem href="/recipes" label="Recipes" />
          <NavItem href="/beanbox" label="BeanBox" />
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            aria-label="Search"
            className="h-10 w-10 rounded-full p-0 hover:bg-muted"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            aria-label="Account"
            className="h-10 w-10 rounded-full p-0 hover:bg-muted"
          >
            <User className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            aria-label="Cart"
            className="h-10 w-10 rounded-full p-0 hover:bg-muted"
          >
            <ShoppingBag className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </header>
  );
}