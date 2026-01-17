import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavLink } from "./NavLink";
import { useAuth } from "@/lib/auth";
import { Upload, User, Search, Home, Users, HelpCircle, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/hephai-logo.png";
import str from "@/assets/hephai-str-only.png";
import { NotificationDropdown } from "./NotificationDropdown";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Navbar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navItems = [
    { to: "/", icon: Home, label: "홈" },
    { to: "/community", icon: Users, label: "커뮤니티" },
    { to: "/inquiry", icon: HelpCircle, label: "문의하기" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-2 sm:gap-4 px-4">
        <NavLink to="/" className="font-bold text-xl flex items-center flex-shrink-0">
          <img src={logo} alt="Hephai logo" className="h-8 w-9" />
          <img src={str} alt="Hephai string" className="h-8 w-32 hidden sm:block" />
        </NavLink>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl flex gap-2">
          <Input
            type="search"
            placeholder="제목, 크리에이터 명, 태그...."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          <Button type="submit" size="icon" variant="ghost">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Button key={item.to} asChild variant="ghost" size="sm">
              <NavLink to={item.to}>
                <item.icon className="w-4 h-4 mr-1" />
                {item.label}
              </NavLink>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {loading ? (
            <>
              <Skeleton className="h-8 w-20 hidden sm:block" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </>
          ) : user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                <NavLink to="/upload">
                  <Upload className="w-4 h-4 mr-2" />새 작품
                </NavLink>
              </Button>
              <NotificationDropdown />
              <Button asChild variant="ghost" size="icon">
                <NavLink to="/my-page">
                  <User className="w-8 h-8" />
                </NavLink>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <NavLink to="/auth">로그인</NavLink>
              </Button>
            </>
          )}

          {/* Mobile Hamburger Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={logo} alt="Hephai logo" className="h-6 w-7" />
                  메뉴
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    asChild
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <NavLink to={item.to}>
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </NavLink>
                  </Button>
                ))}
                {user && (
                  <Button
                    asChild
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <NavLink to="/upload">
                      <Upload className="w-4 h-4 mr-2" />새 작품
                    </NavLink>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
