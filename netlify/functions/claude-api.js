// netlify/functions/claude-api.js
// Netlify Function for Claude API proxy

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
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

        // Test endpoint - use newer Messages API
        if (action === 'test') {
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
                        content: 'Test connection' 
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
                const errorText = await response.text();
                return {
                    statusCode: response.status,
                    headers,
                    body: JSON.stringify({ 
                        status: 'failed', 
                        error: errorText 
                    })
                };
            }
        }

        // Analysis endpoint - use newer Messages API
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
                body: JSON.stringify(data)
            };
        }

        // Transform the response to match expected format
        const transformedData = {
            completion: data.content[0].text
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(transformedData)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Function error: ' + error.message })
        };
    }
};// netlify/functions/claude-api.js
// Netlify Function for Claude API proxy

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
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
            const response = await fetch('https://api.anthropic.com/v1/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-instant-1.2',
                    prompt: '\n\nHuman: Test\n\nAssistant:',
                    max_tokens_to_sample: 5,
                    stop_sequences: ['\n\nHuman:']
                })
            });

            if (response.ok) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ status: 'connected' })
                };
            } else {
                return {
                    statusCode: response.status,
                    headers,
                    body: JSON.stringify({ 
                        status: 'failed', 
                        error: await response.text() 
                    })
                };
            }
        }

        // Analysis endpoint
        const response = await fetch('https://api.anthropic.com/v1/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-instant-1.2',
                prompt: prompt,
                max_tokens_to_sample: maxTokens,
                stop_sequences: ['\n\nHuman:'],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify(data)
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Function error: ' + error.message })
        };
    }
};