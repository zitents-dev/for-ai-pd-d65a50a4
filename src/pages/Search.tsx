import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { VideoCard } from "@/components/VideoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Video, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface Creator {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Search videos by title or tags
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
        .order("created_at", { ascending: false });

      if (videoError) throw videoError;
      setVideos(videoData || []);

      // Search creators by name
      const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("name", `%${searchQuery}%`);

      if (creatorError) throw creatorError;
      setCreators(creatorData || []);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="제목, PD명, 태그로 검색하세요..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 w-full"
            />
            <Button type="submit">
              <SearchIcon className="w-4 h-4 mr-2" />
              찾기
            </Button>
          </form>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="videos" className="gap-2">
                  <Video className="w-4 h-4" />
                  작품들 ({videos.length})
                </TabsTrigger>
                <TabsTrigger value="creators" className="gap-2">
                  <User className="w-4 h-4" />
                  PD명 ({creators.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="videos" className="mt-6">
                {videos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    작품을 찾을 수 없습니다
                  </div>
                )}
              </TabsContent>

              <TabsContent value="creators" className="mt-6">
                {creators.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {creators.map((creator) => (
                      <Card key={creator.id} className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={creator.avatar_url || ""} />
                            <AvatarFallback>{creator.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{creator.name}</h3>
                            {creator.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {creator.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    PD명을 찾을 수 없습니다
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
