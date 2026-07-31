import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface FeatureGridProps {
  items: FeatureCard[];
  cols?: number;
}

export const FeatureGrid = ({ items, cols = 3 }: FeatureGridProps) => {
  const colMap: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };
  const colClass = colMap[cols] || 'md:grid-cols-3';
  return (
    <div className={`grid ${colClass} gap-6`}>
      {items.map((item) => (
        <motion.div 
          key={item.title}
          className="p-6 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm"
          whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary)/0.4)" }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <item.icon className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
          <p className="text-muted-foreground text-sm">{item.desc}</p>
        </motion.div>
      ))}
    </div>
  );
};
