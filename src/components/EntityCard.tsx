/**
 * EntityCard - Phase 4 Cinematic Polish
 * 
 * 2D representation of an entity in the chat interface.
 * Uses matching layoutId with EntityOrbWithLayoutId for smooth morphing.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entity } from "@/lib/types";

interface EntityCardProps {
  entity: Entity;
  isSelected?: boolean;
  onClick?: (entity: Entity) => void;
  onDismiss?: (entity: Entity) => void;
  className?: string;
}

const entityColors: Record<string, { bg: string; border: string; text: string }> = {
  problem: { 
    bg: "bg-red-500/10", 
    border: "border-red-500/30", 
    text: "text-red-400" 
  },
  emotion: { 
    bg: "bg-purple-500/10", 
    border: "border-purple-500/30", 
    text: "text-purple-400" 
  },
  value: { 
    bg: "bg-emerald-500/10", 
    border: "border-emerald-500/30", 
    text: "text-emerald-400" 
  },
  action: { 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/30", 
    text: "text-blue-400" 
  },
  friction: { 
    bg: "bg-orange-500/10", 
    border: "border-orange-500/30", 
    text: "text-orange-400" 
  },
  grease: { 
    bg: "bg-green-500/10", 
    border: "border-green-500/30", 
    text: "text-green-400" 
  },
};

const entityIcons: Record<string, string> = {
  problem: "⚠️",
  emotion: "💭",
  value: "✨",
  action: "🎯",
  friction: "⚙️",
  grease: "💧",
};

export function EntityCard({
  entity,
  isSelected = false,
  onClick,
  onDismiss,
  className,
}: EntityCardProps) {
  const colors = entityColors[entity.type] || entityColors.problem;
  const icon = entityIcons[entity.type] || "●";

  // Truncate long labels on mobile
  const truncatedLabel = entity.label.length > 24
    ? entity.label.slice(0, 22) + "…"
    : entity.label;

  return (
    <motion.div
      layoutId={`entity-${entity.id}`}
      className={cn(
        "relative px-2 py-1.5 rounded-lg border cursor-pointer inline-flex items-center gap-1",
        "transition-all duration-200",
        colors.bg,
        colors.border,
        isSelected && "ring-1 ring-offset-1 ring-offset-background",
        isSelected && colors.text.replace("text-", "ring-"),
        className
      )}
      onClick={() => onClick?.(entity)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      {/* Icon */}
      <span className="text-xs" aria-hidden="true">
        {icon}
      </span>

      {/* Label - compact */}
      <span className={cn("text-xs font-medium leading-tight", colors.text)}>
        {truncatedLabel}
      </span>

      {/* Type Badge - compact */}
      <span className={cn(
        "text-[10px] opacity-50 uppercase",
        colors.text
      )}>
        {entity.type}
      </span>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(entity);
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
          aria-label={`Dismiss ${entity.label}`}
        >
          <X className="h-3 w-3 opacity-50 hover:opacity-100" />
        </button>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          className={cn(
            "absolute -inset-px rounded-lg border-2",
            colors.border.replace("/30", "/60")
          )}
          layoutId={`entity-selection-${entity.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
}

/**
 * EntityCardList - Displays a collapsible list of entity cards with dismiss support
 */
export function EntityCardList({
  entities,
  selectedId,
  onEntityClick,
  onDismissEntity,
  onClearAll,
  className,
}: {
  entities: Entity[];
  selectedId?: string;
  onEntityClick?: (entity: Entity) => void;
  onDismissEntity?: (entity: Entity) => void;
  onClearAll?: () => void;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (entities.length === 0) return null;

  return (
    <div className={cn("p-2", className)}>
      {/* Header row with collapse toggle and clear all */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
        >
          {collapsed ? `▶ ${entities.length} entities` : `▼ ${entities.length} entities`}
        </button>
        {!collapsed && onClearAll && entities.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Entity cards */}
      <AnimatePresence mode="popLayout">
        {!collapsed && entities.map((entity) => (
          <motion.div
            key={entity.id}
            layout
            className="inline-block mr-1.5 mb-1.5"
          >
            <EntityCard
              entity={entity}
              isSelected={entity.id === selectedId}
              onClick={onEntityClick}
              onDismiss={onDismissEntity}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
