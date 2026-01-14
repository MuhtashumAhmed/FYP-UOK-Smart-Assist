import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Use  AI (Google Gemini) for OCR - it can read images/PDFs directly
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName, universityId, universityName } =
      await req.json();

    if (!pdfBase64 || !universityId) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 and universityId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const MY_API_KEY = Deno.env.get(" MY_API_KEY");

    if (!MY_API_KEY) {
      console.error(" MY_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "OCR service not configured (missing  MY_API_KEY)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(
      `[OCR] Processing scanned PDF for ${universityName}: ${fileName}`
    );

    // Use Google Gemini via  AI for OCR
    // Gemini can process PDF images and extract text
    const ocrResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an OCR assistant. Extract ALL text from the provided PDF document image. 
            
Instructions:
- Extract every piece of text you can see, preserving the structure
- Include headings, paragraphs, tables, lists, fees, program names, dates
- Format the output as clean markdown
- If you see tables, try to preserve them as markdown tables
- Do not summarize - extract the actual text verbatim
- If text is unclear, do your best to interpret it`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Please extract all text from this PDF document for ${universityName}. File name: ${fileName}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${pdfBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 16000,
        }),
      }
    );

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error("[OCR]  AI error:", ocrResponse.status, errorText);

      if (ocrResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limited. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (ocrResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "OCR credits exhausted. Please add credits to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ error: "OCR processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ocrData = await ocrResponse.json();
    const extractedText = ocrData.choices?.[0]?.message?.content || "";

    if (!extractedText || extractedText.length < 50) {
      console.log("[OCR] No meaningful text extracted");
      return new Response(
        JSON.stringify({
          success: true,
          text: "",
          message: "No readable text found in the scanned PDF",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[OCR] Successfully extracted ${extractedText.length} characters`
    );

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        charCount: extractedText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OCR] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
