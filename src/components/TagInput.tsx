import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

export const TagInput = ({
  tags,
  onTagsChange,
  maxTags = 5,
  placeholder = "태그 입력 후 Enter",
}: TagInputProps) => {
  const [tagInput, setTagInput] = useState("");
  const [suggestions, setSuggestions] = useState<{ tag: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (tagInput.trim().length === 0) {
        // Show popular tags when input is empty but focused
        const { data } = await supabase
          .from("community_posts")
          .select("tags")
          .not("tags", "is", null);

        if (data) {
          const tagCounts: Record<string, number> = {};
          data.forEach((post) => {
            post.tags?.forEach((tag: string) => {
              if (!tags.includes(tag)) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              }
            });
          });

          const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([tag, count]) => ({ tag, count }));

          setSuggestions(sortedTags);
        }
        return;
      }

      // Filter suggestions based on input
      const { data } = await supabase
        .from("community_posts")
        .select("tags")
        .not("tags", "is", null);

      if (data) {
        const tagCounts: Record<string, number> = {};
        const searchTerm = tagInput.toLowerCase();
        
        data.forEach((post) => {
          post.tags?.forEach((tag: string) => {
            if (
              tag.toLowerCase().includes(searchTerm) &&
              !tags.includes(tag)
            ) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          });
        });

        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag, count]) => ({ tag, count }));

        setSuggestions(sortedTags);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(debounceTimer);
  }, [tagInput, tags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTag = (tagToAdd?: string) => {
    const trimmedTag = (tagToAdd || tagInput).trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag]);
      setTagInput("");
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleAddTag(suggestions[highlightedIndex].tag);
      } else {
        handleAddTag();
      }
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Tag className="w-4 h-4" />
        태그 (최대 {maxTags}개)
      </label>
      
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input with Autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            disabled={tags.length >= maxTags}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleAddTag()}
            disabled={!tagInput.trim() || tags.length >= maxTags}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && tags.length < maxTags && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <div className="p-2 text-xs text-muted-foreground border-b border-border">
              {tagInput ? "검색 결과" : "인기 태그"}
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.tag}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-accent transition-colors",
                  highlightedIndex === index && "bg-accent"
                )}
                onClick={() => handleAddTag(suggestion.tag)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span>#{suggestion.tag}</span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.count}개 게시글
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        태그를 사용하면 다른 사용자가 질문을 쉽게 찾을 수 있습니다.
      </p>
    </div>
  );
};
