import { motion } from "framer-motion";

interface EntityCounterProps {
    count: number;
}

export const EntityCounter: React.FC<EntityCounterProps> = ({ count }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2 
                 bg-purple-900/30 backdrop-blur-md border border-purple-500/20 
                 rounded-full shadow-lg shadow-purple-900/10 pointer-events-none"
        >
            <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </div>
            <span className="text-sm font-medium text-purple-200">
                {count} {count === 1 ? 'entity' : 'entities'}
            </span>
        </motion.div>
    );
};
