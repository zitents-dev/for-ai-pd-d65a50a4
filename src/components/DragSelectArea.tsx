import { useRef, useCallback } from "react";
import { useDragSelect } from "@/hooks/useDragSelect";

interface DragSelectAreaProps {
  children: React.ReactNode;
  onSelectionChange: (selectedIds: Set<string>) => void;
  existingSelection: Set<string>;
  itemSelector?: string;
  getItemId?: (element: Element) => string | null;
  className?: string;
}

export function DragSelectArea({
  children,
  onSelectionChange,
  existingSelection,
  itemSelector = "[data-video-id]",
  getItemId,
  className = "",
}: DragSelectAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultGetItemId = useCallback((element: Element): string | null => {
    return element.getAttribute("data-video-id");
  }, []);

  const { isDragging, selectionBox, handleMouseDown } = useDragSelect({
    onSelectionChange,
    containerRef,
    itemSelector,
    getItemId: getItemId || defaultGetItemId,
    existingSelection,
  });

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? "crosshair" : undefined }}
    >
      {children}
      
      {/* Selection box overlay */}
      {isDragging && selectionBox && selectionBox.width > 5 && selectionBox.height > 5 && (
        <div
          className="absolute pointer-events-none z-50 border-2 border-primary bg-primary/10 rounded-sm"
          style={{
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      )}
    </div>
  );
}
