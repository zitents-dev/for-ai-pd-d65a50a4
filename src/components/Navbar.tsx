import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavLink } from "./NavLink";
import { useAuth } from "@/lib/auth";
import { Upload, User, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/hephai-logo.png";
import str from "@/assets/hephai-str-only.png";
import { NotificationDropdown } from "./NotificationDropdown";
import { Skeleton } from "@/components/ui/skeleton";

export const Navbar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <NavLink to="/" className="font-bold text-xl flex items-center">
          <img src={logo} alt="Hephai logo" className="h-8 w-9" />
          <img src={str} alt="Hephai string" className="h-8 w-32" />
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

        <div className="flex items-center gap-2 ml-auto">
          {loading ? (
            <>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </>
          ) : user ? (
            <>
              <Button asChild variant="ghost" size="sm">
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
        </div>
      </div>
    </nav>
  );
};
