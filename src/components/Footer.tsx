import { GraduationCap, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-8 border-t border-border bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-bold text-foreground">UOK-Smart Assist</span>
          </div>
          
          {/* Tagline */}
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Smart decisions start with the right guidance.
            <Sparkles className="w-4 h-4 text-secondary" />
          </p>
          
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} UOK-Smart Assist. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
