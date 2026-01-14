import { GraduationCap, Sparkles } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden gradient-hero py-20 lg:py-32">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Smart University Matching</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Find the Right University —{' '}
            <span className="text-primary">Made Just for You</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Tell us your percentage, budget, and dream field, and we'll guide you to universities where you truly belong.
          </p>
          
          {/* Trust points */}
          <p className="text-muted-foreground mb-8">
            No confusion. No endless searching.{' '}
            <span className="text-foreground font-medium">
              Just clear guidance, honest chances, and smart choices.
            </span>{' '}
            <GraduationCap className="inline w-5 h-5 text-primary" />
            <Sparkles className="inline w-4 h-4 text-secondary ml-1" />
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
