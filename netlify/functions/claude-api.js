// netlify/functions/claude-api.js
// Working Claude API function

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { apiKey, prompt, maxTokens = 1000, action = 'analyze' } = JSON.parse(event.body);

        if (!apiKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'API key required' })
            };
        }

        // Test endpoint
        if (action === 'test') {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 10,
                        messages: [{ 
                            role: 'user', 
                            content: 'Hi' 
                        }]
                    })
                });

                if (response.ok) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ status: 'connected' })
                    };
                } else {
                    const errorData = await response.json();
                    return {
                        statusCode: response.status,
                        headers,
                        body: JSON.stringify({ 
                            status: 'failed', 
                            error: errorData.error?.message || 'Unknown API error'
                        })
                    };
                }
            } catch (error) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        status: 'failed', 
                        error: 'Connection error: ' + error.message 
                    })
                };
            }
        }

        // Analysis endpoint
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: maxTokens,
                    messages: [{ 
                        role: 'user', 
                        content: prompt 
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    statusCode: response.status,
                    headers,
                    body: JSON.stringify({
                        error: data.error?.message || 'API request failed'
                    })
                };
            }

            // Transform response to match expected format
            const transformedData = {
                completion: data.content[0].text
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(transformedData)
            };

        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Analysis error: ' + error.message 
                })
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Function error: ' + error.message 
            })
        };
    }
};