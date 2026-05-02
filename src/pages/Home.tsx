import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useResearch } from '@/context/ResearchContext';
import { motion } from 'framer-motion';
import { z } from 'zod';

const MAX_QUERY_LENGTH = 500;
const querySchema = z.string().trim().min(1).max(MAX_QUERY_LENGTH);

function sanitizeQuery(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
}

const Home = () => {
  const [query, setQuery] = useState('');
  const { startResearch } = useResearch();
  const navigate = useNavigate();

  const trimmed = query.trim();
  const validation = querySchema.safeParse(trimmed);
  const isValid = validation.success;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    startResearch(sanitizeQuery(trimmed));
    navigate('/session');
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl space-y-8 text-center"
      >
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            AI Research Assistant
          </h1>
          <p className="text-lg text-muted-foreground">
            Multi-agent research powered by AI. Enter a topic and watch Researcher, Analyst, and Writer collaborate in real-time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to research?"
              className="pl-10 h-12 text-base"
              maxLength={MAX_QUERY_LENGTH}
              autoFocus
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-6" disabled={!isValid}>
            Start Research
          </Button>
        </form>

        {trimmed.length > MAX_QUERY_LENGTH * 0.8 && (
          <p className={`text-xs ${trimmed.length >= MAX_QUERY_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
            {trimmed.length}/{MAX_QUERY_LENGTH} characters
          </p>
        )}

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">🔍 Researcher</span>
          <span className="text-border">→</span>
          <span className="flex items-center gap-1.5">🧠 Analyst</span>
          <span className="text-border">→</span>
          <span className="flex items-center gap-1.5">✍️ Writer</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
