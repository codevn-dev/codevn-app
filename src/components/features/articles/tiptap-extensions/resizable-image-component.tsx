import { NodeViewWrapper } from '@tiptap/react';
import { NodeViewProps } from '@tiptap/core';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ResizableBox } from 'react-resizable';
import { X, Move, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ResizableImageComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [_isResizing, setIsResizing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const { src, alt, title, width = 300, height = 200 } = node.attrs;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSelected(false);
        setShowControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setShowControls(true);
  };

  const handleResize = (
    e: React.SyntheticEvent,
    { size }: { size: { width: number; height: number } }
  ) => {
    setIsResizing(true);
    updateAttributes({
      width: size.width,
      height: size.height,
    });
  };

  const handleResizeStop = () => {
    setIsResizing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = imageRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !imageRef.current) return;

      e.preventDefault();
      const rect = imageRef.current.getBoundingClientRect();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      imageRef.current.style.transform = `translate(${newX - rect.left}px, ${newY - rect.top}px)`;
    },
    [isDragging, dragOffset.x, dragOffset.y]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDelete = () => {
    deleteNode();
  };

  const handleReset = () => {
    updateAttributes({
      width: 300,
      height: 200,
    });
  };

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`relative inline-block ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ width: 'fit-content' }}
    >
      <div className="relative">
        {isSelected && !isDragging ? (
          <ResizableBox
            width={width}
            height={height}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            minConstraints={[100, 100]}
            maxConstraints={[800, 600]}
            handle={
              <div className="absolute right-0 bottom-0 h-3 w-3 cursor-se-resize bg-blue-500" />
            }
          >
            <div ref={imageRef} className="relative h-full w-full" onMouseDown={handleMouseDown}>
              <img
                src={src}
                alt={alt || ''}
                title={title || ''}
                className="h-full w-full cursor-pointer object-cover select-none"
                onClick={handleImageClick}
                draggable={false}
              />
            </div>
          </ResizableBox>
        ) : (
          <div
            ref={imageRef}
            className="relative h-full w-full"
            onMouseDown={handleMouseDown}
            style={{ width, height }}
          >
            <img
              src={src}
              alt={alt || ''}
              title={title || ''}
              className="h-full w-full cursor-pointer object-cover select-none"
              onClick={handleImageClick}
              draggable={false}
            />
          </div>
        )}

        {/* Drag Handle */}
        {isSelected && (
          <div
            className="drag-handle absolute top-0 left-0 flex h-6 w-6 cursor-move items-center justify-center bg-blue-500"
            onMouseDown={handleMouseDown}
          >
            <Move className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Control Panel */}
        {showControls && isSelected && (
          <div className="absolute -top-12 left-0 z-10 flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-2 shadow-lg">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              title="Reset size"
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              title="Delete image"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
