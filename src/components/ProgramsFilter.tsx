import { useState, useMemo } from 'react';
import { Check, ChevronDown, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { CrawledUniversity } from '@/hooks/useCrawledUniversities';

interface ProgramsFilterProps {
  universities: CrawledUniversity[];
  selectedPrograms: string[];
  onProgramsChange: (programs: string[]) => void;
}

const ProgramsFilter = ({
  universities,
  selectedPrograms,
  onProgramsChange,
}: ProgramsFilterProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique programs from universities
  const allPrograms = useMemo(() => {
    const programsSet = new Set<string>();
    
    universities.forEach(uni => {
      const fields = uni.extracted_info?.fields;
      if (fields && Array.isArray(fields)) {
        fields.forEach(field => {
          if (field && typeof field === 'string') {
            // Normalize the program name (trim and title case)
            const normalized = field.trim();
            if (normalized) {
              programsSet.add(normalized);
            }
          }
        });
      }
    });
    
    // Sort alphabetically
    return Array.from(programsSet).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [universities]);

  // Filter programs by search query
  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return allPrograms;
    const query = searchQuery.toLowerCase();
    return allPrograms.filter(program => 
      program.toLowerCase().includes(query)
    );
  }, [allPrograms, searchQuery]);

  // Count universities per program
  const programCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    universities.forEach(uni => {
      const fields = uni.extracted_info?.fields;
      if (fields && Array.isArray(fields)) {
        fields.forEach(field => {
          const normalized = field?.trim();
          if (normalized) {
            counts[normalized] = (counts[normalized] || 0) + 1;
          }
        });
      }
    });
    
    return counts;
  }, [universities]);

  const toggleProgram = (program: string) => {
    if (selectedPrograms.includes(program)) {
      onProgramsChange(selectedPrograms.filter(p => p !== program));
    } else {
      onProgramsChange([...selectedPrograms, program]);
    }
  };

  const clearAll = () => {
    onProgramsChange([]);
    setSearchQuery('');
  };

  const selectAll = () => {
    onProgramsChange(filteredPrograms);
  };

  if (allPrograms.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[200px] justify-between"
              role="combobox"
              aria-expanded={open}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <span>
                  {selectedPrograms.length === 0
                    ? 'Filter by Programs'
                    : `${selectedPrograms.length} program${selectedPrograms.length > 1 ? 's' : ''} selected`}
                </span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <div className="p-3 border-b">
              <Input
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
            </div>
            
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
              <span className="text-xs text-muted-foreground">
                {filteredPrograms.length} programs available
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>

            <ScrollArea className="h-[280px]">
              <div className="p-2">
                {filteredPrograms.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No programs found
                  </div>
                ) : (
                  filteredPrograms.map((program) => {
                    const isSelected = selectedPrograms.includes(program);
                    const count = programCounts[program] || 0;
                    
                    return (
                      <button
                        key={program}
                        onClick={() => toggleProgram(program)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-input'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="truncate">{program}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                          {count}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Selected programs badges */}
        {selectedPrograms.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Show selected programs as badges */}
      {selectedPrograms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPrograms.slice(0, 5).map((program) => (
            <Badge
              key={program}
              variant="default"
              className="gap-1 cursor-pointer hover:bg-primary/80"
              onClick={() => toggleProgram(program)}
            >
              {program}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {selectedPrograms.length > 5 && (
            <Badge variant="outline">
              +{selectedPrograms.length - 5} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramsFilter;
