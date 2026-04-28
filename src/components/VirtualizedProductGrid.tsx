import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedProductGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  /**
   * Estimated row height in px. Cards are roughly square + meta — ~360px works for most viewports.
   * The virtualizer measures the real row after first render, so this only affects the initial scrollbar size.
   */
  estimateRowHeight?: number;
  /**
   * Render rows even when the viewport is well above/below them, to avoid blank flashes on fast scroll.
   */
  overscanRows?: number;
}

/**
 * A responsive virtualized grid that uses the window scroll (no extra scroll container).
 * Falls back to a plain CSS grid for small lists where virtualization adds no value.
 *
 * Breakpoints follow the project's existing product grid: 2 / 3 / 4 / 5 columns.
 */
export function VirtualizedProductGrid<T>({
  items,
  renderItem,
  getKey,
  estimateRowHeight = 360,
  overscanRows = 4,
}: VirtualizedProductGridProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(2);

  // Determine columns from viewport — Tailwind's sm/md/lg breakpoints
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 1024) setColumns(5);
      else if (w >= 768) setColumns(4);
      else if (w >= 640) setColumns(3);
      else setColumns(2);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const rowCount = Math.ceil(items.length / columns);

  // Track the grid's offset from the top of the document so the window virtualizer
  // measures rows starting from where the grid actually begins.
  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimateRowHeight,
    overscan: overscanRows,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  // Below this threshold, the cost of measuring rows is greater than just rendering everything.
  const SMALL_LIST_THRESHOLD = 60;
  const useFallback = items.length <= SMALL_LIST_THRESHOLD;

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4";

  if (useFallback) {
    return (
      <div className={gridClass}>
        {items.map((item) => (
          <div key={getKey(item)}>{renderItem(item)}</div>
        ))}
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const scrollMargin = rowVirtualizer.options.scrollMargin;

  return (
    <div ref={parentRef} style={{ position: "relative", height: totalSize, width: "100%" }}>
      {virtualItems.map((virtualRow) => {
        const rowStart = virtualRow.index * columns;
        const rowItems = items.slice(rowStart, rowStart + columns);
        return (
          <div
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            <div className={gridClass}>
              {rowItems.map((item) => (
                <div key={getKey(item)}>{renderItem(item)}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
