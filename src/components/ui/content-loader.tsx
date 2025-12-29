import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface ContentLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  skeleton?: "card" | "list" | "text" | "custom";
  customSkeleton?: React.ReactNode;
  className?: string;
  minHeight?: string;
}

function CardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TextSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

export function ContentLoader({
  loading,
  children,
  skeleton = "card",
  customSkeleton,
  className,
  minHeight = "100px",
}: ContentLoaderProps) {
  const skeletonContent = customSkeleton || {
    card: <CardSkeleton />,
    list: <ListSkeleton />,
    text: <TextSkeleton />,
    custom: null,
  }[skeleton];

  return (
    <div className={cn("relative", className)} style={{ minHeight }}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {skeletonContent}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface InlineLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  text?: string;
}

export function InlineLoader({ loading, children, text = "Loading..." }: InlineLoaderProps) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <LoadingSpinner size="sm" />
        <span className="text-sm">{text}</span>
      </span>
    );
  }
  return <>{children}</>;
}
