import {
  Eye,
  MapPin,
  GraduationCap,
  DollarSign,
  Award,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrawledUniversity } from "@/hooks/useCrawledUniversities";
import { useState } from "react";

interface CrawledUniversityCardProps {
  university: CrawledUniversity;
  onViewDetails?: (universityId: string) => void;
}

const CrawledUniversityCard = ({
  university,
  onViewDetails,
}: CrawledUniversityCardProps) => {
  const info = university.extracted_info;
  const [showAllFields, setShowAllFields] = useState(false);

  // Generate initials from university name
  const initials = university.university_name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-border overflow-hidden group">
      {/* Header with logo and info */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Logo or initials */}
            {university.logo_url ? (
              <img
                src={university.logo_url}
                alt={`${university.university_name} logo`}
                className="w-16 h-16 rounded-xl object-contain bg-white p-1 border"
                onError={(e) => {
                  // Fallback to initials if logo fails to load
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden"
                  );
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary ${
                university.logo_url ? "hidden" : ""
              }`}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors  line-clamp-1  ">
                {info?.name || university.university_name}
              </h3>
              {info?.location && (
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{info.location}</span>
                </div>
              )}
              {info?.type && (
                <Badge variant="outline" className="mt-1 text-xs capitalize">
                  {info.type}
                </Badge>
              )}
            </div>
          </div>
          {info?.ranking && (
            <Badge
              variant="default"
              className="bg-primary/10 text-primary border-primary/30 border flex-shrink-0"
            >
              <Award className="w-3 h-3 mr-1" />#{info.ranking}
            </Badge>
          )}
        </div>

        {/* Description */}
        {info?.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {info.description}
          </p>
        )}

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Closing Percentage */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              Min. Percentage
            </div>
            <div className="font-semibold text-sm text-foreground">
              {info?.closing_percentage
                ? `${info.closing_percentage}%`
                : info?.admission_requirements?.min_percentage
                ? `${info.admission_requirements.min_percentage}%`
                : "---"}
            </div>
          </div>
        </div>

        {/* Fields of Study */}
        {info?.fields && info.fields.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <GraduationCap className="w-3 h-3" />
              Programs Offered
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(showAllFields ? info.fields : info.fields.slice(0, 4)).map(
                (field, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                )
              )}

              {info.fields.length > 4 && (
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer"
                  onClick={() => setShowAllFields(!showAllFields)}
                >
                  {showAllFields
                    ? "Show less"
                    : `+${info.fields.length - 4} more`}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        {info?.features && info.features.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="space-y-1">
              {info.features.slice(0, 3).map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span className="text-primary text-xs">✓</span>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback for universities without extracted info */}
        {!info && (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {university.pages_count} pages indexed • Data extraction pending
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center gap-2">
        {university.website_url && (
          <a
            href={university.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => onViewDetails?.(university.university_id)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details & Chat
        </Button>
      </div>
    </div>
  );
};

export default CrawledUniversityCard;
