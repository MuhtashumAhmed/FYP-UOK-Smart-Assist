import { Shield, Lock, Database } from 'lucide-react';

const TrustBadge = () => {
  return (
    <section className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <Lock className="w-5 h-5 text-primary" />
            <Database className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">
            Your data is safe with us
          </h3>
          <p className="text-sm text-muted-foreground">
            We use secure, encrypted storage. Your academic details are never shared without your consent.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TrustBadge;
