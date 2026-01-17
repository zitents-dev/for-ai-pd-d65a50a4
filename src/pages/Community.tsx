import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Eye,
  Heart,
  Clock,
  Search,
  Pin,
  User,
  LayoutGrid,
  Wand2,
  Briefcase,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  name_ko: string;
  description: string;
  icon: string;
  color: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  views: number;
  created_at: string;
  category_id: string;
  user_id: string;
  profile: {
    name: string;
    avatar_url: string;
  };
  category: Category | null;
  likes_count: number;
  comments_count: number;
}

const iconMap: { [key: string]: React.ElementType } = {
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Image: ImageIcon,
  MessageCircle,
  LayoutGrid,
  Wand2,
  Briefcase,
  GraduationCap,
  MoreHorizontal,
};

const Community = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategories();
    loadPosts();
  }, [selectedCategory, searchQuery]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("community_categories")
      .select("*")
      .order("created_at");

    if (!error && data) {
      setCategories(data);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    
    let query = supabase
      .from("community_posts")
      .select(`
        *,
        profile:profiles!community_posts_user_id_fkey(name, avatar_url),
        category:community_categories(*)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error("Error loading posts:", error);
      setLoading(false);
      return;
    }

    // Get likes and comments count for each post
    const postsWithCounts = await Promise.all(
      (data || []).map(async (post) => {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from("community_post_likes")
            .select("id", { count: "exact", head: true })
            .eq("post_id", post.id),
          supabase
            .from("community_comments")
            .select("id", { count: "exact", head: true })
            .eq("post_id", post.id),
        ]);

        return {
          ...post,
          likes_count: likesResult.count || 0,
          comments_count: commentsResult.count || 0,
        };
      })
    );

    setPosts(postsWithCounts);
    setLoading(false);
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || MessageSquare;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <Navbar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">커뮤니티</h1>
            <p className="text-muted-foreground mt-1">
              다른 크리에이터들과 소통하고 정보를 공유해보세요
            </p>
          </div>
          <Button onClick={() => navigate("/community/create")}>
            <Plus className="w-4 h-4 mr-2" />
            질문하기
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            전체
          </Button>
          {categories.filter(cat => cat.name !== "all").map((category) => {
            const IconComponent = getCategoryIcon(category.icon);
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  borderColor: selectedCategory === category.id ? category.color : undefined,
                  backgroundColor: selectedCategory === category.id ? category.color : undefined,
                }}
              >
                <IconComponent className="w-4 h-4 mr-1" />
                {category.name_ko}
              </Button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="게시글 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>아직 게시글이 없습니다.</p>
                <p className="text-sm mt-1">첫 번째 글을 작성해보세요!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/community/${post.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={post.profile?.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.is_pinned && (
                          <Pin className="w-4 h-4 text-primary" />
                        )}
                        {post.category && (
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                          >
                            {post.category.name_ko}
                          </Badge>
                        )}
                        {post.image_url && (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{post.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>{post.profile?.name || "익명"}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {post.comments_count}
                        </span>
                      </div>
                    </div>
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <BackToTopButton />
    </div>
  );
};

export default Community;
