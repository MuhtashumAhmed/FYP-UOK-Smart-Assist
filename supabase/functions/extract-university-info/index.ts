import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { universityId } = await req.json();

    if (!universityId) {
      return new Response(
        JSON.stringify({ success: false, error: 'University ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching crawled pages for university:', universityId);

    // First verify the university exists
    const { data: uniData, error: uniError } = await supabase
      .from('university_crawls')
      .select('university_id, university_name, pages_count')
      .eq('university_id', universityId)
      .single();

    if (uniError || !uniData) {
      console.error('University not found:', universityId, uniError);
      return new Response(
        JSON.stringify({ success: false, error: `University not found: ${universityId}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found university:', uniData.university_name, 'with', uniData.pages_count, 'pages');

    // Fetch ONLY the crawled pages for THIS specific university
    const { data: pages, error: pagesError } = await supabase
      .from('university_pages')
      .select('markdown, title, url')
      .eq('university_id', universityId)
      .order('crawled_at', { ascending: false })
      .limit(30); // Limit to avoid token limits

    console.log('Query result - Pages found:', pages?.length || 0, 'for university_id:', universityId);

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch university pages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No crawled pages found for this university' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine page content (limit to avoid token overflow)
    const combinedContent = pages
      .map(p => `## ${p.title}\nURL: ${p.url}\n\n${p.markdown?.substring(0, 3000) || ''}`)
      .join('\n\n---\n\n')
      .substring(0, 50000); // Max ~50k chars

    console.log('Sending to OpenAI for extraction...');

    // Use OpenAI to extract structured information
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured university information from website content. 
Extract the following information and return it as a JSON object:
- name: Full official university name
- location: City and country/state
- type: "public" or "private"
- fields: Array of academic fields/programs offered (e.g., ["Engineering", "Medicine", "Business", "Computer Science"])
- fees: Object with tuition fees { undergraduate: number, graduate: number, currency: string } - estimate annual fees
- admission_requirements: Object with { min_percentage: number, requirements: string[] }
- ranking: National or international ranking if mentioned (number or null)
- established: Year established (number or null)
- website: Official website URL
- contact: Object with { email: string, phone: string, address: string }
- description: A 2-3 sentence description of the university
- features: Array of notable features (e.g., ["Research University", "Top Engineering School", "International Campus"])
- closing_percentage: Estimated minimum percentage/GPA required for admission (number 0-100)

Be accurate and only include information that is clearly stated or can be reasonably inferred. Use null for unknown values.`
          },
          {
            role: 'user',
            content: `Extract structured information from this university website content:\n\n${combinedContent}`
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const extractedInfo = JSON.parse(aiData.choices[0].message.content);

    console.log('Extracted info:', extractedInfo);

    // Update the university_crawls table with extracted info
    const { error: updateError } = await supabase
      .from('university_crawls')
      .update({
        extracted_info: extractedInfo,
        info_extracted_at: new Date().toISOString()
      })
      .eq('university_id', universityId);

    if (updateError) {
      console.error('Error updating university:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save extracted info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully extracted and saved info for:', universityId);

    return new Response(
      JSON.stringify({
        success: true,
        extractedInfo,
        message: 'University information extracted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
