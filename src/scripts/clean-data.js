const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const dotenv = require('dotenv');
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getLatestExportFromSupabase() {
  const { data, error } = await supabase
    .from('article_exports')
    .select('articles')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw new Error('Failed to fetch latest article export: ' + error.message);

  return data.articles; // this will be an array of article objects
}

async function saveReportToSupabase(reportName, finalInsightsHtml) {
  try {
    const { error } = await supabase
      .from('reports')
      .insert([
        {
          name: reportName,
          html: finalInsightsHtml,
        },
      ]);

    if (error) {
      throw new Error('Failed to store report in Supabase: ' + error.message);
    }

    console.log(`✅ Report "${reportName}" successfully saved to Supabase`);
  } catch (error) {
    console.error('❌ Error saving report:', error.message);
  }
}

// Function to extract report title from HTML content
function extractReportTitle(htmlContent) {
  const h1Match = htmlContent.match(/<h1>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }
  
  // If no specific title found, use a default with date
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  return `Market Insights Report - ${currentDate}`;
}

async function processData() {
  try {
    // Read input data from the export folder
    const articles = await getLatestExportFromSupabase();

    // Step 1: Clean data using gemini-2.0-flash
    const cleaningPrompt = `I have a dataset of 150-200 articles containing titles, content, and sources. The articles cover various topics, but I want to extract only **the most important insights** relevant to the following categories:

1. **Startup News** – New startups, funding rounds, acquisitions, IPOs, and significant product launches.
2. **Emerging Trends** – Growing industries, breakthrough technologies, and evolving business models.
3. **Investment Opportunities** – Undervalued sectors, upcoming IPOs, and industries gaining investor attention.
4. **Market Gaps & Problems to Solve** – Pain points in industries that present opportunities for new businesses or products.
5. **Potential Mistakes & Risks to Avoid** – Failures, regulatory challenges, or strategic errors that entrepreneurs should be aware of.

### **Instructions:**
- Identify key takeaways from each article that match the categories above.
- Summarize findings in a **clear, concise, and structured format**.
- **Remove irrelevant information** (e.g., general news, unrelated politics, non-actionable insights).
- Maintain the **original source** for credibility.
- Additionally, for each article, identify up to 3 trend tags from the following list: ["AI agents", "Web3", "quantum computing", "sustainable tech", "remote work tools", "fintech", "healthtech"] and include them in the output JSON.

### **Output Format Example:**
[
  {
    "title": "Example Title",
    "content": "Summary of insight",
    "source": "Source URL",
    "tags": ["AI agents", "fintech"]
  }
]

here is the dataset in json format:
    ${JSON.stringify(articles)}`;
    
    const cleanResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: cleaningPrompt,
    });
    const cleanedData = cleanResponse.text;

    // Step 2: Extract key insights using gemini-2.5-pro-exp-03-25
    const extractionPrompt = `Context:
You are analyzing a curated and cleaned dataset containing key insights extracted from 150–200 articles across domains like startups, funding, acquisitions, tech innovation, business models, emerging trends, market gaps, and investment news.

Objective:
Generate a structured and strategically actionable HTML report with deep insight density. The report should be written for founders, operators, and VCs who want to make moves in the next 30–90 days.

Instructions:
1. Analyze the data to uncover underlying trends, strategic risks, emerging sectors, and capital-efficient business opportunities.
2. Each bullet point should be a mini-analysis (not a generic summary), limited to 3–4 sentences for conciseness.
3. Frame each insight with:
   - What is happening?
   - Why is this important or new?
   - What's the business or product opportunity?
   - Who can act on this (startup, investor, builder)?
4. Highlight both current trends and white space opportunities.
5. Keep the report scannable, professional, and under 5 minutes to read.

Structure the HTML report into these sections:

SECTOR SCAN – "Key Market Dynamics and Strategic Patterns"
- Focus on macro themes across industries (e.g., rise of AI infra, VC behavior changes, Web3 shifts).
- For each point: zoom out to show the pattern, then zoom in to show the implication.
- Include real-world examples from the dataset if applicable.
- Limit to 3 insights.

SIGNAL DETECTION – "Emerging but Underexploited Trends"
- Highlight nascent trends gaining early traction but not yet saturated.
- Explain why each signal matters and how to capitalize on it before the crowd.
- Look for intersections (e.g., AI x Healthcare, Web3 x Creator Tools, Infra x LatAm).
- Limit to 2 insights.

TACTICAL BRIEF – "Actionable Moves for Builders and Investors"
- Provide specific and timely strategies.
- Tailor bullets for:
  - Founders looking for ideas or pivots
  - Investors scouting high-leverage bets
  - Operators optimizing internal strategy
- Include: what to build, what to fund, what to avoid.
- Limit to 3 insights (one per role).

OPPORTUNITY MATRIX – "Gaps, White Spaces, and Monetizable Problems"
- Identify 2 market gaps or broken systems (to keep concise).
- For each gap, explain:
  - What is missing?
  - What type of startup could fix this?
  - What business model could work?
  - Why is now the right time?
- Optionally suggest founder profiles or target users if relevant.

Final Output Format:
- Use the provided HTML structure and styling exactly as given.
- Each bullet point should be 3–4 sentences.
- Highlight key terms with "<strong>", use bullet lists inside each section, and maintain clean structure.
- Only output raw HTML – no markdown or commentary, no backticks, no code fences, no markdown formatting..
- Replace placeholders with actual insights based on the cleaned dataset.
- Ensure the report is concise, well-structured, and focused on impactful trends and opportunities.
- Do NOT include unnecessary data or filler text.

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yagna's Intern Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-stone-100 text-stone-800 font-serif min-h-screen flex justify-center p-2 sm:p-4 md:p-10">

  <div class="w-full max-w-4xl space-y-6 sm:space-y-8 md:space-y-12">
    <!-- Section: Sector Scan -->
    <section class="bg-stone-50 p-3 sm:p-4 md:p-6 rounded-lg">
      <h2 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Sector Scan: Key Patterns Observed</h2>
      <ul class="pl-5 space-y-2 sm:space-y-3 text-stone-700">
        <li><strong>Pattern Recognition:</strong> Connecting signals across the startup ecosystem that others miss. Stay ahead of market shifts before they happen.</li>
        <li><strong>Funding Intelligence:</strong> We analyze 150+ sources daily to detect emerging investment trends before they make headlines.</li>
        <li><strong>Opportunity Matrix:</strong> We filter the noise and surface the most critical opportunities from a flood of industry news.</li>
      </ul>
    </section>

    <!-- Section: Signal Detection -->
    <section class="bg-stone-50 p-3 sm:p-4 md:p-6 rounded-lg">
      <h2 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Signal Detection: Emerging Trends</h2>
      <ul class="pl-5 space-y-2 sm:space-y-3 text-stone-700">
        <li><strong>Artificial Intelligence:</strong> RAG technologies are transforming enterprise knowledge management, with unexpected applications in financial services.</li>
        <li><strong>Venture Capital:</strong> A notable shift in early-stage funding toward hardware startups, particularly in climate tech and advanced manufacturing.</li>
      </ul>
    </section>

    <!-- Section: Tactical Brief -->
    <section class="bg-stone-50 p-3 sm:p-4 md:p-6 rounded-lg">
      <h2 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Tactical Brief: Actionable Insights</h2>
      <ul class="pl-5 space-y-2 sm:space-y-3 text-stone-700">
        <li><strong>Strategic Positioning:</strong> Companies integrating RAG technologies into their enterprise offerings are seeing 3x customer retention rates.</li>
        <li><strong>Market Positioning:</strong> Repositioning existing AI tools as knowledge management solutions offers immediate revenue opportunities.</li>
        <li><strong>Competitive Edge:</strong> First-mover advantage remains significant in this space, with early entrants commanding premium pricing.</li>
      </ul>
    </section>

    <!-- Section: Opportunity Matrix -->
    <section class="bg-stone-50 p-3 sm:p-4 md:p-6 rounded-lg">
      <h2 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Opportunity Matrix: Opportunities & Gaps</h2>
      <ul class="pl-5 space-y-2 sm:space-y-3 text-stone-700">
        <li><strong>Underserved Markets:</strong> Mid-market enterprises ($50M–$250M revenue) remain underserved by current RAG solution providers, creating a significant opportunity.</li>
        <li><strong>Integration Challenges:</strong> Current solutions require significant technical expertise, opening opportunities for simplified implementation services.</li>
      </ul>
    </section>
  </div>

</body>
</html>



Data:
    ${cleanedData}

Key Requirements:

- Replace placeholders with actual insights based on the cleaned dataset.
- Ensure the final report is concise, well-structured, and contains high-quality insights focused on market gaps, current trends, actionable insights, and money-making opportunities.
- Each bullet point should be 3–4 sentences.
- Do NOT include unnecessary data, filler text, markdown, or commentary—output only raw HTML.`;

    const finalResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro-exp-03-25",
      contents: extractionPrompt,
    });
    
    const finalInsights = finalResponse.text;
    
    // Extract a dynamic report name from the generated HTML
    const reportName = extractReportTitle(finalInsights);
    
    // Save the report with the dynamic name
    await saveReportToSupabase(reportName, finalInsights);

    console.log(`Final insights saved with title: "${reportName}"`);
  } catch (error) {
    console.error("Error processing data:", error);
  }
}

processData();