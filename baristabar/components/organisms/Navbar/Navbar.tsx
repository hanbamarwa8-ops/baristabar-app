import { Logo } from "@/components/atoms/Logo";
import { Icon } from "@/components/atoms/Icon";
import { Button } from "@/components/atoms/IconButton";
import { NavItem } from "@/components/molecules/NavItem";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/coffee", label: "Coffee" },
  { href: "/discovery", label: "Discovery" },
  { href: "/recipes", label: "Recipes" },
  { href: "/beanbox", label: "BeanBox" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white">
      <div className="mx-auto grid h-[72px] max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center px-6">

        {/* Logo */}
        <div className="justify-self-start">
          <Logo />
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {navigation.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
            />
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center justify-self-end gap-1">
        <Button
  variant="ghost"
  aria-label="Search"
  className="h-9 w-9 cursor-pointer rounded-full p-0"
>
  <Icon name="search" size={17} />
</Button>

<Button
  variant="ghost"
  aria-label="Account"
  className="h-9 w-9 cursor-pointer rounded-full p-0"
>
  <Icon name="user" size={17} />
</Button>

<Button
  variant="ghost"
  aria-label="Cart"
  className="h-9 w-9 cursor-pointer rounded-full p-0"
>
  <Icon name="cart" size={17} />
</Button>
        </div>
      </div>
    </header>
  );
}
