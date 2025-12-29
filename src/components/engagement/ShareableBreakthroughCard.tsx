import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Share2, 
  Download, 
  Twitter, 
  Linkedin,
  Copy,
  Check,
  X,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Breakthrough } from "@/lib/types";
import aspiralLogo from "@/assets/aspiral-logo.png";

interface ShareableBreakthroughCardProps {
  breakthrough: Breakthrough;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (platform: string) => void;
}

export function ShareableBreakthroughCard({
  breakthrough,
  isOpen,
  onClose,
  onShare,
}: ShareableBreakthroughCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const shareText = `✨ Breakthrough Achieved!\n\n⚡ ${breakthrough.friction}\n💧 ${breakthrough.grease}\n💡 "${breakthrough.insight}"\n\n🌀 Got clarity in minutes with aspiral.icu`;

  const shareUrl = "https://aspiral.icu";

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      onShare?.("copy");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    
    setIsDownloading(true);
    try {
      // Using html2canvas dynamically
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `aspiral-breakthrough-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Image downloaded!");
      onShare?.("download");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
    onShare?.("twitter");
    toast.success("Opening Twitter...");
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
    onShare?.("linkedin");
    toast.success("Opening LinkedIn...");
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
    window.open(url, "_blank");
    onShare?.("whatsapp");
    toast.success("Opening WhatsApp...");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Breakthrough - aSpiral",
          text: shareText,
          url: shareUrl,
        });
        onShare?.("native");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Breakthrough
          </DialogTitle>
        </DialogHeader>

        {/* Shareable Card Preview */}
        <div 
          ref={cardRef}
          className="relative p-6 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(271 45% 15%) 0%, hsl(280 50% 20%) 50%, hsl(50 40% 25%) 100%)",
          }}
        >
          {/* Background pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 20%, hsl(280 85% 65% / 0.3) 0%, transparent 50%),
                               radial-gradient(circle at 80% 80%, hsl(50 95% 55% / 0.3) 0%, transparent 50%)`,
            }}
          />
          
          <div className="relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Breakthrough Achieved
              </span>
              <img src={aspiralLogo} alt="aSpiral" className="h-6 w-auto opacity-80" />
            </div>

            {/* Friction */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Friction</p>
                <p className="text-foreground font-medium">{breakthrough.friction}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-destructive/50 to-success/50" />
            </div>

            {/* Grease */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">💧</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Grease</p>
                <p className="text-foreground font-medium">{breakthrough.grease}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-success/50 to-secondary/50" />
            </div>

            {/* Insight */}
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <p className="text-xs text-secondary uppercase tracking-wider mb-2">💡 Insight</p>
              <p className="text-foreground font-question text-lg italic">
                "{breakthrough.insight}"
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-xs text-muted-foreground">
                aspiral.icu
              </span>
              <span className="text-xs text-muted-foreground">
                🌀 From Spiraling to Aspiring
              </span>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShareTwitter}
            >
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShareLinkedIn}
            >
              <Linkedin className="w-4 h-4 mr-2" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShareWhatsApp}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCopyText}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-success" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Text"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownloadImage}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Saving..." : "Save Image"}
            </Button>
            {navigator.share && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={handleNativeShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
