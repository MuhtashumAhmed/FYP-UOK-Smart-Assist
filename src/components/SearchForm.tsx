import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Percent, Wallet, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fieldOptions } from '@/data/universities';

const SearchForm = () => {
  const navigate = useNavigate();
  const [percentage, setPercentage] = useState('');
  const [budget, setBudget] = useState('');
  const [field, setField] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!percentage || !budget || !field) return;
    
    const params = new URLSearchParams({
      percentage,
      budget,
      field
    });
    
    // Stay on same page but update URL params to trigger search
    navigate(`/?${params.toString()}`);
  };

  const isFormValid = percentage && budget && field;

  return (
    <section className="py-12 lg:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-primary mb-2">
              <Search className="w-5 h-5" />
              <span className="font-medium">University Finder</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Let's find universities that match you
            </h2>
            <p className="text-muted-foreground">
              Enter your academic score, preferred field, and budget — we'll handle the rest.
            </p>
          </div>

          {/* Search form card */}
          <form onSubmit={handleSubmit}>
            <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 border border-border">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Percentage input */}
                <div className="space-y-2">
                  <Label htmlFor="percentage" className="flex items-center gap-2 text-foreground">
                    <Percent className="w-4 h-4 text-primary" />
                    Your Academic Percentage
                  </Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g., 85"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="h-12 text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps us calculate your admission chances accurately.
                  </p>
                </div>

                {/* Budget input */}
                <div className="space-y-2">
                  <Label htmlFor="budget" className="flex items-center gap-2 text-foreground">
                    <Wallet className="w-4 h-4 text-secondary" />
                    Yearly Budget (PKR)
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    placeholder="e.g., 500000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-12 text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll show options that fit your finances — no surprises later.
                  </p>
                </div>

                {/* Field selection */}
                <div className="space-y-2">
                  <Label htmlFor="field" className="flex items-center gap-2 text-foreground">
                    <BookOpen className="w-4 h-4 text-accent" />
                    Field of Study
                  </Label>
                  <Select value={field} onValueChange={setField}>
                    <SelectTrigger id="field" className="h-12 text-lg">
                      <SelectValue placeholder="Select your field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the field you're passionate about.
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <div className="mt-8 flex flex-col items-center">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!isFormValid}
                  className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 gap-2 w-full md:w-auto"
                >
                  Find My University
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  We match you only with universities where you meet the criteria.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SearchForm;
