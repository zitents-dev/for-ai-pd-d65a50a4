import { useState, useCallback, useRef, useEffect } from "react";

interface DragSelectOptions {
  onSelectionChange: (selectedIds: Set<string>) => void;
  containerRef: React.RefObject<HTMLElement>;
  itemSelector: string;
  getItemId: (element: Element) => string | null;
  existingSelection?: Set<string>;
}

interface DragSelectResult {
  isDragging: boolean;
  selectionBox: { left: number; top: number; width: number; height: number } | null;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useDragSelect({
  onSelectionChange,
  containerRef,
  itemSelector,
  getItemId,
  existingSelection = new Set(),
}: DragSelectOptions): DragSelectResult {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const initialSelection = useRef<Set<string>>(new Set());

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag on left click and if not clicking on interactive elements
      if (e.button !== 0) return;
      
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='menuitem']") ||
        target.closest("[role='checkbox']") ||
        target.closest("input") ||
        target.closest(".video-card-content")
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left + container.scrollLeft;
      const y = e.clientY - containerRect.top + container.scrollTop;

      startPoint.current = { x, y };
      initialSelection.current = new Set(existingSelection);
      
      // Hold shift to add to selection, otherwise start fresh
      if (!e.shiftKey) {
        initialSelection.current = new Set();
      }

      setIsDragging(true);
      setSelectionBox({ left: x, top: y, width: 0, height: 0 });

      e.preventDefault();
    },
    [containerRef, existingSelection]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !startPoint.current || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left + container.scrollLeft;
      const currentY = e.clientY - containerRect.top + container.scrollTop;

      const left = Math.min(startPoint.current.x, currentX);
      const top = Math.min(startPoint.current.y, currentY);
      const width = Math.abs(currentX - startPoint.current.x);
      const height = Math.abs(currentY - startPoint.current.y);

      setSelectionBox({ left, top, width, height });

      // Find intersecting items
      const items = container.querySelectorAll(itemSelector);
      const newSelection = new Set(initialSelection.current);

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemLeft = itemRect.left - containerRect.left + container.scrollLeft;
        const itemTop = itemRect.top - containerRect.top + container.scrollTop;
        const itemRight = itemLeft + itemRect.width;
        const itemBottom = itemTop + itemRect.height;

        const boxRight = left + width;
        const boxBottom = top + height;

        // Check intersection
        const intersects =
          left < itemRight &&
          boxRight > itemLeft &&
          top < itemBottom &&
          boxBottom > itemTop;

        const id = getItemId(item);
        if (id) {
          if (intersects) {
            newSelection.add(id);
          } else if (!initialSelection.current.has(id)) {
            newSelection.delete(id);
          }
        }
      });

      onSelectionChange(newSelection);
    },
    [isDragging, containerRef, itemSelector, getItemId, onSelectionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setSelectionBox(null);
    startPoint.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    selectionBox,
    handleMouseDown,
  };
}
