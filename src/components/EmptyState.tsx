import { Search, ArrowLeft, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Don't worry — your journey doesn't end here
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Try adjusting your budget or field, or explore alternative programs
          that still align with your goals.
        </p>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Lightbulb className="w-4 h-4 text-secondary" />
            Quick tips:
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6">
            <li>• Try increasing your budget slightly</li>
            <li>• Consider related fields of study</li>
            <li>• Look at universities in different cities</li>
          </ul>
        </div>

        {/* Action button */}
        <Button
          onClick={() => navigate('/')}
          variant="default"
          size="lg"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Adjust My Search
        </Button>
      </div>
    </div>
  );
};

export default EmptyState;
