import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import CrawledUniversityCard from '@/components/CrawledUniversityCard';
import TrustBadge from '@/components/TrustBadge';
import EmptyState from '@/components/EmptyState';
import UniversityChatDialog from '@/components/UniversityChatDialog';
import ProgramsFilter from '@/components/ProgramsFilter';
import { useCrawledUniversities, CrawledUniversity } from '@/hooks/useCrawledUniversities';
import { Loader2, GraduationCap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Index = () => {
  const { universities, loading, error } = useCrawledUniversities();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<CrawledUniversity | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Filter universities by search query AND selected programs
  const filteredUniversities = useMemo(() => {
    return universities.filter(uni => {
      // Search filter
      const matchesSearch = uni.university_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Programs filter - if no programs selected, show all
      if (selectedPrograms.length === 0) {
        return matchesSearch;
      }
      
      // Check if university has any of the selected programs
      const uniFields = uni.extracted_info?.fields || [];
      const hasSelectedProgram = selectedPrograms.some(program =>
        uniFields.some(field => 
          field?.toLowerCase().trim() === program.toLowerCase().trim()
        )
      );
      
      return matchesSearch && hasSelectedProgram;
    });
  }, [universities, searchQuery, selectedPrograms]);

  const handleViewDetails = (universityId: string) => {
    const uni = universities.find(u => u.university_id === universityId);
    if (uni) {
      setSelectedUniversity(uni);
      setChatOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Universities Section */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="mb-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      Available Universities
                    </h2>
                    <p className="text-muted-foreground">
                      Explore universities with detailed information and AI-powered assistance
                    </p>
                  </div>

                  {/* Search */}
                  {universities.length > 0 && (
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search universities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </div>

                {/* Programs Filter */}
                {universities.length > 0 && (
                  <ProgramsFilter
                    universities={universities}
                    selectedPrograms={selectedPrograms}
                    onProgramsChange={setSelectedPrograms}
                  />
                )}
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading universities...</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-16">
                <p className="text-destructive mb-2">Failed to load universities</p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && universities.length === 0 && (
              <EmptyState />
            )}

            {/* No results from search/filter */}
            {!loading && !error && universities.length > 0 && filteredUniversities.length === 0 && (
              <div className="text-center py-16">
                <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No universities found matching your criteria
                </p>
                {(searchQuery || selectedPrograms.length > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedPrograms([]);
                    }}
                    className="mt-2 text-primary hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Stats bar */}
            {!loading && !error && filteredUniversities.length > 0 && (
              <div className="flex items-center gap-4 mb-6 text-sm">
                <span className="text-muted-foreground">
                  Showing{' '}
                  <span className="font-semibold text-foreground">{filteredUniversities.length}</span>{' '}
                  {filteredUniversities.length === 1 ? 'university' : 'universities'}
                  {selectedPrograms.length > 0 && (
                    <> offering <span className="font-semibold text-foreground">{selectedPrograms.length}</span> selected program{selectedPrograms.length > 1 ? 's' : ''}</>
                  )}
                </span>
              </div>
            )}

            {/* Universities grid */}
            {!loading && !error && filteredUniversities.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUniversities.map((university) => (
                  <CrawledUniversityCard
                    key={university.id}
                    university={university}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <TrustBadge />
      </main>
      <Footer />

      {/* University Chat Dialog */}
      <UniversityChatDialog
        university={selectedUniversity}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </div>
  );
};

export default Index;
