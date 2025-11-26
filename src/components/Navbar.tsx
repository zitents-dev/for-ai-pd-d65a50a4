import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavLink } from "./NavLink";
import { useAuth } from "@/lib/auth";
import { Upload, User, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/ai-pd-hub-logo.svg";

export const Navbar = () => {
  const { user } = useAuth();
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
        <NavLink to="/" className="font-bold text-xl flex items-center gap-2">
          <img src={logo} alt="AI PD Hub" className="h-8 w-8" />
          AI PD Hub
        </NavLink>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl flex gap-2">
          <Input
            type="search"
            placeholder="제목, PD명, 태그...."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          <Button type="submit" size="icon" variant="ghost">
            <Search className="w-4 h-4" />
          </Button>
        </form>
        
        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <NavLink to="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  관리
                </NavLink>
              </Button>
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
