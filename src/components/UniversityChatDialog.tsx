import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Sparkles, GraduationCap, BookOpen, DollarSign, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrawledUniversity } from '@/hooks/useCrawledUniversities';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UniversityChatDialogProps {
  university: CrawledUniversity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_QUESTIONS = [
  { icon: GraduationCap, label: 'Admission Requirements', question: 'What are the admission requirements for this university?' },
  { icon: BookOpen, label: 'Programs Offered', question: 'What programs and courses does this university offer?' },
  { icon: DollarSign, label: 'Fees & Scholarships', question: 'What are the tuition fees and are there any scholarships available?' },
  { icon: HelpCircle, label: 'How to Apply', question: 'How do I apply to this university and what is the application process?' },
];

const UniversityChatDialog: React.FC<UniversityChatDialogProps> = ({
  university,
  open,
  onOpenChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset messages when university changes
  useEffect(() => {
    if (university) {
      setMessages([
        {
          role: 'assistant',
          content: `👋 Hello! I'm your dedicated advisor for **${university.university_name}**.\n\nI have access to comprehensive information about this university including admissions, programs, fees, campus facilities, and more.\n\nHow can I help you today?`,
        },
      ]);
    }
  }, [university?.university_id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async (messageText?: string) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || !university || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('university-chat', {
        body: {
          universityId: university.university_id,
          message: userMessage,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      if (data?.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      } else if (data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `I apologize, but I encountered an issue: ${data.error}. Please try again.` },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again in a moment.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return `<li class="ml-4">${line.substring(2)}</li>`;
        }
        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          return `<li class="ml-4">${line.substring(line.indexOf(' ') + 1)}</li>`;
        }
        return line ? `<p>${line}</p>` : '<br/>';
      })
      .join('');
  };

  if (!university) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <DialogTitle className="flex items-center gap-3">
            {university.logo_url ? (
              <img
                src={university.logo_url}
                alt={university.university_name}
                className="w-10 h-10 rounded-lg object-contain bg-white p-1 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-base font-semibold">{university.university_name}</span>
              <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI-Powered University Advisor
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Chat with an AI assistant about admissions, programs, fees, and campus life for {university.university_name}.
          </DialogDescription>
        </DialogHeader>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/70 rounded-bl-md'
                  }`}
                >
                  <div 
                    className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted/70 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Questions - Show only when there's just the welcome message */}
        {messages.length === 1 && !isLoading && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors py-1.5 px-3"
                  onClick={() => sendMessage(q.question)}
                >
                  <q.icon className="w-3 h-3 mr-1.5" />
                  {q.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about admissions, programs, fees, campus life..."
              disabled={isLoading}
              className="flex-1 rounded-full px-4"
            />
            <Button 
              onClick={() => sendMessage()} 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="rounded-full w-10 h-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI responses are based on available university data. Verify important details with the university directly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UniversityChatDialog;
