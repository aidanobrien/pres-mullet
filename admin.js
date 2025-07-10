async function askClaudeForPresentationStructure(responses, context, responseCount) {
    const apiEndpoint = getApiEndpoint();
    const analyzeUrl = apiEndpoint.includes('netlify') ? apiEndpoint : `${apiEndpoint}/claude`;
    
    const prompt = `You are creating a presentation from survey data.

Survey Context: "${context}"

Survey Responses (${responseCount} total):
${responses.slice(0, 30).map((response, index) => `${index + 1}. "${response}"`).join('\n')}

Create a presentation structure. The first slide will be a cover slide using the survey context as the title. The last slide will be a thank you slide. Return ONLY this JSON format:

{
  "surveyType": "${context}",
  "responseCount": ${responseCount},
  "pages": [
    {
      "title": "Survey Overview", 
      "type": "overview",
      "content": [
        {"title": "Total Responses", "value": "${responseCount}", "description": "Survey participants"}
      ]
    },
    {
      "title": "Main Findings",
      "type": "feedback", 
      "content": [
        {"title": "Key Theme 1", "content": "Detailed analysis with examples"},
        {"title": "Key Theme 2", "content": "Another insight with examples"},
        {"title": "Key Theme 3", "content": "Third major theme with examples"}
      ]
    },
    {
      "title": "Thank You",
      "type": "thankyou",
      "content": []
    }
  ]
}

Requirements:
- Use the exact survey context as the surveyType (this becomes the cover slide title)
- Overview should ONLY show response count (no analysis sections count or other metrics)
- Create 3-4 analysis slides with detailed insights (4-6 insights per slide)
- Make content detailed with specific examples of what people actually said
- Include multiple examples in each insight where possible
- End with a thank you page (type: "thankyou")
- Return ONLY the JSON, no other text`;

    try {
        const response = await fetch(analyzeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: localStorage.getItem('claude_api_key'),
                prompt: prompt,
                maxTokens: 3500,
                action: 'analyze'
            })
        });
        
        const data = await response.json();
        const jsonMatch = data.completion.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Could not parse Claude response');
        
    } catch (error) {
        console.error('Claude API error:', error);
        
        // Fallback structure
        return {
            surveyType: context || 'Survey Results',
            responseCount: responseCount,
            pages: [
                {
                    title: "Survey Overview",
                    type: "overview", 
                    content: [
                        {"title": "Total Responses", "value": responseCount.toString(), "description": "Survey participants"}
                    ]
                },
                {
                    title: "Key Feedback",
                    type: "feedback",
                    content: [
                        {"title": "Main Themes", "content": `Analysis of ${responseCount} survey responses: ${responses.slice(0, 3).join('. ')}`}
                    ]
                },
                {
                    title: "Thank You",
                    type: "thankyou",
                    content: []
                }
            ]
        };
    }
}