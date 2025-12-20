import { useMemo } from "react";
import { Link } from "react-router-dom";

interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className = "" }: MentionTextProps) {
  const parts = useMemo(() => {
    // Match @username patterns (username can contain letters, numbers, spaces, Korean characters, etc.)
    // Stops at newline or special characters
    const mentionRegex = /@([\w\uAC00-\uD7A3\u3130-\u318F\s]+?)(?=\s@|\s|$|[.,!?;:])/g;
    const result: { type: "text" | "mention"; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        result.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add the mention
      result.push({
        type: "mention",
        content: match[1].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [text]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "mention") {
          return (
            <Link
              key={index}
              to={`/search?q=@${encodeURIComponent(part.content)}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              @{part.content}
            </Link>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}
