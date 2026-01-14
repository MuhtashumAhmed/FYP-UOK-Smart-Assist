import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Clean HTML to plain text
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Extract keywords from user message for hybrid search
function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "what",
    "which",
    "who",
    "whom",
    "this",
    "that",
    "these",
    "those",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "her",
    "hers",
    "herself",
    "it",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves",
    "and",
    "but",
    "or",
    "nor",
    "for",
    "yet",
    "so",
    "as",
    "at",
    "by",
    "from",
    "in",
    "into",
    "of",
    "off",
    "on",
    "onto",
    "out",
    "over",
    "to",
    "up",
    "with",
    "about",
    "after",
    "against",
    "before",
    "between",
    "during",
    "through",
    "how",
    "when",
    "where",
    "why",
    "all",
    "each",
    "every",
    "both",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "only",
    "own",
    "same",
    "than",
    "too",
    "very",
    "just",
    "also",
    "now",
    "here",
    "there",
    "then",
    "university",
    "college",
    "please",
    "tell",
    "want",
    "know",
    "give",
    "get",
    "find",
    "looking",
    "information",
    "details",
    "apply",
    "application",
  ]);

  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  // Deduplicate and prioritize longer/more specific terms
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 8);
}

// Score relevance of content to keywords
function scoreContent(content: string, keywords: string[]): number {
  const lowerContent = content.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    const matches = lowerContent.match(regex);
    if (matches) {
      score += matches.length * (kw.length > 4 ? 2 : 1); // Longer keywords = more weight
    }
  }
  return score;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      console.error(`[${requestId}] Invalid JSON body`);
      return jsonResponse({ success: false, error: "Invalid request body" });
    }

    const { universityId, message, conversationHistory = [] } = payload;

    console.log(`[${requestId}] Chat request for university: ${universityId}, message length: ${message?.length}`);

    if (!universityId || !message) {
      return jsonResponse({ success: false, error: "universityId and message are required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error(`[${requestId}] Missing Supabase config`);
      return jsonResponse({ success: false, error: "Server configuration error" });
    }

    if (!OPENAI_API_KEY) {
      console.error(`[${requestId}] Missing OpenAI API key`);
      return jsonResponse({ success: false, error: "OpenAI API key not configured" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ===== STEP 1: Fetch university info =====
    let uniData: any = null;

    // Try by university_id first
    const { data: byUniversityId } = await supabase
      .from("university_crawls")
      .select("id, university_id, university_name, extracted_info, website_url, last_crawl")
      .eq("university_id", universityId)
      .order("last_crawl", { ascending: false })
      .limit(1);

    if (byUniversityId?.length) {
      uniData = byUniversityId[0];
    } else {
      // Fallback: try by primary id
      const { data: byId } = await supabase
        .from("university_crawls")
        .select("id, university_id, university_name, extracted_info, website_url, last_crawl")
        .eq("id", universityId)
        .limit(1);

      if (byId?.length) uniData = byId[0];
    }

    if (!uniData) {
      console.error(`[${requestId}] University not found: ${universityId}`);
      return jsonResponse({ success: false, error: "University not found" });
    }

    const matchUniversityId = uniData.university_id;
    console.log(`[${requestId}] Found university: ${uniData.university_name} (${matchUniversityId})`);

    // ===== STEP 2: Extract keywords for hybrid search =====
    const keywords = extractKeywords(message);
    console.log(`[${requestId}] Extracted keywords:`, keywords);

    // ===== STEP 3: Generate embedding for semantic search =====
    let queryEmbedding: number[] | null = null;

    try {
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: message.substring(0, 8000),
        }),
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        queryEmbedding = embeddingData.data?.[0]?.embedding ?? null;
        console.log(`[${requestId}] Embedding generated`);
      } else {
        console.log(`[${requestId}] Embedding API error: ${embeddingResponse.status}`);
      }
    } catch (embError) {
      console.log(`[${requestId}] Embedding generation failed:`, embError);
    }

    // ===== STEP 4: Gather context (high-precision RAG) =====
    // IMPORTANT: On large datasets, adding lots of unfiltered pages introduces noise and degrades answers.
    // Strategy:
    //  - Primary: vector search over university_chunks
    //  - Fallback: keyword search over chunks/pages (only items that match query keywords)
    //  - Never: “grab random latest pages” or “first N chunks”

    const allSources: Array<{
      content: string;
      title: string;
      url: string;
      type: "vector" | "chunk" | "pdf" | "web" | "keyword";
      score: number;
    }> = [];

    function normalizeWhitespace(s: string) {
      return s.replace(/\s+/g, " ").trim();
    }

    function extractRelevantSnippet(fullText: string, kws: string[], maxLen = 2800): string {
      const text = normalizeWhitespace(fullText);
      if (!text) return "";

      const lower = text.toLowerCase();
      const hits = kws
        .map((k) => ({ k, idx: lower.indexOf(k.toLowerCase()) }))
        .filter((h) => h.idx >= 0)
        .sort((a, b) => a.idx - b.idx);

      if (hits.length === 0) {
        // Keep only the start; prevents stuffing entire docs
        return text.slice(0, Math.min(maxLen, text.length));
      }

      const first = hits[0];
      const start = Math.max(0, first.idx - Math.floor(maxLen * 0.35));
      const end = Math.min(text.length, start + maxLen);
      return text.slice(start, end);
    }

    // 4a. Vector search (if embedding available)
    if (queryEmbedding) {
      try {
        const { data: vectorResults } = await supabase.rpc("match_university_chunks", {
          query_embedding: queryEmbedding,
          match_university_id: matchUniversityId,
          match_threshold: 0.18, // Slightly higher than before to reduce noise
          match_count: 40,
        });

        if (vectorResults?.length) {
          console.log(`[${requestId}] Vector search found ${vectorResults.length} chunks`);
          for (const chunk of vectorResults) {
            const raw = chunk.content || "";
            const snippet = extractRelevantSnippet(raw, keywords, 2800);
            allSources.push({
              content: snippet || raw.slice(0, 2800),
              title: chunk.metadata?.title || chunk.title || "Document",
              url: chunk.metadata?.url || chunk.url || "",
              type: "vector",
              // Combine similarity with lexical signal (helps when embeddings are imperfect)
              score: (chunk.similarity || 0) * 100 + scoreContent(raw, keywords),
            });
          }
        }
      } catch (vecError) {
        console.log(`[${requestId}] Vector search error:`, vecError);
      }
    }

    // 4b. Keyword search fallback (chunks)
    // If vector returns weak/empty results (common for very short queries like "make sentence"),
    // use keyword matching to pull only relevant chunks.
    if (keywords.length > 0 && allSources.length < 10) {
      const kwOr = keywords
        .slice(0, 6)
        .map((kw) => `content.ilike.%${kw}%`)
        .join(",");

      const { data: kwChunks } = await supabase
        .from("university_chunks")
        .select("content, metadata")
        .eq("university_id", matchUniversityId)
        .or(kwOr)
        .limit(60);

      if (kwChunks?.length) {
        console.log(`[${requestId}] Keyword chunks found: ${kwChunks.length}`);
        for (const chunk of kwChunks) {
          const raw = chunk.content || "";
          const snippet = extractRelevantSnippet(raw, keywords, 2400);
          const lexical = scoreContent(raw, keywords);
          // Filter out accidental matches when dataset is huge
          if (lexical <= 0) continue;

          allSources.push({
            content: snippet || raw.slice(0, 2400),
            title: chunk.metadata?.title || "Document",
            url: chunk.metadata?.url || "",
            type: "chunk",
            score: lexical,
          });
        }
      }
    }

    // 4c. Keyword search fallback (pages: pdf + web)
    // Only include pages that match keywords. This prevents “latest pages” noise.
    if (keywords.length > 0 && allSources.length < 15) {
      const pageOr = keywords
        .slice(0, 4)
        .map((kw) => `markdown.ilike.%${kw}%,html.ilike.%${kw}%,title.ilike.%${kw}%`)
        .join(",");

      const { data: keywordPages } = await supabase
        .from("university_pages")
        .select("markdown, html, title, url, source_type")
        .eq("university_id", matchUniversityId)
        .or(pageOr)
        .order("crawled_at", { ascending: false })
        .limit(18);

      if (keywordPages?.length) {
        console.log(`[${requestId}] Keyword pages found: ${keywordPages.length}`);
        for (const page of keywordPages) {
          const md = (page.markdown || "").trim();
          const html = (page.html || "").trim();
          const raw = md.length > 30 ? md : html ? stripHtml(html) : md;
          const content = extractRelevantSnippet(raw, keywords, 2600);
          if (content.length < 30) continue;

          const t = page.source_type === "pdf" ? "pdf" : "web";
          const lexical = scoreContent(raw, keywords);

          allSources.push({
            content,
            title: page.title || (t === "pdf" ? "PDF Document" : "Web Page"),
            url: page.url || "",
            type: "keyword",
            // Small boost for PDFs because they often contain authoritative brochures/fee tables
            score: lexical + (t === "pdf" ? 8 : 0),
          });
        }
      }
    }


    // ===== STEP 5: Deduplicate and rank sources =====
    const seen = new Set<string>();
    const uniqueSources = allSources.filter((s) => {
      const key = s.content.substring(0, 200).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by score descending
    uniqueSources.sort((a, b) => b.score - a.score);

    // Take top sources within token budget
    // Keep this relatively small to avoid “lost in the middle” on large corpora.
    const MAX_CONTEXT_CHARS = 30000;
    const topSources: typeof uniqueSources = [];
    let totalChars = 0;

    for (const source of uniqueSources) {
      const sourceLen = source.content.length + source.title.length + 120;
      if (totalChars + sourceLen > MAX_CONTEXT_CHARS) break;
      topSources.push(source);
      totalChars += sourceLen;
    }

    console.log(
      `[${requestId}] Using ${topSources.length} sources (${totalChars} chars) from ${uniqueSources.length} unique sources`,
    );

    // ===== STEP 6: Build context string =====
    let contextData = "";

    if (topSources.length > 0) {
      contextData = "\n\n=== VERIFIED UNIVERSITY DATA ===\n\n";

      topSources.forEach((source, idx) => {
        const typeLabel = source.type.toUpperCase();
        const urlPart = source.url ? ` | URL: ${source.url}` : "";
        contextData += `[SOURCE ${idx + 1}] [${typeLabel}] ${source.title}${urlPart}\n`;
        // Each source is already “snippetized”; keep a final cap anyway.
        contextData += `${source.content.substring(0, 3000)}\n\n---\n\n`;
      });

      contextData += "=== END VERIFIED DATA ===";
    }

    // ===== STEP 7: Build university base info =====
    let universityInfo = `University: ${uniData.university_name}\n`;

    if (uniData.website_url) {
      universityInfo += `Website: ${uniData.website_url}\n`;
    }

    if (uniData.extracted_info) {
      const info = uniData.extracted_info;
      if (info.location) universityInfo += `Location: ${info.location}\n`;
      if (info.type) universityInfo += `Type: ${info.type}\n`;
      if (info.established) universityInfo += `Established: ${info.established}\n`;
      if (info.contact?.email) universityInfo += `Email: ${info.contact.email}\n`;
      if (info.contact?.phone) universityInfo += `Phone: ${info.contact.phone}\n`;
    }

    // ===== STEP 8: Build optimized system prompt =====
    const hasData = topSources.length > 0;

    const systemPrompt = `You are an expert university advisor chatbot for "${uniData.university_name}".

## Your Knowledge Base
${universityInfo}

${hasData ? contextData : "(No documents have been uploaded or crawled for this university yet.)"}

## CRITICAL RULES - MUST FOLLOW

1. **University facts must be grounded in VERIFIED UNIVERSITY DATA above.** Never invent fees, deadlines, program names, locations, contacts, or policies.

2. **If the user asks a general writing/English task** (e.g., "rewrite this", "make a sentence", "improve this paragraph"):
   - You MAY help using general language skills.
   - If the task needs university-specific facts, only use facts present in VERIFIED UNIVERSITY DATA.
   - If the user did not provide the text to rewrite (or the topic is unclear), ask 1 clarifying question.

3. **If the requested university information is NOT in the sources above**, respond honestly:
   "I don't have that specific information in my knowledge base. You may want to check the university's official website or contact their admissions office directly."

4. **For numerical data** (fees, percentages, dates, merit scores):
   - Only quote numbers that appear exactly in the sources
   - If you find the data, cite which source it came from
   - If you don't find it, say so clearly

5. **Be helpful and conversational** - Don't be robotic. Explain things clearly as a knowledgeable advisor would.

6. **Structure your answers well**:
   - Start with a direct answer to the question
   - Add relevant details in bullet points if helpful
   - End with "📚 Sources: [list which sources you used]"

7. **If asked about programs/courses**: List the actual programs mentioned in sources, don't invent program names.

8. **If asked about admissions/requirements**: Only state requirements explicitly mentioned in sources.

## Response Format
- Keep answers focused and relevant
- Use bullet points for lists
- Bold important information like deadlines, fees, requirements
- Always cite your sources at the end`;

    // ===== STEP 9: Build messages for GPT =====
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // ===== STEP 10: Call OpenAI GPT-4o =====
    console.log(`[${requestId}] Calling GPT-4o...`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 15000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] OpenAI error: ${response.status}`, errorText);

      if (response.status === 429) {
        return jsonResponse({
          success: false,
          error: "Too many requests. Please wait a moment and try again.",
        });
      }

      return jsonResponse({
        success: false,
        error: "AI service temporarily unavailable. Please try again.",
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      console.error(`[${requestId}] No response from GPT`);
      return jsonResponse({
        success: false,
        error: "Failed to generate response. Please try again.",
      });
    }

    console.log(
      `[${requestId}] Response generated. Sources: ${topSources.length}, Types: ${[...new Set(topSources.map((s) => s.type))].join(", ")}`,
    );

    return jsonResponse({
      success: true,
      message: assistantMessage,
      universityName: uniData.university_name,
      sourcesUsed: topSources.length,
      sourceTypes: [...new Set(topSources.map((s) => s.type))],
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return jsonResponse({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
});
