/**
 * Cinematic Selector Component
 * Displays a grid of cinematic variant thumbnails for selection
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CinematicThumbnail } from './CinematicThumbnail';
import { getAllVariants, getCinematicConfig, getRandomVariant } from '@/lib/cinematics/configs';
import type { CinematicVariant } from '@/lib/cinematics/types';
import { cn } from '@/lib/utils';

interface CinematicSelectorProps {
  selectedVariant?: CinematicVariant;
  onSelect: (variant: CinematicVariant) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
  className?: string;
}

export const CinematicSelector: React.FC<CinematicSelectorProps> = ({
  selectedVariant,
  onSelect,
  onConfirm,
  onCancel,
  showActions = true,
  className,
}) => {
  const [hoveredVariant, setHoveredVariant] = useState<CinematicVariant | null>(null);
  const variants = getAllVariants();

  const handleRandomize = () => {
    const newVariant = getRandomVariant();
    onSelect(newVariant);
  };

  const displayedVariant = hoveredVariant || selectedVariant;
  const displayedConfig = displayedVariant ? getCinematicConfig(displayedVariant) : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with title and randomize button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Select Cinematic
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a breakthrough reveal animation
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRandomize}
          className="gap-2"
        >
          <Shuffle className="w-4 h-4" />
          Random
        </Button>
      </div>

      {/* Thumbnails grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {variants.map((variant) => {
          const config = getCinematicConfig(variant);
          return (
            <motion.div
              key={variant}
              onHoverStart={() => setHoveredVariant(variant)}
              onHoverEnd={() => setHoveredVariant(null)}
            >
              <CinematicThumbnail
                variant={variant}
                displayName={config.displayName}
                duration={config.duration}
                isSelected={selectedVariant === variant}
                onClick={() => onSelect(variant)}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Preview info */}
      <AnimatePresence mode="wait">
        {displayedConfig && (
          <motion.div
            key={displayedVariant}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-muted/50 border border-border/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">
                  {displayedConfig.displayName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Duration: {(displayedConfig.duration / 1000).toFixed(1)}s •{' '}
                  {displayedConfig.particles?.count || 0} particles •{' '}
                  {displayedConfig.effects.length} effects
                </p>
              </div>
              {selectedVariant === displayedVariant && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" />
                  Selected
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          {onConfirm && (
            <Button
              onClick={onConfirm}
              disabled={!selectedVariant}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Selection
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CinematicSelector;
