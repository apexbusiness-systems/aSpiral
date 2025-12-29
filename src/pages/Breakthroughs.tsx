import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Filter,
  Share2,
  Sparkles,
  TrendingUp,
  Zap,
  Heart,
  Briefcase,
  Brain,
  Lightbulb,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEngagementStore } from "@/stores/engagementStore";
import { ShareableBreakthroughCard } from "@/components/engagement/ShareableBreakthroughCard";
import { StreakBadge } from "@/components/engagement/StreakBadge";
import type { Breakthrough, BreakthroughCategory } from "@/lib/types";
import aspiralLogo from "@/assets/aspiral-logo.png";

const categoryConfig: Record<BreakthroughCategory, { icon: React.ReactNode; label: string; color: string }> = {
  career: { icon: <Briefcase className="w-4 h-4" />, label: "Career", color: "text-blue-400" },
  relationship: { icon: <Heart className="w-4 h-4" />, label: "Relationship", color: "text-pink-400" },
  financial: { icon: <TrendingUp className="w-4 h-4" />, label: "Financial", color: "text-green-400" },
  creative: { icon: <Lightbulb className="w-4 h-4" />, label: "Creative", color: "text-yellow-400" },
  anxiety: { icon: <Brain className="w-4 h-4" />, label: "Anxiety", color: "text-purple-400" },
  life_direction: { icon: <Sparkles className="w-4 h-4" />, label: "Life Direction", color: "text-secondary" },
  health: { icon: <Zap className="w-4 h-4" />, label: "Health", color: "text-emerald-400" },
  other: { icon: <Sparkles className="w-4 h-4" />, label: "Other", color: "text-muted-foreground" },
};

export default function Breakthroughs() {
  const { breakthroughs, streak } = useEngagementStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BreakthroughCategory | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [shareModalBreakthrough, setShareModalBreakthrough] = useState<Breakthrough | null>(null);

  // Filter and sort breakthroughs
  const filteredBreakthroughs = useMemo(() => {
    let result = [...breakthroughs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.friction.toLowerCase().includes(query) ||
          b.grease.toLowerCase().includes(query) ||
          b.insight.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((b) => b.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [breakthroughs, searchQuery, selectedCategory, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const categories: Record<string, number> = {};
    breakthroughs.forEach((b) => {
      if (b.category) {
        categories[b.category] = (categories[b.category] || 0) + 1;
      }
    });

    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    return {
      total: breakthroughs.length,
      shared: breakthroughs.filter((b) => b.sharedAt).length,
      topCategory: topCategory ? topCategory[0] as BreakthroughCategory : null,
    };
  }, [breakthroughs]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen app-container">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <img src={aspiralLogo} alt="aSpiral" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <StreakBadge showLabel size="md" />
              <Link to="/app">
                <Button variant="secondary" size="sm">
                  New Session
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Title & Stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Your Breakthroughs
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-secondary" />
              {stats.total} total breakthroughs
            </span>
            {stats.topCategory && (
              <span className="flex items-center gap-1">
                {categoryConfig[stats.topCategory].icon}
                Most: {categoryConfig[stats.topCategory].label}
              </span>
            )}
            {streak && streak.currentStreak > 0 && (
              <span className="flex items-center gap-1">
                🔥 {streak.longestStreak} day best streak
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search breakthroughs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {selectedCategory === "all" ? "All Categories" : categoryConfig[selectedCategory].label}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                All Categories
              </DropdownMenuItem>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <DropdownMenuItem 
                  key={key} 
                  onClick={() => setSelectedCategory(key as BreakthroughCategory)}
                  className={config.color}
                >
                  {config.icon}
                  <span className="ml-2">{config.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {sortOrder === "newest" ? "Newest First" : "Oldest First"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                Oldest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Breakthroughs List */}
        {filteredBreakthroughs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {breakthroughs.length === 0 ? "No breakthroughs yet" : "No matches found"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {breakthroughs.length === 0
                ? "Start a session to achieve your first breakthrough!"
                : "Try adjusting your search or filters"}
            </p>
            <Link to="/app">
              <Button variant="secondary">Start a Session</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredBreakthroughs.map((breakthrough, index) => (
                <motion.div
                  key={breakthrough.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {breakthrough.category && (
                            <span className={`flex items-center gap-1 text-sm ${categoryConfig[breakthrough.category].color}`}>
                              {categoryConfig[breakthrough.category].icon}
                              {categoryConfig[breakthrough.category].label}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(breakthrough.createdAt)}
                          </span>
                        </div>
                        {breakthrough.sharedAt && (
                          <span className="text-xs text-success flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            Shared
                          </span>
                        )}
                      </div>

                      {/* Friction & Grease */}
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-start gap-2">
                          <span className="text-destructive">⚡</span>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Friction</p>
                            <p className="text-foreground">{breakthrough.friction}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-success">💧</span>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Grease</p>
                            <p className="text-foreground">{breakthrough.grease}</p>
                          </div>
                        </div>
                      </div>

                      {/* Insight */}
                      <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
                        <p className="font-question text-lg italic text-foreground">
                          "{breakthrough.insight}"
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShareModalBreakthrough(breakthrough)}
                        className="flex-1 lg:flex-none"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Share Modal */}
      {shareModalBreakthrough && (
        <ShareableBreakthroughCard
          breakthrough={shareModalBreakthrough}
          isOpen={!!shareModalBreakthrough}
          onClose={() => setShareModalBreakthrough(null)}
        />
      )}
    </div>
  );
}
