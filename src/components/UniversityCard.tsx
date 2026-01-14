import { Heart, Eye, GitCompare, MapPin, Trophy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversityMatch, ChanceLevel } from '@/types/university';

interface UniversityCardProps {
  university: UniversityMatch;
  onSave?: (id: string) => void;
  onCompare?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  isSaved?: boolean;
}

const chanceConfig: Record<ChanceLevel, { label: string; className: string; icon: string }> = {
  high: {
    label: 'High Chance',
    className: 'bg-[hsl(var(--chance-high))]/10 text-[hsl(var(--chance-high))] border-[hsl(var(--chance-high))]/30',
    icon: '🟢'
  },
  moderate: {
    label: 'Moderate Chance',
    className: 'bg-[hsl(var(--chance-moderate))]/10 text-[hsl(var(--chance-moderate))] border-[hsl(var(--chance-moderate))]/30',
    icon: '🟡'
  },
  low: {
    label: 'Low Chance',
    className: 'bg-[hsl(var(--chance-low))]/10 text-[hsl(var(--chance-low))] border-[hsl(var(--chance-low))]/30',
    icon: '🔴'
  }
};

const UniversityCard = ({ 
  university, 
  onSave, 
  onCompare, 
  onViewDetails,
  isSaved = false 
}: UniversityCardProps) => {
  const chance = chanceConfig[university.chance];

  return (
    <div className="bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-border overflow-hidden group">
      {/* Header with logo and chance badge */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl">
              {university.logo}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {university.name}
              </h3>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-3 h-3" />
                {university.location}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`${chance.className} border`}>
            {chance.icon} {chance.label}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {university.ranking && (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-secondary" />
              <span>Rank #{university.ranking}</span>
            </div>
          )}
          <Badge variant="secondary" className="text-xs">
            {university.type === 'public' ? 'Public' : 'Private'}
          </Badge>
          <span>Up to PKR {university.maxFee.toLocaleString()}/year</span>
        </div>

        {/* Why this university */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Why this university?
          </p>
          <div className="space-y-1">
            {university.matchReasons.map((reason, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {reason}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mt-4">
          {university.features.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => onViewDetails?.(university.id)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCompare?.(university.id)}
        >
          <GitCompare className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSave?.(university.id)}
          className={isSaved ? 'text-destructive border-destructive/30' : ''}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </div>
  );
};

export default UniversityCard;
