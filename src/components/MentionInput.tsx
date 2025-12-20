import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

export function MentionInput({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  className = "",
  minHeight = "80px",
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search users when mention query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!mentionQuery || mentionQuery.length < 1) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .ilike("name", `%${mentionQuery}%`)
          .eq("is_deleted", false)
          .limit(5);

        if (error) throw error;
        setSuggestions((data as User[]) || []);
      } catch (error) {
        console.error("Error searching users:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounceTimer);
  }, [mentionQuery]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Handle text input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      onChange(newValue);

      // Check if we're in a mention context
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Check if there's a space or newline after @, meaning the mention is complete
        const hasSpaceAfterAt = /\s/.test(textAfterAt);

        if (!hasSpaceAfterAt) {
          setMentionStartIndex(lastAtIndex);
          setMentionQuery(textAfterAt);
          setShowSuggestions(true);
          return;
        }
      }

      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    },
    [onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          if (showSuggestions && suggestions.length > 0) {
            e.preventDefault();
            selectUser(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
        case "Tab":
          if (showSuggestions && suggestions.length > 0) {
            e.preventDefault();
            selectUser(suggestions[selectedIndex]);
          }
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex]
  );

  // Select a user from suggestions
  const selectUser = useCallback(
    (user: User) => {
      if (mentionStartIndex === -1) return;

      const beforeMention = value.slice(0, mentionStartIndex);
      const cursorPos = textareaRef.current?.selectionStart || value.length;
      const afterMention = value.slice(cursorPos);

      const newValue = `${beforeMention}@${user.name} ${afterMention}`;
      onChange(newValue);

      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);

      // Set cursor position after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeMention.length + user.name.length + 2; // +2 for @ and space
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    },
    [value, onChange, mentionStartIndex]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{ minHeight }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full max-w-xs bg-popover border border-border rounded-md shadow-lg overflow-hidden"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              검색 중...
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto">
              {suggestions.map((user, index) => (
                <li
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {user.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {user.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
